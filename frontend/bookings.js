// dropdowns and auto-tariff calculations
let branchesList = [];

async function loadBranchDropdowns() {
  const originSelect = document.getElementById("bookOrigin");
  const destSelect = document.getElementById("bookDest");
  if (!originSelect || !destSelect) return;

  // Only load if lists are empty
  if (branchesList.length > 0) return;

  try {
    const res = await fetch(`${API_BASE}/api/branches`);
    branchesList = await res.json();

    const options = branchesList.map(b => `<option value="${b.code}">${b.name}</option>`).join('');
    originSelect.innerHTML = options;
    destSelect.innerHTML = options;

    // Set origin branch based on user's logged in branch code
    const user = JSON.parse(localStorage.getItem("rcargo_user"));
    if (user && user.branchCode !== 'CORP') {
      originSelect.value = user.branchCode;
    }

    // Select second branch as destination by default if available
    if (branchesList.length > 1) {
      destSelect.selectedIndex = 1;
    }
  } catch (err) {
    console.error('Error fetching branches:', err);
  }
}

// Automatically calculates freight, surcharge, handling fees, and GST tax
function calculateTariff() {
  const qty = parseInt(document.getElementById("bookQty").value, 10) || 1;
  const price = parseFloat(document.getElementById("billPrice")?.value) || 0;

  // Auto Basic Freight calculation
  const basicFreight = price * qty;
  const freightInput = document.getElementById("billBasicFreight");
  if (freightInput) freightInput.value = basicFreight;
  
  const freightText = document.getElementById("billBasicFreightText");
  if (freightText) freightText.innerText = `₹${basicFreight.toFixed(2)}`;

  // Handling charges: default 20
  const handlingInput = document.getElementById("billHandling");
  let handlingCharges = parseFloat(handlingInput.value);
  if (isNaN(handlingCharges)) {
    handlingCharges = 20;
    handlingInput.value = handlingCharges;
  }

  // Subtotal for tax
  const subTotal = basicFreight + handlingCharges;

  // GST calculation
  const gstRateElement = document.getElementById("billGstRate");
  const gstRate = gstRateElement ? parseFloat(gstRateElement.value) : 18;
  const gst = subTotal * (gstRate / 100);
  const grandTotal = subTotal + gst;

  // Update UI Elements
  document.getElementById("billGst").innerText = `₹${gst.toFixed(2)}`;
  document.getElementById("billGrandTotal").innerText = `₹${grandTotal.toFixed(2)}`;
}


// docker booking processors
async function handleCreateBooking(e) {
  if (e) e.preventDefault();

  const form = document.getElementById("bookingForm");
  if (form && !form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const user = JSON.parse(localStorage.getItem("rcargo_user"));

  // Read fields
  const originBranch = document.getElementById("bookOrigin").value;
  const destinationBranch = document.getElementById("bookDest").value;

  if (originBranch === destinationBranch) {
    alert("Warning: Origin and Destination branches cannot be the same.");
    return;
  }

  const consignor = {
    name: document.getElementById("bookSenderName").value,
    mobile: document.getElementById("bookSenderMobile").value,
    address: ""
  };

  const consignee = {
    name: document.getElementById("bookReceiverName").value,
    mobile: document.getElementById("bookReceiverMobile").value,
    address: ""
  };

  const parcel = {
    articleType: document.getElementById("bookArticleType").value,
    qty: parseInt(document.getElementById("bookQty").value, 10),
    declaredValue: 0,
    actualWeight: 0,
    chargedWeight: 0,
    description: ""
  };

  const basicFreight = parseFloat(document.getElementById("billBasicFreight").value) || 0;
  const handlingCharges = parseFloat(document.getElementById("billHandling").value) || 0;
  const deliveryCharges = 0;
  const docketFee = 0;
  const surcharge = 0;

  const subTotal = basicFreight + handlingCharges;
  const gstRateElement = document.getElementById("billGstRate");
  const gstRate = gstRateElement ? parseFloat(gstRateElement.value) : 18;
  const gst = subTotal * (gstRate / 100);
  const grandTotal = subTotal + gst;
  const paymentMode = document.getElementById("bookPaymentMode").value;

  const billing = {
    basicFreight,
    handlingCharges,
    deliveryCharges,
    docketFee,
    surcharge,
    gst,
    grandTotal,
    paymentMode
  };

  const payload = { 
    originBranch, 
    destinationBranch, 
    consignor, 
    consignee, 
    parcel, 
    billing,
    bookedBy: user ? (user.username || user.name) : 'agent'
  };

  try {
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to book cargo parcel.");
      return;
    }

    alert(`Success: Booking created successfully! LR Number generated: ${data.booking.lrNumber}`);

    // Open print preview
    showLrModal(data.booking.lrNumber);

    // Refresh view data
    resetBookingForm();
    loadBookingTabRecentBookings();
  } catch (err) {
    console.error(err);
    alert("Connection error. Could not save cargo booking.");
  }
}

function resetBookingForm() {
  document.getElementById("bookingForm").reset();

  // Restore origin branch code default
  const user = JSON.parse(localStorage.getItem("rcargo_user"));
  if (user && user.branchCode !== 'CORP') {
    document.getElementById("bookOrigin").value = user.branchCode;
  }

  // Nullify manual overrides
  document.getElementById("billBasicFreight").value = "";
  document.getElementById("billHandling").value = "";

  calculateTariff();
}

