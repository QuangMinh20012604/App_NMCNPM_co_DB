// auth.js — REAL LOGIN WITH BACKEND
// =====================================================================
// Module xử lý đăng nhập, đăng ký và đăng xuất bằng backend API.
// Bao gồm điều khiển UI modal, quản lý token, và cập nhật thông tin
// người dùng lên sidebar.
// =====================================================================

(function () {
    // Các phần tử UI liên quan đến authentication modal
    const authModal = document.getElementById("authModal");
    const authCloseBtn = document.getElementById("authCloseBtn");
    const tabLogin = document.getElementById("authTabLogin");
    const tabRegister = document.getElementById("authTabRegister");
    const loginForm = document.getElementById("authLoginForm");
    const registerForm = document.getElementById("authRegisterForm");

    // Nút login / logout ở sidebar
    const loginBtn = document.getElementById("loginBtnSidebar");
    const logoutBtn = document.getElementById("logoutBtnSidebar");

    // Hiển thị tên và email người dùng trên sidebar
    const sbName = document.getElementById("sbProfileName");
    const sbEmail = document.getElementById("sbProfileEmail");

    // ===============================================================
    // UI TAB CONTROL – chuyển đổi giữa Login và Register
    // ===============================================================

    function showLogin() {
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        loginForm.style.display = "flex";
        registerForm.style.display = "none";
    }

    function showRegister() {
        tabRegister.classList.add("active");
        tabLogin.classList.remove("active");
        loginForm.style.display = "none";
        registerForm.style.display = "flex";
    }

    // Gán sự kiện cho nút chuyển tab
    tabLogin.onclick = showLogin;
    tabRegister.onclick = showRegister;

    document.getElementById("switchToRegister").onclick = showRegister;
    document.getElementById("switchToLogin").onclick = showLogin;

    // Mở modal Login/Register
    loginBtn.onclick = () => authModal.style.display = "flex";

    // Đóng modal
    authCloseBtn.onclick = () => authModal.style.display = "none";


    // ===============================================================
    // LOGIN – xử lý đăng nhập backend
    // ===============================================================
    loginForm.onsubmit = async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();

        const password = document.getElementById("loginPassword").value.trim();

        try {
            const res = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!data.success) {
                alert(data.error || "Login failed");
                return;
            }

            // Lưu token + profile vào localStorage
            localStorage.setItem("token", data.token);
            localStorage.setItem("profile", JSON.stringify(data.user));
            localStorage.removeItem("conversationId"); // reset cuộc hội thoại

            // Cập nhật UI sidebar
            sbName.textContent = data.user.name;
            sbEmail.textContent = data.user.email;

            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";

            alert("Đăng nhập thành công!");
            authModal.style.display = "none";

            // Reload lại trang để cập nhật trạng thái đăng nhập
            location.reload();

        } catch (err) {
            alert("Server error.");
        }
    };


    // ===============================================================
    // REGISTER – tạo tài khoản mới qua backend
    // ===============================================================
    registerForm.onsubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById("regName").value.trim();

        const email = document.getElementById("regEmail").value.trim().toLowerCase();

        const password = document.getElementById("regPassword").value.trim();


        try {
            const res = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();

            if (!data.success) {
                alert(data.error || "Register failed");
                return;
            }

            // Lưu token + profile vào localStorage
            localStorage.setItem("token", data.token);
            localStorage.setItem("profile", JSON.stringify(data.user));

            // Cập nhật sidebar
            sbName.textContent = data.user.name;
            sbEmail.textContent = data.user.email;

            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";

            alert("Đăng ký thành công!");
            authModal.style.display = "none";

            // Reload giao diện
            location.reload();

        } catch (err) {
            alert("Server error.");
        }
    };


    // ===============================================================
    // LOGOUT – xóa token + profile và reset UI
    // ===============================================================
    logoutBtn.onclick = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("profile");

        sbName.textContent = "Guest";
        sbEmail.textContent = "Not signed in";

        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";

        alert("Đã đăng xuất!");

        // Reload để cập nhật UI ngay lập tức
        location.reload();
    };


    // ===============================================================
    // LOAD saved login – tự động khôi phục trạng thái đăng nhập
    // ===============================================================
    try {
        const user = JSON.parse(localStorage.getItem("profile") || "null");
        if (user) {
            sbName.textContent = user.name;
            sbEmail.textContent = user.email;

            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";
        }
    } catch { }

})();
