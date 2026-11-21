const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand();
    // telegram qorong'i rejimda bo'lsa bootstrap ham qorong'i bo'ladi
    document.documentElement.setAttribute("data-bs-theme", tg.colorScheme || "light");
}

let books = [];
let categories = [];
let favIds = [];
let cart = { items: [], total: 0 };
let tab = "katalog";
let searchText = "";
let selectedCategory = "";

const STATUS_COLORS = {
    "yangi": "warning",
    "tasdiqlandi": "primary",
    "yetkazilmoqda": "info",
    "yetkazildi": "success",
    "bekor qilindi": "danger"
};


// ---------- yordamchi funksiyalar ----------

function money(n) {
    return Number(n).toLocaleString("ru-RU") + " so'm";
}

// xavfsizlik uchun: matndagi < > belgilarini almashtiradi
function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function showToast(text) {
    document.getElementById("toast-text").innerText = text;
    const toast = bootstrap.Toast.getOrCreateInstance(document.getElementById("toast"), { delay: 2000 });
    toast.show();
}

function emptyMessage(icon, text) {
    return `
        <div class="text-center text-muted mt-5">
            <i class="bi ${icon} display-3"></i>
            <p class="mt-2">${text}</p>
        </div>`;
}

async function api(url, method = "GET", body = null) {
    const headers = { "Content-Type": "application/json" };
    headers["X-Init-Data"] = tg ? tg.initData : "";
    headers["X-Debug-User"] = "1001"; // faqat DEBUG_MODE yoniq bo'lsa ishlaydi

    const options = { method: method, headers: headers };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
        let msg = "Xatolik yuz berdi";
        try {
            const err = await res.json();
            if (typeof err.detail === "string") {
                msg = err.detail;
            }
        } catch (e) {}
        throw new Error(msg);
    }
    return res.json();
}


// ---------- ma'lumotlarni yuklash ----------

async function loadBooks() {
    books = await api("/api/books");
}

async function loadFavorites() {
    const favs = await api("/api/favorites");
    favIds = favs.map(b => b.id);
}

async function loadCart() {
    cart = await api("/api/cart");
    const badge = document.getElementById("cart-badge");
    let count = 0;
    cart.items.forEach(i => count += i.quantity);
    badge.innerText = count;
    badge.classList.toggle("d-none", count === 0);
}

async function init() {
    try {
        categories = await api("/api/categories");
        await loadBooks();
        await loadFavorites();
        await loadCart();
    } catch (e) {
        document.getElementById("content").innerHTML =
            `<div class="alert alert-danger">${esc(e.message)}</div>`;
        return;
    }
    goTo("katalog");
}


// ---------- sahifalar ----------

function goTo(name) {
    tab = name;
    document.querySelectorAll(".tab").forEach(t => {
        const active = t.dataset.tab === name;
        t.classList.toggle("text-success", active);
        t.classList.toggle("fw-bold", active);
        t.classList.toggle("text-secondary", !active);
    });

    if (name === "katalog") showCatalog();
    if (name === "sevimlilar") showFavorites();
    if (name === "savatcha") showCart();
    if (name === "buyurtmalar") showOrders();
}

function bookCard(b) {
    const isFav = favIds.includes(b.id);

    let img = `
        <div class="bg-body-secondary d-flex align-items-center justify-content-center book-img" onclick="openBook(${b.id})">
            <i class="bi bi-book fs-1 text-secondary"></i>
        </div>`;
    if (b.image_url) {
        img = `<img src="${esc(b.image_url)}" class="card-img-top book-img" onclick="openBook(${b.id})">`;
    }

    let button = `<button class="btn btn-success btn-sm w-100" onclick="addToCart(${b.id})">
                    <i class="bi bi-cart-plus"></i> Savatchaga
                  </button>`;
    if (b.stock <= 0) {
        button = `<button class="btn btn-secondary btn-sm w-100" disabled>Tugagan</button>`;
    }

    return `
        <div class="col-6">
            <div class="card h-100 shadow-sm">
                <div class="position-relative">
                    ${img}
                    <button class="btn btn-light btn-sm rounded-circle position-absolute top-0 end-0 m-2" onclick="toggleFav(${b.id})">
                        <i class="bi ${isFav ? "bi-heart-fill text-danger" : "bi-heart"}"></i>
                    </button>
                </div>
                <div class="card-body p-2 d-flex flex-column">
                    <div class="fw-bold small book-title">${esc(b.title)}</div>
                    <div class="text-muted small">${esc(b.author)}</div>
                    <div class="text-success fw-bold my-1">${money(b.price)}</div>
                    <div class="mt-auto">${button}</div>
                </div>
            </div>
        </div>`;
}

