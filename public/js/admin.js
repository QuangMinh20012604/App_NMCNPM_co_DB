console.log("admin.js loaded");

// ============================================
// Helper utilities: lấy token và kiểm tra quyền admin
// ============================================

// Trả về JWT token lưu trong localStorage
function getToken() {
    return localStorage.getItem("token") || "";
}

// Kiểm tra người dùng hiện tại có phải admin hoặc superadmin không
function isAdmin() {
    const profile = JSON.parse(localStorage.getItem("profile") || "{}");
    return profile.role === "admin" || profile.role === "superadmin";
}

// Ngăn truy cập nếu không có quyền admin
function ensureAdminAccess() {
    if (!isAdmin()) {
        alert("Bạn không có quyền truy cập Admin Panel!");
        window.location.replace("index.html");
    }
}
ensureAdminAccess();

// Tải thông tin profile từ localStorage để hiển thị trên sidebar
const profile = JSON.parse(localStorage.getItem("profile") || "{}");
document.getElementById("sbProfileName").textContent = profile.name || "Unknown";
document.getElementById("sbProfileEmail").textContent = profile.email || "No email";


// ============================================
// LOAD ALL USERS – tải danh sách người dùng
// ============================================
async function loadUsers() {
    const token = getToken();
    const container = document.getElementById("adminContent");

    // Kích hoạt chế độ scroll riêng cho danh sách user
    container.classList.add("users-scroll-mode");
    container.classList.remove("all-conv-mode");

    container.innerHTML = "<p>Loading users...</p>";

    const res = await fetch("/admin/users", {
        headers: { "Authorization": "Bearer " + token }
    });

    const users = await res.json();
    container.innerHTML = "";

    // Cập nhật thống kê số lượng conversation
    document.getElementById("statConvs").innerHTML =
        `<i class="bi bi-chat-dots"></i> Conversations: ${data.list.length}`;

    // Hiển thị số lượng người dùng
    document.getElementById("statUsers").innerHTML =
        `<i class="bi bi-people"></i> Users: ${users.length}`;

    // Sắp xếp theo vai trò: superadmin → admin → user
    const roleOrder = { superadmin: 1, admin: 2, user: 3 };

    users.sort((a, b) => {
        return roleOrder[a.role] - roleOrder[b.role];
    });

    // Render từng user
    users.forEach(user => {
        const div = document.createElement("div");
        div.className = "admin-user-row";
        div.style = `
            padding:12px;
            border-radius:8px;
            background:#fff;
            margin-bottom:10px;
            box-shadow:0 2px 6px rgba(0,0,0,0.1);
            border:1px solid #eee;
        `;

        const currentRole = profile.role; // role của người đang đăng nhập
        const targetRole = user.role;     // role của user được hiển thị
        const isSelf = profile.id === user._id; // không cho phép tự thao tác

        // =========================
        // Xác định quyền thay đổi role
        // =========================
        let canChangeRole = true;

        // Admin không được đổi role người khác
        if (currentRole === "admin") {
            canChangeRole = false;
        }

        // Superadmin không được đổi role của superadmin khác hoặc chính mình
        if (currentRole === "superadmin") {
            if (targetRole === "superadmin") canChangeRole = false;
            if (isSelf) canChangeRole = false;
        }

        const roleButton = `
            <button class="btn-role"
                ${canChangeRole
                ? `onclick="toggleRole('${user._id}', '${user.role}')"`
                : `disabled style='opacity:0.4; cursor:not-allowed;'`}
            >
                Set: ${user.role === "admin" ? "User" : "Admin"}
            </button>
        `;

        // =========================
        // Xác định quyền xóa user
        // =========================
        let canDelete = true;

        // Admin chỉ được xóa user thường
        if (currentRole === "admin") {
            if (targetRole !== "user") canDelete = false;
        }

        // Superadmin không được xóa superadmin khác hoặc chính mình
        if (currentRole === "superadmin") {
            if (targetRole === "superadmin" || isSelf) canDelete = false;
        }

        const deleteButton = `
            <button class="btn-delete"
                ${canDelete
                ? `onclick="deleteUser('${user._id}')"`
                : `disabled style='opacity:0.4; cursor:not-allowed;'`}
            >
                Delete
            </button>
        `;

        // =========================
        // Render nội dung user row
        // =========================
        div.innerHTML = `
            <div class="user-row-top">
                ${renderRoleBadge(user.role)} - <b>${user.email}</b>
            </div>

            <div class="user-actions">
                <button class="btn-view" onclick="loadUserConversations('${user._id}')">Conversations</button>
                
                ${roleButton}
                ${deleteButton}
            </div>

            <div id="conv_${user._id}"></div>
        `;

        container.appendChild(div);
    });
}

