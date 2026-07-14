// admin panel actions
async function loadAdminBranchOptions() {
  const select = document.getElementById("adminUserBranch");
  if (!select) return;

  try {
    const res = await fetch(`${API_BASE}/api/branches`);
    const branches = await res.json();

    select.innerHTML = branches.map(b => `<option value="${b.code}">${b.name}</option>`).join('');
  } catch (err) {
    console.error('Error loading admin branch options:', err);
  }
}

async function handleCreateBranch(e) {
  e.preventDefault();
  const code = document.getElementById("adminBranchCode").value.trim().toLowerCase();
  const name = document.getElementById("adminBranchName").value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("rcargo_token")}`
      },
      body: JSON.stringify({ code, name })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to create branch');
      return;
    }

    alert('Branch created successfully!');
    document.getElementById("adminBranchForm").reset();

    // Clear branch dropdown cache so it re-fetches updated lists
    branchesList = [];
    loadBranchDropdowns();
    loadAdminBranchOptions();
  } catch (err) {
    console.error(err);
    alert('Network error. Failed to create branch.');
  }
}

async function handleCreateUser(e) {
  e.preventDefault();
  const branchCode = document.getElementById("adminUserBranch").value;
  const name = document.getElementById("adminUserName").value.trim();
  const username = document.getElementById("adminUserUsername").value.trim();
  const password = document.getElementById("adminUserPassword").value;

  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("rcargo_token")}`
      },
      body: JSON.stringify({ branchCode, name, username, password, type: 'branch' })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to create agent account');
      return;
    }

    alert('Agent account created successfully!');
    document.getElementById("adminUserForm").reset();
    loadAdminUserOptions();
  } catch (err) {
    console.error(err);
    alert('Network error. Failed to create user account.');
  }
}

async function loadAdminUserOptions() {
  const select = document.getElementById("changePasswordUser");
  if (!select) return;

  try {
    const res = await fetch(`${API_BASE}/api/users`);
    if (!res.ok) {
      console.error('Server returned error status:', res.status);
      select.innerHTML = '<option value="">Failed to load users</option>';
      return;
    }
    const users = await res.json();

    select.innerHTML = users.map(u => `<option value="${u.id}">${u.name} (${u.username} - ${u.type === 'company' ? 'Admin' : u.branchCode})</option>`).join('');
  } catch (err) {
    console.error('Error loading admin user options:', err);
    select.innerHTML = '<option value="">Failed to load users</option>';
  }
}

async function handleUpdatePassword(e) {
  e.preventDefault();
  const userId = document.getElementById("changePasswordUser").value;
  const newPassword = document.getElementById("changePasswordNewPassword").value;

  try {
    const res = await fetch(`${API_BASE}/api/users/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("rcargo_token")}`
      },
      body: JSON.stringify({ userId, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to change password.');
      return;
    }

    alert(data.message || 'Password changed successfully!');
    document.getElementById("adminChangePasswordForm").reset();
  } catch (err) {
    console.error(err);
    alert('Network error. Failed to update password.');
  }
}

async function handleDeleteBooking(lrNumber) {
  if (!confirm(`Are you sure you want to permanently delete Booking ${lrNumber}?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/bookings/${lrNumber}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem("rcargo_token")}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to delete booking.');
      return;
    }

    alert('Booking deleted successfully.');

    // Refresh active tab views
    const currentTabOverview = document.getElementById("tab-overview");
    const currentTabTracking = document.getElementById("tab-tracking");
    const currentTabBooking = document.getElementById("tab-booking");

    if (currentTabOverview && currentTabOverview.classList.contains("active")) {
      refreshDashboardStats();
      loadDashboardRecentBookings();
    }
    if (currentTabTracking && currentTabTracking.classList.contains("active")) {
      performTrackSearch();
    }
    if (currentTabBooking && currentTabBooking.classList.contains("active")) {
      loadBookingTabRecentBookings();
    }
  } catch (err) {
    console.error(err);
    alert('Network error. Failed to delete booking.');
  }
}

// manage agents (admin)
async function loadAdminUsersTable() {
  const table = document.getElementById("adminUsersTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");

  try {
    const res = await fetch(`${API_BASE}/api/users`);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #f87171;">Failed to load agents list.</td></tr>`;
      return;
    }
    const users = await res.json();

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No agents found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td>${u.name}</td>
        <td>${u.branchCode === 'CORP' ? '<span class="badge" style="background:var(--accent-blue);">CORP</span>' : u.branchCode}</td>
        <td>${u.type === 'company' ? 'Admin' : 'Agent'}</td>
        <td>
          <button class="btn-icon" onclick="handleEditUser('${u.id}', '${u.name}')" title="Edit Agent Name" style="margin-right: 5px;"><i class="fa-solid fa-edit"></i> Edit</button>
          ${u.username !== 'admin' || u.type !== 'company' ? `<button class="btn-icon" onclick="handleDeleteUser('${u.id}')" style="background:#ef4444; color:white; border-radius:4px; padding:3px 6px;" title="Delete Agent"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading admin users table:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #f87171;">Failed to load agents list.</td></tr>`;
  }
}

async function handleEditUser(id, currentName) {
  const newName = prompt("Enter new agent name:", currentName);
  if (newName === null || newName.trim() === "" || newName.trim() === currentName) {
    return; // Cancelled or no change
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("rcargo_token")}`
      },
      body: JSON.stringify({ name: newName })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to update agent name.');
      return;
    }

    alert('Agent name updated successfully.');
    loadAdminUsersTable();
    loadAdminUserOptions(); // Refresh the dropdown for change password
  } catch (err) {
    console.error(err);
    alert('Network error. Failed to update agent name.');
  }
}

async function handleDeleteUser(id) {
  if (!confirm(`Are you sure you want to permanently delete this agent account?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem("rcargo_token")}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to delete agent.');
      return;
    }

    alert('Agent deleted successfully.');
    loadAdminUsersTable();
    loadAdminUserOptions(); // Refresh the dropdown for change password
  } catch (err) {
    console.error(err);
    alert('Network error. Failed to delete agent.');
  }
}

