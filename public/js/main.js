// main.js — FINAL VERSION (MongoDB Save Conversation)
// ----------------------------------------------------
(function () {
    console.log("main.js starting...");

    // Helper for safer DOM binding
    function safe(id, fn) {
        const el = document.getElementById(id);
        if (!el) {
            console.warn("Element not found:", id);
            return;
        }
        try { fn(el); }
        catch (err) { console.error("Handler error for", id, err); }
    }

    // ================================
    // AUTH POPUP EVENTS
    // ================================
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

    // ================================
    // SETTINGS POPUP
    // ================================
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

    safe("resetBtn", (el) => {
        el.onclick = () => resetSettings();
    });

    // ================================
    // SAVED LIST (MongoDB)
    // ================================
    safe("openSavedListSidebar", (el) => {
        el.onclick = () => {
            showSavedListModal();   // ← Load từ MongoDB
        };
    });

    // ================================
    // SAVE FULL CONVERSATION (MongoDB)
    // ================================
    safe("openSavePanelSidebar", (el) => {
        el.onclick = () => {
            saveFullConversationToDB();  // ← Lưu lên MongoDB
        };
    });

    // ================================
    // DELETE CHAT (chỉ xóa UI, không đụng DB)
    // ================================
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

    // ================================
    // CLOSE SIDEBAR
    // ================================
    safe("closeSidebar", (el) => {
        el.onclick = () => {
            const slide = document.getElementById("slideSidebar");
            const overlay = document.getElementById("sidebarOverlay");

            if (slide) slide.classList.remove("open");
            if (overlay) {
                overlay.style.opacity = 0;
                setTimeout(() => overlay.style.display = "none", 200);
            }
        };
    });

    // Load voices/settings safely
    try { if (typeof loadVoices === "function") loadVoices(); } catch { }
    try { if (typeof loadSettings === "function") loadSettings(); } catch { }

    console.log("main.js: bindings completed.");
})();


function resetSettings() {
    localStorage.removeItem("settings");
    if (typeof loadSettings === "function") loadSettings();
    alert("Reset trang thành công.");
    location.reload();

}
