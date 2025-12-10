console.log("admin.js loaded");

// ===============================
// HELPERS
// ===============================
function getToken() {
    return localStorage.getItem("token") || "";
}

function isAdmin() {
    const profile = JSON.parse(localStorage.getItem("profile") || "{}");
    return profile.role === "admin" || profile.role === "superadmin";
}


function ensureAdminAccess() {
    if (!isAdmin()) {
        alert("Bạn không có quyền truy cập Admin Panel!");
        window.location.replace("index.html");
    }
}
ensureAdminAccess();

const profile = JSON.parse(localStorage.getItem("profile") || "{}");

document.getElementById("sbProfileName").textContent = profile.name || "Unknown";
document.getElementById("sbProfileEmail").textContent = profile.email || "No email";


// ===============================
// LOAD ALL USERS
// ===============================
async function loadUsers() {
    const token = getToken();
    const container = document.getElementById("adminContent");
    container.classList.add("users-scroll-mode");
    container.classList.remove("all-conv-mode");


    container.innerHTML = "<p>Loading users...</p>";

    container.classList.remove("all-conv-mode");

    const res = await fetch("/admin/users", {
        headers: { "Authorization": "Bearer " + token }
    });

    const users = await res.json();
    container.innerHTML = "";

    // ⭐ SẮP XẾP THEO THỨ TỰ: superadmin → admin → user
    const roleOrder = { superadmin: 1, admin: 2, user: 3 };

    users.sort((a, b) => {
        return roleOrder[a.role] - roleOrder[b.role];
    });

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

        // Role của người đang đăng nhập
        const currentRole = profile.role;
        const targetRole = user.role;
        const isSelf = profile.id === user._id;

        // =========================
        // ROLE CHANGE PERMISSION
        // =========================
        let canChangeRole = true;

        if (currentRole === "admin") {
            canChangeRole = false;  // admin không được set role
        }

        if (currentRole === "superadmin") {
            // không đổi role superadmin
            if (targetRole === "superadmin") canChangeRole = false;

            // không tự đổi role chính mình
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
        // DELETE PERMISSION
        // =========================
        let canDelete = true;

        if (currentRole === "admin") {
            if (targetRole !== "user") canDelete = false;
        }

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
        // RENDER HTML
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

const usersBtn = document.getElementById("loadUsersBtn");
const convBtn = document.getElementById("loadAllConversationsBtn");

function setActiveTab(tab) {
    usersBtn.classList.remove("admin-tab-active");
    convBtn.classList.remove("admin-tab-active");

    if (tab === "users") usersBtn.classList.add("admin-tab-active");
    if (tab === "conversations") convBtn.classList.add("admin-tab-active");
}


// ===============================
// CHANGE USER ROLE
// ===============================
async function toggleRole(userId, currentRole) {
    const newRole = currentRole === "admin" ? "user" : "admin";

    if (!confirm(`Đổi role thành ${newRole}?`)) return;

    await fetch(`/admin/user/${userId}/role`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getToken()
        },
        body: JSON.stringify({ role: newRole })
    });

    alert("Role updated!");

    // cập nhật role của user hiện tại
    const token = localStorage.getItem("token");
    const resMe = await fetch("/me", {
        headers: { "Authorization": "Bearer " + token }
    });
    const dataMe = await resMe.json();

    if (dataMe.success) {
        localStorage.setItem("profile", JSON.stringify(dataMe.user));
    }

    loadUsers();

}



// ===============================
// DELETE USER
// ===============================
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


// ===============================
// LOAD USER'S CONVERSATIONS
// ===============================
async function loadUserConversations(userId) {
    const container = document.getElementById(`conv_${userId}`);
    container.classList.add("user-conv-list");

    container.innerHTML = "<i>Loading conversations...</i>";

    const res = await fetch(`/admin/user/${userId}/conversations`, {
        headers: { "Authorization": "Bearer " + getToken() }
    });

    const data = await res.json();
    container.innerHTML = "";

    // ⭐ Sort theo title A → Z
    data.list.sort((a, b) => a.title.localeCompare(b.title));


    if (!data.list.length) {
        container.innerHTML = "<i>No conversations found</i>";
        return;
    }

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

// ===============================
// VIEW CONVERSATION IN POPUP
// ===============================
async function openConversation(convId) {
    const token = localStorage.getItem("token") || "";

    const res = await fetch(`/conversation/${convId}`, {
        headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();

    document.getElementById("adminConvTitle").innerText =
        `${data.title} — (${data.messages.length} messages)`;

    const container = document.getElementById("adminConvMessages");
    container.innerHTML = "";

    data.messages.forEach(msg => {
        const label = document.createElement("div");
        label.className = msg.role === "user" ? "msg-user-label" : "msg-bot-label";
        label.textContent = msg.role === "user" ? "USER" : "AI";


        const bubble = document.createElement("div");
        bubble.className =
            msg.role === "user" ? "admin-bubble user" : "admin-bubble bot";


        bubble.innerHTML = msg.text.replace(/\n/g, "<br>");

        container.appendChild(label);
        container.appendChild(bubble);
    });

    document.getElementById("adminConvModal").style.display = "flex";
}

function renderRoleBadge(role) {
    if (role === "superadmin") {
        return `<span class="role-badge role-superadmin"><i class="bi bi-star-fill"></i> SUPERADMIN</span>`;
    }
    if (role === "admin") {
        return `<span class="role-badge role-admin"><i class="bi bi-shield-lock"></i> ADMIN</span>`;
    }
    return `<span class="role-badge role-user"><i class="bi bi-person"></i> USER</span>`;
}


// ===============================
// DELETE CONVERSATION
// ===============================
async function deleteConversation(convId, userId) {
    if (!confirm("Xóa cuộc hội thoại này?")) return;

    await fetch(`/admin/conversation/${convId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + getToken() }
    });

    alert("Đã xóa conversation");

    if (userId) {
        // reload danh sách hội thoại của user
        loadUserConversations(userId);
    } else {
        // đang ở All Conversations → reload toàn bộ
        loadAllConversations();
    }
}


// ===============================
// MODAL CLOSE EVENTS
// ===============================
document.getElementById("adminConvOkBtn").onclick =
    document.getElementById("adminConvClose").onclick =
    () => {
        document.getElementById("adminConvModal").style.display = "none";
    };

// ===============================
// LOAD ALL CONVERSATIONS
// ===============================
async function loadAllConversations() {
    const token = getToken();
    const container = document.getElementById("adminContent");

    container.classList.add("all-conv-mode");

    container.innerHTML = "<p>Loading all conversations...</p>";

    const res = await fetch("/admin/conversations", {
        headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();
    container.innerHTML = "";

    // ⭐ Sort theo title A → Z
    data.list.sort((a, b) => a.title.localeCompare(b.title));

    if (!data.list.length) {
        container.innerHTML = "<i>No conversations found</i>";
        return;
    }

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


const roleBox = document.getElementById("sbProfileRole");
if (roleBox && profile.role) {
    roleBox.innerHTML = renderRoleBadge(profile.role);
}


const adminLogoutBtn = document.getElementById("logoutBtnSidebar");
if (adminLogoutBtn) {
    adminLogoutBtn.onclick = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("profile");
        alert("Đã đăng xuất!");
        window.location.replace("index.html");  // quay về trang chính
    };
}

document.getElementById("loadUsersBtn").onclick = () => {
    setActiveTab("users");
    loadUsers();
};

document.getElementById("loadAllConversationsBtn").onclick = () => {
    setActiveTab("conversations");
    loadAllConversations();
};


// START
loadUsers();

