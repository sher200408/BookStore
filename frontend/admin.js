const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand();
    document.documentElement.setAttribute("data-bs-theme", tg.colorScheme || "light");
}

const STATUSES = ["yangi", "tasdiqlandi", "yetkazilmoqda", "yetkazildi", "bekor qilindi"];

let categories = [];
let books = [];


function money(n) {
    return Number(n).toLocaleString("ru-RU") + " so'm";
}

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

// body FormData bo'lsa Content-Type ni brauzerning o'zi qo'yadi
async function api(url, method = "GET", body = null) {
    const headers = {};
    headers["X-Init-Data"] = tg ? tg.initData : "";
    headers["X-Debug-User"] = "1001";

    const options = { method: method, headers: headers };
    if (body instanceof FormData) {
        options.body = body;
    } else if (body) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
        let msg = "Xatolik yuz berdi";
        try {
            const err = await res.json();
            if (typeof err.detail === "string") {
                msg = err.detail;
            } else {
                msg = "Ma'lumotlar noto'g'ri kiritilgan";
            }
        } catch (e) {}
        throw new Error(msg);
    }
    return res.json();
}


async function init() {
    try {
        await api("/api/admin/check");
    } catch (e) {
        document.getElementById("content").innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
        return;
    }
    categories = await api("/api/categories");
    goTo("books");
}

function goTo(name) {
    document.querySelectorAll("#admin-tabs .nav-link").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === name);
    });

    if (name === "books") showBooks();
    if (name === "categories") showCategories();
    if (name === "orders") showOrders();
    if (name === "stats") showStats();
}


// ---------- kitoblar ----------

async function showBooks() {
    books = await api("/api/books");

    let options = `<option value="">Kategoriyasiz</option>`;
    categories.forEach(c => {
        options += `<option value="${c.id}">${esc(c.name)}</option>`;
    });

    let html = `
        <div class="card card-body mb-4">
            <h5 id="form-title">Yangi kitob qo'shish</h5>
            <input type="hidden" id="book-id">
            <input id="title" class="form-control mb-2" placeholder="Kitob nomi">
            <input id="author" class="form-control mb-2" placeholder="Muallif">
            <textarea id="description" rows="3" class="form-control mb-2" placeholder="Tavsif"></textarea>
            <div class="row g-2 mb-2">
                <div class="col-6"><input id="price" type="number" class="form-control" placeholder="Narxi (so'm)"></div>
                <div class="col-6"><input id="stock" type="number" class="form-control" placeholder="Soni (dona)"></div>
            </div>
            <select id="category" class="form-select mb-2">${options}</select>
            <label class="form-label small text-muted mb-1">Rasm</label>
            <input id="image" type="file" accept="image/*" class="form-control mb-3">
            <div class="d-flex gap-2">
                <button class="btn btn-success flex-fill" onclick="saveBook()"><i class="bi bi-check-lg"></i> Saqlash</button>
                <button class="btn btn-outline-secondary" onclick="showBooks()">Tozalash</button>
            </div>
        </div>
        <h5>Hamma kitoblar (${books.length})</h5>
        <ul class="list-group">`;

    books.forEach(b => {
        const img = b.image_url
            ? `<img src="${esc(b.image_url)}" class="cart-img rounded">`
            : `<div class="cart-img rounded bg-body-secondary d-flex align-items-center justify-content-center"><i class="bi bi-book"></i></div>`;
        html += `
            <li class="list-group-item d-flex gap-2 align-items-center">
                ${img}
                <div class="flex-grow-1 small">
                    <div class="fw-bold">${esc(b.title)}</div>
                    <div class="text-muted">${esc(b.author)}</div>
                    <div>${money(b.price)} | ${b.stock} dona</div>
                </div>
                <button class="btn btn-outline-primary btn-sm" onclick="editBook(${b.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteBook(${b.id})"><i class="bi bi-trash"></i></button>
            </li>`;
    });
    html += `</ul>`;

    document.getElementById("content").innerHTML = html;
}

function editBook(id) {
    const b = books.find(x => x.id === id);
    document.getElementById("form-title").innerText = "Kitobni tahrirlash";
    document.getElementById("book-id").value = b.id;
    document.getElementById("title").value = b.title;
    document.getElementById("author").value = b.author;
    document.getElementById("description").value = b.description || "";
    document.getElementById("price").value = b.price;
    document.getElementById("stock").value = b.stock;
    document.getElementById("category").value = b.category_id || "";
    window.scrollTo(0, 0);
}

async function saveBook() {
    const id = document.getElementById("book-id").value;
    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();
    const price = document.getElementById("price").value;

    if (!title || !author || price === "") {
        showToast("Nom, muallif va narxni kiriting");
        return;
    }

    const form = new FormData();
    form.append("title", title);
    form.append("author", author);
    form.append("description", document.getElementById("description").value);
    form.append("price", price);
    form.append("stock", document.getElementById("stock").value || 0);

    const cat = document.getElementById("category").value;
    if (cat) {
        form.append("category_id", cat);
    }

    const file = document.getElementById("image").files[0];
    if (file) {
        form.append("image", file);
    }

    try {
        if (id) {
            await api("/api/admin/books/" + id, "PUT", form);
        } else {
            await api("/api/admin/books", "POST", form);
        }
        showToast("Saqlandi");
        showBooks();
    } catch (e) {
        showToast(e.message);
    }
}