// Lấy element nút tab
const usersBtn = document.getElementById("loadUsersBtn");
const convBtn = document.getElementById("loadAllConversationsBtn");

// Set tab active khi chọn Users hoặc Conversations
function setActiveTab(tab) {
    usersBtn.classList.remove("admin-tab-active");
    convBtn.classList.remove("admin-tab-active");

    if (tab === "users") usersBtn.classList.add("admin-tab-active");
    if (tab === "conversations") convBtn.classList.add("admin-tab-active");
}

// ============================================
// CHANGE USER ROLE – thay đổi quyền user
// ============================================
async function toggleRole(userId, currentRole) {
    // Xác định role mới cần đặt
    const newRole = currentRole === "admin" ? "user" : "admin";

    if (!confirm(`Đổi role thành ${newRole}?`)) return;

    // Gửi yêu cầu cập nhật role lên server
    await fetch(`/admin/user/${userId}/role`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getToken()
        },
        body: JSON.stringify({ role: newRole })
    });

    alert("Role updated!");

    // Cập nhật lại profile người dùng hiện tại nếu có thay đổi
    const token = localStorage.getItem("token");
    const resMe = await fetch("/me", {
        headers: { "Authorization": "Bearer " + token }
    });
    const dataMe = await resMe.json();

    if (dataMe.success) {
        localStorage.setItem("profile", JSON.stringify(dataMe.user));
    }

    // Reload lại danh sách người dùng sau khi thay đổi role
    loadUsers();
}



// ============================================
// DELETE USER – xóa một người dùng
// ============================================
async function deleteUser(userId) {
    if (!confirm("Xóa người dùng này?")) return;

    const res = await fetch(`/admin/user/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + getToken() }
    });

    const data = await res.json();

    if (!data.success) {
        alert("Không thể xóa: " + (data.error || "Lỗi không xác định"));
        return;
    }

    alert("Đã xóa user!");
    loadUsers();
}



// ============================================
// LOAD USER'S CONVERSATIONS – tải hội thoại của user
// ============================================
async function loadUserConversations(userId) {
    const container = document.getElementById(`conv_${userId}`);

    // Kiểu hiển thị cuộn riêng cho danh sách cuộc hội thoại
    container.classList.add("user-conv-list");

    container.innerHTML = "<i>Loading conversations...</i>";

    // Lấy danh sách conversation của user
    const res = await fetch(`/admin/user/${userId}/conversations`, {
        headers: { "Authorization": "Bearer " + getToken() }
    });

    const data = await res.json();
    container.innerHTML = "";

    // Cập nhật thống kê số lượng conversation
    document.getElementById("statConvs").innerHTML =
        `<i class="bi bi-chat-dots"></i> Conversations: ${data.list.length}`;

    // Sắp xếp theo title A → Z
    data.list.sort((a, b) => a.title.localeCompare(b.title));

    if (!data.list.length) {
        container.innerHTML = "<i>No conversations found</i>";
        return;
    }

    // Render từng conversation
    data.list.forEach(conv => {
        const div = document.createElement("div");
        div.className = "conv-item";

        div.innerHTML = `
        <div class="conv-title">
            <strong>${conv.title}</strong> — ${conv.messages.length} messages
        </div>

        <div class="conv-actions">
            <button class="btn-view" onclick="openConversation('${conv._id}')">View</button>
            <button class="btn-delete" onclick="deleteConversation('${conv._id}', '${userId}')">Delete</button>
        </div>
    `;

        container.appendChild(div);
    });
}



// ============================================
// VIEW CONVERSATION – mở popup xem chi tiết hội thoại
// ============================================
async function openConversation(convId) {
    const token = localStorage.getItem("token") || "";

    // Lấy dữ liệu hội thoại theo ID
    const res = await fetch(`/conversation/${convId}`, {
        headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();

    // Tiêu đề popup + số lượng tin nhắn
    document.getElementById("adminConvTitle").innerText =
        `${data.title} — (${data.messages.length} messages)`;

    const container = document.getElementById("adminConvMessages");
    container.innerHTML = "";

    // Render từng message trong hội thoại
    data.messages.forEach(msg => {
        const label = document.createElement("div");
        label.className = msg.role === "user" ? "msg-user-label" : "msg-bot-label";
        label.textContent = msg.role === "user" ? "USER" : "AI";

        const bubble = document.createElement("div");
        bubble.className =
            msg.role === "user" ? "admin-bubble user" : "admin-bubble bot";

        // Hỗ trợ xuống dòng
        bubble.innerHTML = msg.text.replace(/\n/g, "<br>");

        container.appendChild(label);
        container.appendChild(bubble);
    });

    // Hiển thị popup
    document.getElementById("adminConvModal").style.display = "flex";
}



// ============================================
// Render badge hiển thị vai trò User / Admin / Superadmin
// ============================================
function renderRoleBadge(role) {
    if (role === "superadmin") {
        return `<span class="role-badge role-superadmin"><i class="bi bi-star-fill"></i> SUPERADMIN</span>`;
    }
    if (role === "admin") {
        return `<span class="role-badge role-admin"><i class="bi bi-shield-lock"></i> ADMIN</span>`;
    }
    return `<span class="role-badge role-user"><i class="bi bi-person"></i> USER</span>`;
}

// ============================================
// DELETE CONVERSATION – xóa một hội thoại
// ============================================
async function deleteConversation(convId, userId) {
    if (!confirm("Xóa cuộc hội thoại này?")) return;

    await fetch(`/admin/conversation/${convId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + getToken() }
    });

    alert("Đã xóa conversation");

    if (userId) {
        // Nếu đang xem dưới user cụ thể → reload lại hội thoại của user đó
        loadUserConversations(userId);
    } else {
        // Nếu đang ở tab All Conversations → reload toàn bộ danh sách
        loadAllConversations();
    }
}


