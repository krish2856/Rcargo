// dynamic reports generator
async function generateReportSummary() {
  const table = document.getElementById("reportsSummaryTable");
  if (!table) return;
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  const user = JSON.parse(localStorage.getItem("rcargo_user"));
  if (!user) return;

  const fromDate = document.getElementById("reportFromDate")?.value;
  const toDate = document.getElementById("reportToDate")?.value;
  const groupBy = document.getElementById("reportGroupBy")?.value || 'payment';

  try {
    const res = await fetch(`${API_BASE}/api/bookings?branchCode=${user.branchCode}`);
    let bookings = await res.json();

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      bookings = bookings.filter(b => new Date(b.bookingDate) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      bookings = bookings.filter(b => new Date(b.bookingDate) <= to);
    }

    let groups = {};

    if (groupBy === 'payment') {
      thead.innerHTML = `
        <tr>
          <th>Payment Mode</th>
          <th>Consignments Count</th>
          <th>Total Base Freight</th>
          <th>Total Tax (18% GST)</th>
          <th>Consolidated Grand Total</th>
        </tr>
      `;
      groups = {
        'Paid': { count: 0, basic: 0, tax: 0, total: 0 },
        'To Pay': { count: 0, basic: 0, tax: 0, total: 0 },
        'Account': { count: 0, basic: 0, tax: 0, total: 0 }
      };

      bookings.forEach(b => {
        const mode = b.billing.paymentMode;
        if (groups[mode]) {
          groups[mode].count += 1;
          groups[mode].basic += b.billing.basicFreight;
          groups[mode].tax += b.billing.gst;
          groups[mode].total += b.billing.grandTotal;
        }
      });
    } else if (groupBy === 'date') {
      thead.innerHTML = `
        <tr>
          <th>Date</th>
          <th>Consignments Count</th>
          <th>Total Base Freight</th>
          <th>Total Tax (18% GST)</th>
          <th>Consolidated Grand Total</th>
        </tr>
      `;
      
      bookings.forEach(b => {
        const dateObj = new Date(b.bookingDate);
        // YYYY-MM-DD string for sorting/grouping
        const dateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
        if (!groups[dateStr]) {
          groups[dateStr] = { count: 0, basic: 0, tax: 0, total: 0 };
        }
        groups[dateStr].count += 1;
        groups[dateStr].basic += b.billing.basicFreight;
        groups[dateStr].tax += b.billing.gst;
        groups[dateStr].total += b.billing.grandTotal;
      });
    }

    let totalCount = 0;
    let totalBasic = 0;
    let totalTax = 0;
    let totalGrand = 0;

    // Sort keys alphabetically (for dates this works as chronological)
    const sortedKeys = Object.keys(groups).sort();

    const rowsHtml = sortedKeys.map(key => {
      const g = groups[key];
      // Skip empty payment groups to avoid clutter in date or filtered view if needed,
      // but for payment we might want to show zeros. Let's show all for payment, skip 0 for date.
      if (groupBy === 'date' && g.count === 0) return '';
      
      totalCount += g.count;
      totalBasic += g.basic;
      totalTax += g.tax;
      totalGrand += g.total;

      let keyBadge = key;
      if (groupBy === 'payment') {
        const payBadge = key === 'Paid' ? 'badge-paid' : (key === 'To Pay' ? 'badge-topay' : 'badge-account');
        keyBadge = `<span class="badge ${payBadge}">${key}</span>`;
      } else {
        const dParts = key.split('-');
        const displayDate = `${dParts[2]}-${dParts[1]}-${dParts[0]}`; // DD-MM-YYYY
        keyBadge = `<strong>${displayDate}</strong>`;
      }

      return `
        <tr>
          <td>${keyBadge}</td>
          <td><strong>${g.count}</strong></td>
          <td>₹${g.basic.toFixed(2)}</td>
          <td>₹${g.tax.toFixed(2)}</td>
          <td style="font-weight:600;">₹${g.total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const footerHtml = `
      <tr style="border-top:2px solid var(--text-main); font-weight:700; background:rgba(255,255,255,0.02);">
        <td>CONSOLIDATED TOTAL</td>
        <td>${totalCount}</td>
        <td>₹${totalBasic.toFixed(2)}</td>
        <td>₹${totalTax.toFixed(2)}</td>
        <td style="color:var(--primary); font-size:1.1rem;">₹${totalGrand.toFixed(2)}</td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml + footerHtml;

  } catch (err) {
    console.error('Error generating report:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #f87171;">Failed to load branch data ledger.</td></tr>`;
  }
}