// katalog
function showCatalog() {
    let options = `<option value="">Hamma kategoriya</option>`;
    categories.forEach(c => {
        options += `<option value="${c.id}" ${String(c.id) === selectedCategory ? "selected" : ""}>${esc(c.name)}</option>`;
    });

    document.getElementById("content").innerHTML = `
        <div class="input-group mb-2">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input class="form-control" placeholder="Kitob yoki muallif..." value="${esc(searchText)}" oninput="onSearch(this.value)">
        </div>
        <select class="form-select mb-3" onchange="onCategory(this.value)">${options}</select>
        <div id="grid" class="row g-2"></div>`;
    fillGrid();
}

function onSearch(value) {
    searchText = value;
    fillGrid();
}

function onCategory(value) {
    selectedCategory = value;
    fillGrid();
}

function fillGrid() {
    const text = searchText.toLowerCase();
    const filtered = books.filter(b => {
        const okText = b.title.toLowerCase().includes(text) || b.author.toLowerCase().includes(text);
        const okCat = selectedCategory === "" || String(b.category_id) === selectedCategory;
        return okText && okCat;
    });

    const grid = document.getElementById("grid");
    if (filtered.length === 0) {
        grid.innerHTML = emptyMessage("bi-emoji-frown", "Kitob topilmadi");
        return;
    }
    grid.innerHTML = filtered.map(bookCard).join("");
}

// kitob haqida batafsil
function openBook(id) {
    const b = books.find(x => x.id === id);
    if (!b) return;

    const img = b.image_url ? `<img src="${esc(b.image_url)}" class="img-fluid rounded mb-3 w-100" style="max-height:300px; object-fit:contain">` : "";
    const cat = b.category ? b.category.name : "-";

    document.getElementById("modal-content").innerHTML = `
        <div class="modal-header">
            <h5 class="modal-title">${esc(b.title)}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            ${img}
            <p class="mb-1">Muallif: <b>${esc(b.author)}</b></p>
            <p class="mb-1">Kategoriya: <span class="badge bg-secondary">${esc(cat)}</span></p>
            <p class="mb-2">Omborda: ${b.stock} dona</p>
            <p>${esc(b.description) || "Tavsif yo'q"}</p>
            <h4 class="text-success">${money(b.price)}</h4>
        </div>
        <div class="modal-footer">
            <button class="btn btn-success w-100" data-bs-dismiss="modal" onclick="addToCart(${b.id})" ${b.stock <= 0 ? "disabled" : ""}>
                <i class="bi bi-cart-plus"></i> Savatchaga qo'shish
            </button>
        </div>`;
    bootstrap.Modal.getOrCreateInstance(document.getElementById("bookModal")).show();
}

// sevimlilar
async function showFavorites() {
    const content = document.getElementById("content");
    try {
        const favs = await api("/api/favorites");
        favIds = favs.map(b => b.id);

        if (favs.length === 0) {
            content.innerHTML = `<h5>Sevimlilar</h5>` + emptyMessage("bi-heart", "Hozircha sevimli kitoblar yo'q");
            return;
        }
        content.innerHTML = `<h5 class="mb-3">Sevimlilar</h5><div class="row g-2">${favs.map(bookCard).join("")}</div>`;
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
    }
}

async function toggleFav(id) {
    try {
        const res = await api("/api/favorites/" + id, "POST");
        if (res.is_favorite) {
            favIds.push(id);
        } else {
            favIds = favIds.filter(x => x !== id);
        }
        // sahifani yangilaymiz
        if (tab === "sevimlilar") {
            showFavorites();
        } else {
            fillGrid();
        }
    } catch (e) {
        showToast(e.message);
    }
}

