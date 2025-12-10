console.log("main.js starting...");




(function () {
    document.addEventListener("DOMContentLoaded", () => {
        initMenuToggle();
    });
    
    function initMenuToggle() {
        const el = document.getElementById("menuToggle");
        const slide = document.getElementById("slideSidebar");
        const overlay = document.getElementById("sidebarOverlay");

        if (!el || !slide || !overlay) return;

        el.onclick = () => {
            slide.classList.add("open");
            overlay.style.display = "block";
            setTimeout(() => overlay.style.opacity = "0.35", 10);
        };
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

    const p = getProfile();
    const roleBox = document.getElementById("sbProfileRole");

    if (roleBox && p.role) {
        roleBox.innerHTML = p.role.toUpperCase();
    }

    // ============================================
    // SAFE WRAPPER
    // ============================================
    function safe(id, fn) {
        const el = document.getElementById(id);
        if (!el) {
            console.warn("Element not found:", id);
            return;
        }
        try { fn(el); }
        catch (err) { console.error("Handler error for", id, err); }
    }

    // ============================================
    // AUTH POPUP EVENTS
    // ============================================
    safe("loginBtnSidebar", (el) => {
        el.onclick = () => {
            const m = document.getElementById("authModal");
            if (m) m.style.display = "flex";
        };
    });

    safe("authCloseBtn", (el) => {
        el.onclick = () => {
            const m = document.getElementById("authModal");
            if (m) m.style.display = "none";
        };
    });

    // ============================================
    // SETTINGS POPUP
    // ============================================
    safe("settingsBtnSidebar", (el) => {
        el.onclick = () => {
            const modal = document.getElementById("settingsModal");
            if (!modal) return;
            try { if (typeof loadSettings === "function") loadSettings(); } catch { }
            modal.style.display = "flex";
        };
    });

    safe("settingsClose", (el) => {
        el.onclick = () => {
            const modal = document.getElementById("settingsModal");
            if (modal) modal.style.display = "none";
        };
    });

    safe("settingsBackdrop", (el) => {
        el.onclick = () => {
            const modal = document.getElementById("settingsModal");
            if (modal) modal.style.display = "none";
        };
    });

    // ============================================
    // DELETE CHAT
    // ============================================
    safe("deleteBtnSidebar", (el) => {
        el.onclick = () => {
            if (confirm("Bạn muốn xóa hết nội dung chat trên màn hình?")) {
                document.getElementById("messages").innerHTML = "";
                conversationHistory = [];
                conversationId = null;
                localStorage.removeItem("conversationId");
                alert("Đã xóa đoạn chat.");
            }
        };
    });

    // ============================================
    // SIDEBAR TOGGLE
    // ============================================
    safe("menuToggle", (el) => {
        const slide = document.getElementById("slideSidebar");
        const overlay = document.getElementById("sidebarOverlay");

        el.onclick = () => {
            slide.classList.add("open");
            overlay.style.display = "block";
            setTimeout(() => overlay.style.opacity = "0.35", 10);
        };
    });

    safe("closeSidebar", (el) => {
        const slide = document.getElementById("slideSidebar");
        const overlay = document.getElementById("sidebarOverlay");

        el.onclick = () => {
            slide.classList.remove("open");
            overlay.style.opacity = 0;
            setTimeout(() => overlay.style.display = "none", 200);
        };
    });

    safe("sidebarOverlay", (el) => {
        const slide = document.getElementById("slideSidebar");
        const overlay = document.getElementById("sidebarOverlay");

        el.onclick = () => {
            slide.classList.remove("open");
            overlay.style.opacity = 0;
            setTimeout(() => overlay.style.display = "none", 200);
        };
    });

    safe("openSavedListSidebar", (el) => {
        el.onclick = () => {
            try { showSavedListModal(); }
            catch (err) { console.error("Error showing saved list:", err); }
        };
    });

    safe("openSavedListSidebar", (el) => {
        el.onclick = () => {
            try { showSavedListModal(); }
            catch (err) { console.error("Error showing saved list:", err); }
        };
    });

    safe("resetBtn", (el) => {
        el.onclick = () => {
            try { resetConversation(); }
            catch (err) { console.error("Reset error:", err); }
        };
    });

    // ============================
    // ⭐ SAVE CONVERSATION BUTTON
    // ============================
    safe("openSavePanelSidebar", (el) => {
        el.onclick = () => {
            try {
                saveFullConversationToDB();
            } catch (err) {
                console.error("Save Conversation error:", err);
            }
        };
    });



    // ============================================
    // LOAD SETTINGS + VOICES SAFELY
    // ============================================
    try { if (typeof loadVoices === "function") loadVoices(); } catch { }
    try { if (typeof loadSettings === "function") loadSettings(); } catch { }

    // ============================================
    // ⭐⭐ ADMIN PANEL BUTTON ⭐⭐
    // ============================================
    safe("gotoAdminBtn", (el) => {
        el.onclick = () => {
            console.log("Going to admin.html...");
            window.location.href = "admin.html";
        };
    });

    // ============================================
    // ⭐⭐ SHOW/HIDE ADMIN BUTTON ⭐⭐
    // ============================================
    function updateSidebarMenu() {
        const profile = JSON.parse(localStorage.getItem("profile") || "{}");
        const isAdmin = profile.role === "admin" || profile.role === "superadmin";

        const gotoAdmin = document.getElementById("gotoAdminBtn");
        if (gotoAdmin) gotoAdmin.style.display = isAdmin ? "block" : "none";
    }

    updateSidebarMenu();

    console.log("main.js: bindings completed.");

})();
