
// =====================================
// VELVET SMOKE - FUNCIONES PRINCIPALES
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Velvet Smoke App initialized successfully.");

    // =====================================
    // CATÁLOGO DE DEMOSTRACIÓN
    // =====================================

    const products = [
        {
            id: "1",
            name: "Vape Pod Pro",
            price: 1199
        },
        {
            id: "2",
            name: "Bong Glass Premium",
            price: 2499
        }
    ];

    // =====================================
    // ALMACENAMIENTO LOCAL
    // =====================================

    function loadData(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    }

    let cart = loadData("velvetCart");
    let wishlist = loadData("velvetWishlist");

    // =====================================
    // ELEMENTOS DEL DOM
    // =====================================

    const cartCount = document.getElementById("cartCount");
    const wishlistCount = document.getElementById("wishlistCount");

    const cartToggle = document.getElementById("cartToggle");
    const wishlistToggle = document.getElementById("wishlistToggle");

    const cartPanel = document.getElementById("cartPanel");
    const wishlistPanel = document.getElementById("wishlistPanel");

    const cartItems = document.getElementById("cartItems");
    const wishlistItems = document.getElementById("wishlistItems");
    const cartTotal = document.getElementById("cartTotal");

    // =====================================
    // REGISTRO DE ACTIVIDAD
    // =====================================

    const contactForm = document.getElementById("contactForm");
    const contactSection = document.getElementById("contacto");

    const feedback = document.createElement("p");
    feedback.id = "formFeedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");

    contactForm.appendChild(feedback);

    const activitySection = document.createElement("section");
    activitySection.className = "activity-section";

    activitySection.innerHTML = `
        <div class="section-heading">
            <p class="subtitle">PANEL DE DEMOSTRACIÓN</p>
            <h2>REGISTRO DE ACTIVIDAD</h2>
        </div>

        <div class="table-container">
            <table class="activity-table">
                <thead>
                    <tr>
                        <th>Tipo de consulta</th>
                        <th>Elemento</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody id="activityTable"></tbody>
            </table>
        </div>
    `;

    contactSection.appendChild(activitySection);

    const activityTable = document.getElementById("activityTable");

    function registerActivity(type, element, status) {
        const row = document.createElement("tr");

        [type, element, status].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        activityTable.prepend(row);
    }

    // =====================================
    // GUARDAR INFORMACIÓN
    // =====================================

    function saveData() {
        localStorage.setItem("velvetCart", JSON.stringify(cart));
        localStorage.setItem("velvetWishlist", JSON.stringify(wishlist));
    }

    // =====================================
    // ACTUALIZAR CONTADORES
    // =====================================

    function updateCounters() {
        const totalItems = cart.reduce(
            (total, item) => total + item.quantity,
            0
        );

        cartCount.textContent = totalItems;
        wishlistCount.textContent = wishlist.length;
    }

    // =====================================
    // LISTA DE DESEOS
    // =====================================

    function renderWishlist() {
        wishlistItems.innerHTML = "";

        if (wishlist.length === 0) {
            wishlistItems.innerHTML = `
                <p class="empty-message">
                    Todavía no tienes productos favoritos.
                </p>
            `;
            return;
        }

        const list = document.createElement("div");
        list.className = "shopping-list";

        wishlist.forEach(id => {
            const product = products.find(item => item.id === id);

            if (!product) return;

            const item = document.createElement("div");
            item.className = "shopping-item";

            const information = document.createElement("div");
            const name = document.createElement("h3");
            const price = document.createElement("p");

            name.textContent = product.name;
            price.textContent = `$${product.price.toLocaleString("es-MX")} MXN`;

            information.append(name, price);

            const removeButton = document.createElement("button");
            removeButton.className = "remove-item";
            removeButton.textContent = "Quitar de favoritos";

            removeButton.addEventListener("click", () => {
                wishlist = wishlist.filter(itemId => itemId !== id);

                saveData();
                updateCounters();
                renderWishlist();
                updateFavoriteButtons();

                registerActivity(
                    "Favoritos",
                    product.name,
                    "Eliminado"
                );
            });

            item.append(information, removeButton);
            list.appendChild(item);
        });

        wishlistItems.appendChild(list);
    }

    // =====================================
    // BOTONES DE FAVORITOS
    // =====================================

    function updateFavoriteButtons() {
        document.querySelectorAll(".product-card").forEach(card => {
            const id = card.dataset.productId;
            const button = card.querySelector(".favorite-button");

            if (!button) return;

            const isFavorite = wishlist.includes(id);

            button.classList.toggle("active", isFavorite);
            button.textContent = isFavorite ? "♥" : "♡";
            button.setAttribute("aria-pressed", String(isFavorite));
            button.setAttribute(
                "aria-label",
                isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"
            );
        });
    }

    document.querySelectorAll(".favorite-button").forEach(button => {

        button.addEventListener("click", () => {
            const card = button.closest(".product-card");
            const id = card.dataset.productId;
            const product = products.find(item => item.id === id);

            if (!product) return;

            if (wishlist.includes(id)) {
                wishlist = wishlist.filter(itemId => itemId !== id);

                registerActivity(
                    "Favoritos",
                    product.name,
                    "Eliminado"
                );
            } else {
                wishlist.push(id);

                registerActivity(
                    "Favoritos",
                    product.name,
                    "Agregado"
                );
            }

            saveData();
            updateCounters();
            renderWishlist();
            updateFavoriteButtons();
        });

    });

    // =====================================
    // CONTROL DE CANTIDADES
    // =====================================

    document.querySelectorAll(".product-card").forEach(card => {

        const minusButton = card.querySelector(".quantity-minus");
        const plusButton = card.querySelector(".quantity-plus");
        const quantityValue = card.querySelector(".quantity-value");

        minusButton.addEventListener("click", () => {
            let quantity = Number(quantityValue.textContent);

            if (quantity > 1) {
                quantity--;
                quantityValue.textContent = quantity;
            }
        });

        plusButton.addEventListener("click", () => {
            let quantity = Number(quantityValue.textContent);

            if (quantity < 99) {
                quantity++;
                quantityValue.textContent = quantity;
            }
        });

    });

    // =====================================
    // AGREGAR PRODUCTOS AL CARRITO
    // =====================================

    document.querySelectorAll(".add-cart-button").forEach(button => {

        button.addEventListener("click", () => {
            const card = button.closest(".product-card");
            const id = card.dataset.productId;

            const product = products.find(item => item.id === id);

            if (!product) return;

            const quantity = Number(
                card.querySelector(".quantity-value").textContent
            );

            const existingItem = cart.find(item => item.id === id);

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.push({
                    id: id,
                    quantity: quantity
                });
            }

            saveData();
            updateCounters();
            renderCart();

            registerActivity(
                "Carrito",
                product.name,
                `${quantity} agregado(s)`
            );

            const originalText = "🛒 Agregar al carrito";

            button.textContent = "¡Agregado!";

            setTimeout(() => {
                button.textContent = originalText;
            }, 1500);
        });

    });

    // =====================================
    // MOSTRAR CARRITO
    // =====================================

    function renderCart() {
        cartItems.innerHTML = "";

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <p class="empty-message">
                    Tu carrito está vacío.
                </p>
            `;

            cartTotal.textContent = "Total: $0 MXN";
            return;
        }

        const list = document.createElement("div");
        list.className = "shopping-list";

        let total = 0;

        cart.forEach(item => {
            const product = products.find(
                product => product.id === item.id
            );

            if (!product) return;

            const subtotal = product.price * item.quantity;
            total += subtotal;

            const element = document.createElement("div");
            element.className = "shopping-item";

            const information = document.createElement("div");
            const name = document.createElement("h3");
            const details = document.createElement("p");

            name.textContent = product.name;

            details.textContent =
                `${item.quantity} unidad(es) × $${product.price.toLocaleString("es-MX")} = $${subtotal.toLocaleString("es-MX")} MXN`;

            information.append(name, details);

            const removeButton = document.createElement("button");
            removeButton.className = "remove-item";
            removeButton.textContent = "Eliminar";

            removeButton.addEventListener("click", () => {
                cart = cart.filter(cartItem => cartItem.id !== item.id);

                saveData();
                updateCounters();
                renderCart();

                registerActivity(
                    "Carrito",
                    product.name,
                    "Eliminado"
                );
            });

            element.append(information, removeButton);
            list.appendChild(element);
        });

        cartItems.appendChild(list);

        cartTotal.textContent =
            `Total de demostración: $${total.toLocaleString("es-MX")} MXN`;
    }

    // =====================================
    // ABRIR Y CERRAR PANELES
    // =====================================

    cartToggle.addEventListener("click", () => {
        const shouldOpen = cartPanel.hidden;

        cartPanel.hidden = !shouldOpen;
        wishlistPanel.hidden = true;

        if (shouldOpen) {
            renderCart();
            cartPanel.scrollIntoView({ behavior: "smooth" });
        }
    });

    wishlistToggle.addEventListener("click", () => {
        const shouldOpen = wishlistPanel.hidden;

        wishlistPanel.hidden = !shouldOpen;
        cartPanel.hidden = true;

        if (shouldOpen) {
            renderWishlist();
            wishlistPanel.scrollIntoView({ behavior: "smooth" });
        }
    });

    // =====================================
    // FORMULARIO DE CONTACTO
    // =====================================

    contactForm.addEventListener("submit", event => {

        event.preventDefault();

        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!name || !email || !message) {
            feedback.textContent =
                "Por favor, completa todos los campos.";
            return;
        }

        feedback.textContent =
            "¡Gracias! Tu consulta fue registrada correctamente.";

        registerActivity(
            "Contacto",
            "Nueva consulta",
            "Registrada"
        );

        contactForm.reset();
    });

    // =====================================
    // INICIALIZAR APLICACIÓN
    // =====================================

    updateCounters();
    updateFavoriteButtons();
    renderCart();
    renderWishlist();

});