// savatcha
async function addToCart(id) {
    try {
        await api("/api/cart", "POST", { book_id: id, quantity: 1 });
        await loadCart();
        showToast("Savatchaga qo'shildi");
    } catch (e) {
        showToast(e.message);
    }
}

async function changeQty(bookId, newQty) {
    try {
        if (newQty <= 0) {
            await api("/api/cart/" + bookId, "DELETE");
        } else {
            await api("/api/cart/" + bookId, "PUT", { quantity: newQty });
        }
        await loadCart();
        showCart();
    } catch (e) {
        showToast(e.message);
    }
}

function showCart() {
    const content = document.getElementById("content");

    if (cart.items.length === 0) {
        content.innerHTML = `<h5>Savatcha</h5>` + emptyMessage("bi-cart-x", "Savatchangiz bo'sh");
        return;
    }

    let html = `<h5 class="mb-3">Savatcha</h5><ul class="list-group mb-3">`;
    cart.items.forEach(item => {
        const b = item.book;
        const img = b.image_url
            ? `<img src="${esc(b.image_url)}" class="cart-img rounded">`
            : `<div class="cart-img rounded bg-body-secondary d-flex align-items-center justify-content-center"><i class="bi bi-book"></i></div>`;
        html += `
            <li class="list-group-item d-flex gap-3 align-items-center">
                ${img}
                <div class="flex-grow-1">
                    <div class="fw-bold small">${esc(b.title)}</div>
                    <div class="text-success small">${money(b.price)}</div>
                    <div class="btn-group btn-group-sm mt-1">
                        <button class="btn btn-outline-secondary" onclick="changeQty(${b.id}, ${item.quantity - 1})">-</button>
                        <span class="btn btn-outline-secondary disabled">${item.quantity}</span>
                        <button class="btn btn-outline-secondary" onclick="changeQty(${b.id}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <button class="btn btn-outline-danger btn-sm" onclick="changeQty(${b.id}, 0)"><i class="bi bi-trash"></i></button>
            </li>`;
    });
    html += `</ul>`;

    html += `
        <div class="d-flex justify-content-between fs-5 fw-bold mb-3">
            <span>Jami:</span><span class="text-success">${money(cart.total)}</span>
        </div>
        <div class="card card-body">
            <h6>Buyurtma ma'lumotlari</h6>
            <input id="phone" type="tel" class="form-control mb-2" placeholder="Telefon raqam (+998...)">
            <textarea id="address" rows="2" class="form-control mb-2" placeholder="Yetkazib berish manzili"></textarea>
            <button class="btn btn-success w-100" onclick="makeOrder()">Buyurtma berish</button>
        </div>`;
    content.innerHTML = html;
}

async function makeOrder() {
    const phone = document.getElementById("phone").value;
    const address = document.getElementById("address").value;

    try {
        await api("/api/orders", "POST", { phone: phone, address: address });
        await loadBooks(); // ombordagi soni o'zgardi
        await loadCart();
        showToast("Buyurtma qabul qilindi!");
        goTo("buyurtmalar");
    } catch (e) {
        showToast(e.message);
    }
}

// buyurtmalar
async function showOrders() {
    const content = document.getElementById("content");
    try {
        const orders = await api("/api/orders");
        if (orders.length === 0) {
            content.innerHTML = `<h5>Buyurtmalar</h5>` + emptyMessage("bi-box-seam", "Hali buyurtma bermagansiz");
            return;
        }

        let html = `<h5 class="mb-3">Buyurtmalarim</h5>`;
        orders.forEach(o => {
            const date = new Date(o.created_at + "Z").toLocaleString("ru-RU");
            const color = STATUS_COLORS[o.status] || "secondary";

            let items = "";
            o.items.forEach(i => {
                items += `<div class="small">${esc(i.title)} x ${i.quantity}</div>`;
            });

            html += `
                <div class="card mb-2 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <b>Buyurtma #${o.id}</b>
                            <span class="badge text-bg-${color}">${esc(o.status)}</span>
                        </div>
                        <div class="text-muted small mb-2">${date}</div>
                        ${items}
                        <div class="fw-bold mt-2">Jami: ${money(o.total)}</div>
                    </div>
                </div>`;
        });
        content.innerHTML = html;
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
    }
}

init();