// ============================================
// MODAL CLOSE EVENTS – đóng popup hội thoại chi tiết
// ============================================

// Nút "OK" và nút X đều đóng popup
document.getElementById("adminConvOkBtn").onclick =
    document.getElementById("adminConvClose").onclick =
    () => {
        document.getElementById("adminConvModal").style.display = "none";
    };


// ============================================
// LOAD ALL CONVERSATIONS – tải toàn bộ hội thoại của hệ thống
// (Dành cho Admin hoặc Superadmin)
// ============================================
async function loadAllConversations() {
    const token = getToken();
    const container = document.getElementById("adminContent");

    // Bật chế độ hiển thị dành cho danh sách toàn hệ thống
    container.classList.add("all-conv-mode");

    container.innerHTML = "<p>Loading all conversations...</p>";

    // Lấy toàn bộ conversations
    const res = await fetch("/admin/conversations", {
        headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();
    container.innerHTML = "";

    // Cập nhật thống kê số lượng users
    document.getElementById("statUsers").innerHTML =
        `<i class="bi bi-people"></i> Users: ${users.length}`;

    // Cập nhật thống kê số lượng conversation
    document.getElementById("statConvs").innerHTML =
        `<i class="bi bi-chat-dots"></i> Conversations: ${data.list.length}`;

    // Sắp xếp A → Z theo title
    data.list.sort((a, b) => a.title.localeCompare(b.title));

    if (!data.list.length) {
        container.innerHTML = "<i>No conversations found</i>";
        return;
    }

    // Render từng conversation
    data.list.forEach(conv => {
        const div = document.createElement("div");
        div.className = "conv-item";

        div.innerHTML = `
            <div class="conv-title">
                <strong>${conv.title}</strong> — ${conv.messages.length} messages
                <br>
                <small>User: ${conv.user.email}</small>
            </div>

            <div class="conv-actions">
                <button class="btn-view" onclick="openConversation('${conv._id}')">View</button>
                <button class="btn-delete" onclick="deleteConversation('${conv._id}', null)">Delete</button>
            </div>
        `;

        container.appendChild(div);
    });
}


// ============================================
// Sidebar Role Badge (hiển thị tại menu bên phải)
// ============================================
const roleBox = document.getElementById("sbProfileRole");
if (roleBox && profile.role) {
    roleBox.innerHTML = renderRoleBadge(profile.role);
}


// ============================================
// LOGOUT trong sidebar admin
// ============================================
const adminLogoutBtn = document.getElementById("logoutBtnSidebar");
if (adminLogoutBtn) {
    adminLogoutBtn.onclick = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("profile");
        alert("Đã đăng xuất!");
        window.location.replace("index.html");
    };
}


// ============================================
// TAB BUTTON EVENTS – chuyển giữa Users / Conversations
// ============================================
document.getElementById("loadUsersBtn").onclick = () => {
    setActiveTab("users");
    loadUsers();
};

document.getElementById("loadAllConversationsBtn").onclick = () => {
    setActiveTab("conversations");
    loadAllConversations();
};


// ============================================
// TỰ ĐỘNG LOAD USERS KHI TRUY CẬP ADMIN PANEL
// ============================================
loadUsers();

