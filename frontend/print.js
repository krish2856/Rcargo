// lorry receipt print modal controller
async function showLrModal(lrNumber) {
  const modal = document.getElementById("lrReceiptModal");
  if (!modal) return;

  try {
    const res = await fetch(`${API_BASE}/api/bookings/${lrNumber}`);
    const b = await res.json();

    if (!res.ok) {
      alert("Error: Consignment docket details could not be retrieved.");
      return;
    }

    // Populate both duplicate stickers in a loop
    for (let i = 1; i <= 2; i++) {
      document.getElementById(`prLrNo_${i}`).innerText = b.lrNumber;

      const bkgDate = new Date(b.bookingDate).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      document.getElementById(`prDate_${i}`).innerText = bkgDate;

      // Format branch code to capitalized city name
      const fromCity = b.originBranch.charAt(0).toUpperCase() + b.originBranch.slice(1);
      const toCity = b.destinationBranch.charAt(0).toUpperCase() + b.destinationBranch.slice(1);
      document.getElementById(`prOrigin_${i}`).innerText = fromCity;
      document.getElementById(`prDest_${i}`).innerText = toCity;

      document.getElementById(`prSendName_${i}`).innerText = b.consignor.mobile ? `${b.consignor.name} - ${b.consignor.mobile}` : b.consignor.name;
      document.getElementById(`prRecName_${i}`).innerText = b.consignee.name;
      document.getElementById(`prRecNo_${i}`).innerText = b.consignee.mobile || '-';
      document.getElementById(`prPayment_${i}`).innerText = b.billing.paymentMode;

      // Color coding booking type
      const payLabel = document.getElementById(`prPayment_${i}`);
      if (b.billing.paymentMode === 'Paid') payLabel.style.color = '#10b981';
      else payLabel.style.color = '#f59e0b'; // To Pay

      // No of packages formatting
      document.getElementById(`prQty_${i}`).innerText = `${b.parcel.qty} (${b.parcel.qty}-${b.parcel.articleType})`;

      // Cost details
      document.getElementById(`prBasic_${i}`).innerText = Math.round(b.billing.basicFreight);
      document.getElementById(`prHandling_${i}`).innerText = Math.round(b.billing.handlingCharges);
      document.getElementById(`prGst_${i}`).innerText = Math.round(b.billing.gst);
      document.getElementById(`prTransp_${i}`).innerText = Math.round(b.billing.deliveryCharges);
      document.getElementById(`prTotal_${i}`).innerText = Math.round(b.billing.grandTotal);

      // Users
      const user = JSON.parse(localStorage.getItem("rcargo_user"));
      const printUserName = user ? (user.username || user.name) : 'agent';
      document.getElementById(`prBookBy_${i}`).innerText = b.bookedBy || printUserName;
      document.getElementById(`prPrintBy_${i}`).innerText = printUserName;
      document.getElementById(`prRemarks_${i}`).innerText = '-';

      // Current print date/time formatting
      const prDateStr = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      document.getElementById(`prPrintDt_${i}`).innerText = prDateStr;
    }

    modal.classList.add("active");
  } catch (err) {
    console.error(err);
    alert("Connection error fetching LR details.");
  }
}

function closeLrModal() {
  document.getElementById("lrReceiptModal").classList.remove("active");
}

function printReceipt() {
  window.print();
}

