// login and authentication
function setLoginMode(mode) {
  const btnBranch = document.getElementById("btnBranchMode");
  const btnCompany = document.getElementById("btnCompanyMode");
  const branchCodeGroup = document.getElementById("branchCodeGroup");
  const loginTypeInput = document.getElementById("loginType");
  const branchCodeInput = document.getElementById("branchCode");

  if (mode === 'branch') {
    btnBranch.classList.add("active");
    btnCompany.classList.remove("active");
    branchCodeGroup.style.display = "block";
    loginTypeInput.value = "branch";
    branchCodeInput.required = true;
  } else {
    btnCompany.classList.add("active");
    btnBranch.classList.remove("active");
    branchCodeGroup.style.display = "none";
    loginTypeInput.value = "company";
    branchCodeInput.required = false;
    branchCodeInput.value = "CORP"; // Default for Admin
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const alertBox = document.getElementById("loginAlert");
  alertBox.style.display = "none";
  alertBox.innerText = "";

  const loginType = document.getElementById("loginType").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const branchCode = document.getElementById("branchCode").value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchCode, username, password, loginType })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alertBox.innerText = data.message || "Authentication failed.";
      alertBox.style.display = "block";
      return;
    }

    // Save token and user details to localStorage
    localStorage.setItem("rcargo_token", data.token);
    localStorage.setItem("rcargo_user", JSON.stringify(data.user));

    // Redirect to Dashboard
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    alertBox.innerText = "Connection error. Unable to contact cargo server.";
    alertBox.style.display = "block";
  }
}

function checkAuth() {
  const token = localStorage.getItem("rcargo_token");
  const userStr = localStorage.getItem("rcargo_user");

  if (!token || !userStr) {
    localStorage.clear();
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(userStr);

  // Fill profile details in dashboard UI
  const avatarText = user.username.substring(0, 2).toUpperCase();
  document.getElementById("userAvatar").innerText = avatarText;
  document.getElementById("topHeaderAvatar").innerText = avatarText;
  document.getElementById("sideUserName").innerText = user.name;
  document.getElementById("sideUserRole").innerText = user.type === 'company' ? 'Corporate Admin' : `Agent (${user.branchCode})`;
  document.getElementById("topHeaderBranch").innerText = `Branch: ${user.branchCode}`;

  // Show/Hide Admin menu option based on user type
  const menuAdmin = document.getElementById("menu-admin");
  if (menuAdmin) {
    if (user.type === 'company') {
      menuAdmin.style.display = "block";
    } else {
      menuAdmin.style.display = "none";
    }
  }
}

function handleLogout() {
  localStorage.clear();
  window.location.href = "index.html";
}

