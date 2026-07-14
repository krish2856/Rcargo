// search and track engines
async function performTrackSearch() {
  const table = document.getElementById("trackResultsTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");

  const searchInput = document.getElementById("trackSearchInput").value;
  const user = JSON.parse(localStorage.getItem("rcargo_user"));

  let url = `${API_BASE}/api/bookings?branchCode=${user.branchCode}`;
  if (searchInput) {
    url += `&search=${encodeURIComponent(searchInput)}`;
  }

  try {
    const res = await fetch(url);
    const list = await res.json();

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No matching shipments found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(b => {
      const date = new Date(b.bookingDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
      const payClass = b.billing.paymentMode === 'Paid' ? 'badge-paid' : (b.billing.paymentMode === 'To Pay' ? 'badge-topay' : 'badge-account');
      const statusClass = b.status === 'Booked' ? 'booked' : 'transit';

      const deleteBtn = (user && user.type === 'company') ? `
        <button class="btn-icon" onclick="handleDeleteBooking('${b.lrNumber}')" style="background:#ef4444; color:white; border-radius:4px; padding:3px 6px; margin-left:3px;" title="Delete Booking"><i class="fa-solid fa-trash"></i> Delete</button>
      ` : '';

      return `
        <tr>
          <td><strong style="color:var(--primary);">${b.lrNumber}</strong></td>
          <td>${date}</td>
          <td>${b.originBranch}</td>
          <td>${b.destinationBranch}</td>
          <td>${b.consignor.name}</td>
          <td>${b.consignee.name}</td>
          <td><span class="badge ${payClass}">${b.billing.paymentMode}</span></td>
          <td style="font-weight:600; text-align:right;">₹${b.billing.grandTotal.toFixed(2)}</td>
          <td><span class="badge badge-status ${statusClass}">${b.status}</span></td>
          <td>
            <button class="btn-icon" onclick="showLrModal('${b.lrNumber}')"><i class="fa-solid fa-print"></i> Receipt</button>
            ${deleteBtn}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #f87171;">Error performing search.</td></tr>`;
  }
}

// Quick track from non-authenticated portal (Login / Header bar)
async function quickTrack() {
  const inputVal = document.getElementById("headerTrackInput").value.trim();
  if (!inputVal) {
    alert("Please enter a valid LR Number (e.g. LR-2026-0001)");
    return;
  }

  const modal = document.getElementById("trackModal");
  const body = document.getElementById("trackModalBody");

  modal.classList.add("active");
  body.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; margin-bottom:10px;"></i><br>Locating Consignment...</div>`;

  try {
    const res = await fetch(`${API_BASE}/api/bookings/${inputVal}`);
    const b = await res.json();

    if (!res.ok) {
      body.innerHTML = `
        <div style="text-align:center; padding: 2rem;">
          <i class="fa-solid fa-circle-exclamation" style="font-size:3rem; color:#ef4444; margin-bottom:10px;"></i>
          <h3>Shipment Not Found</h3>
          <p style="color:var(--text-muted); margin-top:8px;">${b.message || 'Check the LR Number and try again.'}</p>
        </div>
      `;
      return;
    }

    const dateStr = new Date(b.bookingDate).toLocaleString('en-IN');

    // Status tracking bar simulation
    body.innerHTML = `
      <div style="background:var(--bg-primary); padding:1rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1.5rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span><strong>LR Number:</strong> ${b.lrNumber}</span>
          <span class="badge badge-paid">${b.billing.paymentMode}</span>
        </div>
        <p><strong>Booking Date:</strong> ${dateStr}</p>
        <p><strong>Route:</strong> Branch ${b.originBranch} <i class="fa-solid fa-arrow-right-long" style="margin: 0 5px; color:var(--primary);"></i> Branch ${b.destinationBranch}</p>
      </div>

      <!-- Consignment Status Step Trace -->
      <h4 style="margin-bottom:10px;"><i class="fa-solid fa-bars-staggered"></i> Transit Status History</h4>
      <div style="display:flex; flex-direction:column; gap:15px; margin-top:10px; border-left: 2px solid var(--border); padding-left:20px; position:relative;">
        <div style="position:relative;">
          <span style="position:absolute; left:-27px; top:2px; background:var(--accent-green); width:12px; height:12px; border-radius:50%; box-shadow:0 0 10px var(--accent-green);"></span>
          <strong style="color:var(--text-main);">Current Status: ${b.status}</strong>
          <p style="font-size:0.8rem; color:var(--text-muted);">Cargo scanned and registered in branch dispatch warehouse.</p>
        </div>
        <div style="position:relative;">
          <span style="position:absolute; left:-27px; top:2px; background:var(--accent-blue); width:12px; height:12px; border-radius:50%;"></span>
          <strong>Shipment Created</strong>
          <p style="font-size:0.8rem; color:var(--text-muted);">${dateStr} - Lorry Receipt issued at Origin Branch.</p>
        </div>
      </div>
      
      <div style="margin-top:1.5rem; border-top:1px solid var(--border); padding-top:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:15px; font-size:0.85rem;">
        <div>
          <strong style="color:var(--primary);">Sender:</strong>
          <p>${b.consignor.name}</p>
        </div>
        <div>
          <strong style="color:var(--primary);">Receiver:</strong>
          <p>${b.consignee.name}</p>
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    body.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">Unable to contact server. Please verify connection.</div>`;
  }
}

function closeTrackModal() {
  document.getElementById("trackModal").classList.remove("active");
}

