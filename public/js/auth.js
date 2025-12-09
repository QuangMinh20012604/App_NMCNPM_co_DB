// auth.js — REAL LOGIN WITH BACKEND
(function () {
    const authModal = document.getElementById("authModal");
    const authCloseBtn = document.getElementById("authCloseBtn");
    const tabLogin = document.getElementById("authTabLogin");
    const tabRegister = document.getElementById("authTabRegister");
    const loginForm = document.getElementById("authLoginForm");
    const registerForm = document.getElementById("authRegisterForm");

    const loginBtn = document.getElementById("loginBtnSidebar");
    const logoutBtn = document.getElementById("logoutBtnSidebar");

    const sbName = document.getElementById("sbProfileName");
    const sbEmail = document.getElementById("sbProfileEmail");

    // ========== UI TABS ==========
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

    tabLogin.onclick = showLogin;
    tabRegister.onclick = showRegister;

    document.getElementById("switchToRegister").onclick = showRegister;
    document.getElementById("switchToLogin").onclick = showLogin;

    // Open modal
    loginBtn.onclick = () => authModal.style.display = "flex";

    // Close modal
    authCloseBtn.onclick = () => authModal.style.display = "none";

    // ========================
    // 🔥 REAL LOGIN
    // ========================
    loginForm.onsubmit = async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
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

            // Save token
            localStorage.setItem("token", data.token);
            localStorage.setItem("profile", JSON.stringify(data.user));
            localStorage.removeItem("conversationId");

            // Update sidebar
            sbName.textContent = data.user.name;
            sbEmail.textContent = data.user.email;

            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";

            alert("Đăng nhập thành công!");
            authModal.style.display = "none";
            location.reload();


        } catch (err) {
            alert("Server error.");
        }
    };

    // ========================
    // 🔥 REAL REGISTER
    // ========================
    registerForm.onsubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
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

            localStorage.setItem("token", data.token);
            localStorage.setItem("profile", JSON.stringify(data.user));

            sbName.textContent = data.user.name;
            sbEmail.textContent = data.user.email;

            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";

            alert("Đăng ký thành công!");
            authModal.style.display = "none";
            location.reload();
        } catch (err) {
            alert("Server error.");
        }
    };

    // ========================
    // 🔥 LOGOUT
    // ========================
    logoutBtn.onclick = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("profile");

        sbName.textContent = "Guest";
        sbEmail.textContent = "Not signed in";

        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";

        alert("Đã đăng xuất!");

        location.reload();
    };

    // ========================
    // 🔥 LOAD saved login (if any)
    // ========================
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
