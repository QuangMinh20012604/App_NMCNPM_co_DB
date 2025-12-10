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
// LOAD ALL USERS (FINAL VERSION)
// ===============================
async function loadUsers() {
    const token = getToken();
    const container = document.getElementById("adminContent");
    container.classList.add("users-scroll-mode");
    container.classList.remove("all-conv-mode");

    container.innerHTML = "<p>Loading users...</p>";

    const res = await fetch("/admin/users", {
        headers: { "Authorization": "Bearer " + token }
    });

    const users = await res.json();
    container.innerHTML = "";

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

        // ==========================
        // ROLE CHECKING
        // ==========================
        const currentRole = profile.role;   // role của người đang đăng nhập
        const targetRole = user.role;       // role của user đang hiển thị
        const isSelf = profile.id === user._id;

        // ==================================================
        // 1) ROLE BUTTON (Set: Admin/User) — ALWAYS SHOWN BUT DISABLED WHEN NO PERMISSION
        // ==================================================
        let roleDisabled = false;

        if (currentRole === "admin") {
            // admin không được đổi role ai
            roleDisabled = true;
        } 
        else if (currentRole === "superadmin") {
            // superadmin không đổi role superadmin khác
            if (targetRole === "superadmin") roleDisabled = true;

            // superadmin không đổi role chính mình
            if (isSelf) roleDisabled = true;
        }

        const roleBtn = `
            <button class="btn-role"
                ${roleDisabled
                    ? "disabled style='opacity:0.4; cursor:not-allowed;'"
                    : `onclick="toggleRole('${user._id}', '${user.role}')"`
                }>
                Set: ${user.role === "admin" ? "User" : "Admin"}
            </button>
        `;

        // ==================================================
        // 2) DELETE BUTTON — BEHAVIORS EXACTLY AS REQUESTED
        // ==================================================
        let deleteBtn = "";

        if (currentRole === "superadmin") {

            // Không cho xoá superadmin → ẨN LUÔN
            if (targetRole === "superadmin") {
                deleteBtn = "";
            }
            else if (isSelf) {
                // Superadmin không xoá chính mình
                deleteBtn = `
                    <button class="btn-delete" disabled style="opacity:0.4; cursor:not-allowed;">
                        Delete
                    </button>
                `;
            }
            else {
                deleteBtn = `
                    <button class="btn-delete" onclick="deleteUser('${user._id}')">
                        Delete
                    </button>
                `;
            }
        }

        if (currentRole === "admin") {

            // Admin chỉ xoá được user thường
            if (targetRole === "user") {
                deleteBtn = `
                    <button class="btn-delete" onclick="deleteUser('${user._id}')">
                        Delete
                    </button>
                `;
            }
            else {
                deleteBtn = `
                    <button class="btn-delete" disabled style="opacity:0.4; cursor:not-allowed;">
                        Delete
                    </button>
                `;
            }
        }

        // ==================================================
        // 3) RENDER UI
        // ==================================================
        div.innerHTML = `
            <div class="user-row-top">
                <b>${user.email}</b> — ${renderRoleBadge(user.role)}
            </div>

            <div class="user-actions">
                <button class="btn-view" onclick="loadUserConversations('${user._id}')">
                    Conversations
                </button>

                ${roleBtn}
                ${deleteBtn}
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
    loadUserConversations(userId);
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

