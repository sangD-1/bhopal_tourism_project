/* ===================================================
   BHOPAL TOURISM - AUTHENTICATION SCRIPT
   =================================================== */

let currentAuthMode = "login"; // 'login' or 'register'

function switchAuthMode(mode) {
    currentAuthMode = mode;
    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");
    const nameGroup = document.getElementById("nameGroup");
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const btnText = document.getElementById("btnText");
    const alertBox = document.getElementById("authAlert");

    if (alertBox) alertBox.style.display = "none";

    if (mode === "register") {
        tabRegister.classList.add("active");
        tabLogin.classList.remove("active");
        nameGroup.style.display = "block";
        document.getElementById("name").setAttribute("required", "required");
        authTitle.textContent = "Create an Account";
        authSubtitle.textContent = "Join Bhopal Tourism to explore itineraries and share memories.";
        btnText.textContent = "Register Account";
    } else {
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        nameGroup.style.display = "none";
        document.getElementById("name").removeAttribute("required");
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Enter your credentials to access your Bhopal Tourism account.";
        btnText.textContent = "Sign In to Account";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("authForm");
    const alertBox = document.getElementById("authAlert");
    const submitBtn = document.getElementById("submitBtn");
    const btnText = document.getElementById("btnText");
    const btnSpinner = document.getElementById("btnSpinner");

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const nameInput = document.getElementById("name");
        const name = nameInput ? nameInput.value.trim() : "";

        alertBox.style.display = "none";
        alertBox.className = "auth-alert";
        alertBox.textContent = "";

        if (!email || !password) {
            showAlert("Email and password are required.", "error");
            return;
        }

        if (currentAuthMode === "register" && !name) {
            showAlert("Please provide your full name.", "error");
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        btnSpinner.style.display = "inline-block";
        btnText.style.opacity = "0.7";

        try {
            const endpoint = currentAuthMode === "register" ? "/api/register" : "/api/login";
            const payload = currentAuthMode === "register" 
                ? { name: name, email: email, password: password }
                : { email: email, password: password };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                const errorMsg = data.message || data.error || "Authentication failed. Please check your credentials.";
                throw new Error(errorMsg);
            }

            // Success
            if (currentAuthMode === "register") {
                showAlert("Account created successfully! Redirecting...", "success");
                setTimeout(() => {
                    window.location.href = "/";
                }, 1000);
            } else {
                showAlert("Welcome back! Redirecting...", "success");
                setTimeout(() => {
                    if (data.role === "admin") {
                        window.location.href = "/admin";
                    } else {
                        window.location.href = "/";
                    }
                }, 700);
            }

        } catch (error) {
            showAlert(error.message, "error");
        } finally {
            submitBtn.disabled = false;
            btnSpinner.style.display = "none";
            btnText.style.opacity = "1";
        }
    });

    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `auth-alert ${type}`;
        alertBox.style.display = "block";
    }
});