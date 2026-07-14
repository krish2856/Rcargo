// recent tables and statistics grid
async function refreshDashboardStats() {
  const user = JSON.parse(localStorage.getItem("rcargo_user"));
  if (!user) return;

  const url = `${API_BASE}/api/stats?branchCode=${user.branchCode}`;

  try {
    const res = await fetch(url);
    const stats = await res.json();

    document.getElementById("statTotalBookings").innerText = stats.totalBookings;
    document.getElementById("statTotalRevenue").innerText = `₹${stats.totalRevenue.toLocaleString('en-IN')}`;
    document.getElementById("statAverageRevenue").innerText = `₹${stats.averageRevenue.toLocaleString('en-IN')}`;

    document.getElementById("statPaidCount").innerText = stats.paymentBreakdown.paid;
    document.getElementById("statToPayCount").innerText = stats.paymentBreakdown.toPay;
    document.getElementById("statAccountCount").innerText = stats.paymentBreakdown.account;
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
  }
}

// Loads recent list inside the main overview dashboard tab
async function loadDashboardRecentBookings() {
  const table = document.getElementById("dashboardRecentTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");

  const user = JSON.parse(localStorage.getItem("rcargo_user"));
  if (!user) return;

  try {
    const res = await fetch(`${API_BASE}/api/bookings?branchCode=${user.branchCode}`);
    const list = await res.json();

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No cargo bookings processed yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.slice(0, 10).map(b => {
      const date = new Date(b.bookingDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
      const payClass = b.billing.paymentMode === 'Paid' ? 'badge-paid' : (b.billing.paymentMode === 'To Pay' ? 'badge-topay' : 'badge-account');
      const statusClass = b.status === 'Booked' ? 'booked' : 'transit';

      const deleteBtn = (user && user.type === 'company') ? `
        <button class="btn-icon" onclick="handleDeleteBooking('${b.lrNumber}')" style="background:#ef4444; color:white; border-radius:4px; padding:3px 6px; margin-left:3px;" title="Delete Booking"><i class="fa-solid fa-trash"></i></button>
      ` : '';

      return `
        <tr>
          <td><strong style="color:var(--primary);">${b.lrNumber}</strong></td>
          <td style="white-space:nowrap;">${date}</td>
          <td><span class="badge" style="background:var(--bg-tertiary);">${b.originBranch}</span></td>
          <td><span class="badge" style="background:var(--bg-tertiary);">${b.destinationBranch}</span></td>
          <td>${b.consignor.name}</td>
          <td>${b.consignee.name}</td>
          <td><span class="badge ${payClass}">${b.billing.paymentMode}</span></td>
          <td style="font-weight:600; text-align:right;">₹${b.billing.grandTotal.toFixed(2)}</td>
          <td><span class="badge badge-status ${statusClass}">${b.status}</span></td>
          <td>
            <button class="btn-icon" onclick="showLrModal('${b.lrNumber}')" title="Print Lorry Receipt"><i class="fa-solid fa-print"></i></button>
            ${deleteBtn}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching recent dashboard bookings:', err);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #f87171;">Failed to fetch shipments list.</td></tr>`;
  }
}

// Loads recent list inside the V4 Booking Tab
async function loadBookingTabRecentBookings() {
  const table = document.getElementById("bookingTabRecentTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");

  const user = JSON.parse(localStorage.getItem("rcargo_user"));
  if (!user) return;

  try {
    const res = await fetch(`${API_BASE}/api/bookings?branchCode=${user.branchCode}`);
    const list = await res.json();

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No records.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.slice(0, 5).map(b => {
      const date = new Date(b.bookingDate).toLocaleDateString('en-IN');
      const payClass = b.billing.paymentMode === 'Paid' ? 'badge-paid' : (b.billing.paymentMode === 'To Pay' ? 'badge-topay' : 'badge-account');

      return `
        <tr>
          <td><strong style="color:var(--primary);">${b.lrNumber}</strong></td>
          <td>${date}</td>
          <td>${b.destinationBranch}</td>
          <td>${b.consignor.name}</td>
          <td>${b.consignee.name}</td>
          <td>${b.parcel.qty} Pcs / ${b.parcel.articleType}</td>
          <td><span class="badge ${payClass}">${b.billing.paymentMode}</span></td>
          <td style="font-weight:600;">₹${b.billing.grandTotal.toFixed(2)}</td>
          <td>
            <button class="btn-icon" onclick="showLrModal('${b.lrNumber}')"><i class="fa-solid fa-print"></i> Print</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

