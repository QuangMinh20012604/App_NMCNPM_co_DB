// ============================================================================
// SAVE / LOAD / DELETE / RENAME via MongoDB
// Bộ hàm xử lý thao tác CRUD cho hội thoại:
// - fetchSavedList(): lấy danh sách hội thoại
// - loadConversationDB(): tải hội thoại và render vào UI
// - deleteConversationDB(): xóa hội thoại
// - renameConversationDB(): đổi tên hội thoại
// - showSavedListModal(): modal danh sách hội thoại đã lưu
// - saveFullConversationToDB(): lưu toàn bộ hội thoại hiện tại
// ============================================================================


// ============================================================================
// Lấy danh sách hội thoại từ DB cho người dùng hiện tại
// ============================================================================
async function fetchSavedList() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Bạn phải đăng nhập để xem danh sách hội thoại.");
        return [];
    }

    const res = await fetch("/conversation/list", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    // Trả về mảng: [{ _id, title, createdAt, messages: [...] }]
    return await res.json();
}


// ============================================================================
// LOAD conversation từ DB và đổ vào UI chat
// ============================================================================

async function loadConversationDB(conversationId) {
    const token = localStorage.getItem("token");
    if (!token) return alert("Bạn chưa đăng nhập!");

    const res = await fetch(`/conversation/${conversationId}`, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const conv = await res.json();

    // Xóa giao diện chat & reset history local
    messages.innerHTML = "";
    conversationHistory = [];

    // Ghi lại ID vào localStorage
    localStorage.setItem("conversationId", conversationId);
    window.conversationId = conversationId;

    // Render từng message
    conv.messages.forEach((m) => {

        // Mỗi message có thể có field text hoặc content → chuẩn hóa
        const text = m.text || m.content || "";   // FIX GIỮ ĐÚNG DỮ LIỆU

        if (!text) return;

        if (m.role === "user") {
            appendMessage("You", text, "user");
            conversationHistory.push({ role: "user", content: text });
        } else {
            appendAIMessage(text);
            conversationHistory.push({ role: "bot", content: text });
        }
    });

    smartScroll();
}


// ============================================================================
// XÓA 1 CUỘC HỘI THOẠI TRONG DB
// ============================================================================
async function deleteConversationDB(id) {
    const token = localStorage.getItem("token");
    if (!token) return alert("Bạn chưa đăng nhập!");

    const res = await fetch(`/conversation/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const data = await res.json();

    if (data.success) {
        alert("Đã xóa cuộc hội thoại.");
    } else {
        alert("Xóa thất bại!");
    }
}


// ============================================================================
// ĐỔI TÊN CUỘC HỘI THOẠI TRONG DB
// ============================================================================
async function renameConversationDB(id, newTitle) {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await fetch("/conversation/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            conversationId: id,
            title: newTitle
        })
    });

    const data = await res.json();

    // Nếu lỗi → trả null
    if (!data || data.error || !data.success) {
        alert("❌ Đổi tên thất bại: " + (data?.error || "Unknown error"));
        return null;
    }

    console.log("✔ Đã đổi tên trong DB:", data.title);
    return data.title;
}


// ============================================================================
// HIỂN THỊ MODAL DANH SÁCH HỘI THOẠI ĐÃ LƯU
// ============================================================================
async function showSavedListModal() {

    const list = await fetchSavedList(); // lấy từ DB

    const modal = document.createElement("div");
    modal.className = "modal";

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    modal.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.className = "modal-panel";

    // Tiêu đề modal
    const h2 = document.createElement("h2");
    h2.innerHTML = `<i class="bi bi-bookmark-star" style="margin-right:6px;"></i> Saved Conversations`;
    h2.style.color = "var(--accent3)";
    panel.appendChild(h2);

    // Danh sách hội thoại
    const container = document.createElement("div");
    container.style.maxHeight = "360px";
    container.style.overflowY = "auto";

    if (!list.length) {
        container.innerHTML = "<div>Không có cuộc hội thoại nào.</div>";

    } else {

        list.forEach((item) => {

            const row = document.createElement("div");
            row.style.padding = "10px 0";
            row.style.marginBottom = "12px";
            row.style.borderBottom = "1px solid #eee";

            // Tiêu đề hội thoại
            const title = document.createElement("div");
            title.textContent = item.title || "Untitled";
            title.style.fontWeight = "700";
            title.style.marginBottom = "6px";
            row.appendChild(title);

            // Nhóm nút VIEW / RENAME / DELETE
            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.gap = "10px";


            // VIEW
            const btnView = document.createElement("button");
            btnView.className = "btn-view";
            btnView.textContent = "View";
            btnView.onclick = () => {
                loadConversationDB(item._id);
                document.body.removeChild(modal);
            };


            // RENAME
            const btnRename = document.createElement("button");
            btnRename.className = "btn-rename";
            btnRename.textContent = "Rename";
            btnRename.onclick = async () => {
                const newName = prompt("Nhập tên mới:");
                if (newName) {
                    const finalName = await renameConversationDB(item._id, newName.trim());
                    if (finalName) alert("Đổi tên thành: " + finalName);

                    document.body.removeChild(modal);
                    showSavedListModal(); // load lại danh sách
                }
            };


            // DELETE
            const btnDelete = document.createElement("button");
            btnDelete.className = "btn-delete";
            btnDelete.textContent = "Delete";
            btnDelete.onclick = async () => {
                if (!confirm("Chắc chắn xóa?")) return;

                await deleteConversationDB(item._id);

                document.body.removeChild(modal);
                showSavedListModal(); // load lại danh sách
            };


            actions.appendChild(btnView);
            actions.appendChild(btnRename);
            actions.appendChild(btnDelete);

            row.appendChild(actions);
            container.appendChild(row);
        });
    }

    panel.appendChild(container);

    // Nút đóng modal
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.onclick = () => document.body.removeChild(modal);
    panel.appendChild(closeBtn);

    modal.appendChild(panel);
    document.body.appendChild(modal);
}


// ============================================================================
// LƯU TOÀN BỘ HỘI THOẠI HIỆN TẠI VÀO DB
// ============================================================================
async function saveFullConversationToDB() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Bạn cần đăng nhập trước khi lưu!");
        return;
    }

    if (!conversationHistory.length) {
        alert("Không có nội dung hội thoại để lưu!");
        return;
    }

    let title = prompt("Đặt tên cuộc hội thoại:");
    if (!title) return;

    // Chuẩn hóa format messages gửi lên server
    const formattedMessages = conversationHistory.map(m => ({
        role: m.role,
        text: m.content || m.text || "",
        timestamp: m.timestamp || new Date().toISOString()
    }));

    const res = await fetch("/conversation/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            title,
            messages: formattedMessages
        })
    });

    const data = await res.json();

    if (!data || data.error || !data.success) {
        alert("❌ Lưu thất bại: " + (data?.error || "Unknown error"));
        return;
    }

    alert(`✔ Đã lưu với tên: ${data.title}`);
    localStorage.setItem("conversationId", data.conversationId);
}