async function deleteBook(id) {
    if (!confirm("Kitobni o'chirmoqchimisiz?")) return;
    try {
        await api("/api/admin/books/" + id, "DELETE");
        showBooks();
    } catch (e) {
        showToast(e.message);
    }
}


// ---------- kategoriyalar ----------

async function showCategories() {
    categories = await api("/api/categories");

    let html = `
        <h5>Kategoriyalar</h5>
        <div class="input-group mb-3">
            <input id="cat-name" class="form-control" placeholder="Yangi kategoriya nomi">
            <button class="btn btn-success" onclick="addCategory()">Qo'shish</button>
        </div>
        <ul class="list-group">`;

    categories.forEach(c => {
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${esc(c.name)}
                <button class="btn btn-outline-danger btn-sm" onclick="deleteCategory(${c.id})"><i class="bi bi-trash"></i></button>
            </li>`;
    });
    html += `</ul>`;

    document.getElementById("content").innerHTML = html;
}

async function addCategory() {
    const name = document.getElementById("cat-name").value;
    try {
        await api("/api/admin/categories", "POST", { name: name });
        showCategories();
    } catch (e) {
        showToast(e.message);
    }
}

async function deleteCategory(id) {
    if (!confirm("Kategoriyani o'chirmoqchimisiz?")) return;
    try {
        await api("/api/admin/categories/" + id, "DELETE");
        showCategories();
    } catch (e) {
        showToast(e.message);
    }
}


// ---------- buyurtmalar ----------

async function showOrders() {
    const content = document.getElementById("content");
    try {
        const orders = await api("/api/admin/orders");
        if (orders.length === 0) {
            content.innerHTML = `<h5>Buyurtmalar</h5><p class="text-muted">Buyurtmalar yo'q</p>`;
            return;
        }

        let html = `<h5>Buyurtmalar (${orders.length})</h5>`;
        orders.forEach(o => {
            const date = new Date(o.created_at + "Z").toLocaleString("ru-RU");

            let items = "";
            o.items.forEach(i => {
                items += `<div class="small">${esc(i.title)} x ${i.quantity}</div>`;
            });

            let options = "";
            STATUSES.forEach(s => {
                options += `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`;
            });

            html += `
                <div class="card mb-2 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <b>#${o.id}</b><span class="text-muted small">${date}</span>
                        </div>
                        <div class="small mt-1">
                            <i class="bi bi-person"></i> ${esc(o.user_name)} ${o.username ? "(@" + esc(o.username) + ")" : ""}<br>
                            <i class="bi bi-telephone"></i> ${esc(o.phone)}<br>
                            <i class="bi bi-geo-alt"></i> ${esc(o.address)}
                        </div>
                        <hr class="my-2">
                        ${items}
                        <div class="fw-bold my-2">Jami: ${money(o.total)}</div>
                        <select class="form-select form-select-sm" onchange="changeStatus(${o.id}, this.value)">${options}</select>
                    </div>
                </div>`;
        });
        content.innerHTML = html;
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
    }
}

async function changeStatus(id, status) {
    try {
        await api("/api/admin/orders/" + id + "/status", "PUT", { status: status });
        showToast("Status o'zgardi");
    } catch (e) {
        showToast(e.message);
    }
}


// ---------- statistika ----------

async function showStats() {
    const s = await api("/api/admin/stats");
    document.getElementById("content").innerHTML = `
        <h5>Statistika</h5>
        <div class="row g-2">
            <div class="col-6"><div class="card card-body text-center"><i class="bi bi-book fs-3"></i><div class="fs-4 fw-bold">${s.books}</div><small>Kitoblar</small></div></div>
            <div class="col-6"><div class="card card-body text-center"><i class="bi bi-people fs-3"></i><div class="fs-4 fw-bold">${s.users}</div><small>Foydalanuvchilar</small></div></div>
            <div class="col-6"><div class="card card-body text-center"><i class="bi bi-box-seam fs-3"></i><div class="fs-4 fw-bold">${s.orders}</div><small>Buyurtmalar</small></div></div>
            <div class="col-6"><div class="card card-body text-center"><i class="bi bi-bell fs-3"></i><div class="fs-4 fw-bold">${s.new_orders}</div><small>Yangi buyurtmalar</small></div></div>
            <div class="col-12"><div class="card card-body text-center"><i class="bi bi-cash-coin fs-3"></i><div class="fs-4 fw-bold text-success">${money(s.revenue)}</div><small>Tushum</small></div></div>
        </div>`;
}

init();
