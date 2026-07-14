// automated enter-key navigation
function setupEnterKeyNavigation() {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const selectors = "input:not([type=hidden]):not([disabled]), select:not([disabled])";

  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      // If pressing Enter inside a button, let the default happen
      if (e.target.tagName === "BUTTON") {
        return;
      }

      e.preventDefault(); // Stop standard form submission

      const inputs = Array.from(form.querySelectorAll(selectors));
      const index = inputs.indexOf(e.target);

      if (index > -1) {
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
          if (inputs[index + 1].select) {
            inputs[index + 1].select();
          }
        } else {
          // Trigger the submission on last input Enter keypress
          handleCreateBooking();
        }
      }
    }
  });
}

// Bind Enter key navigation dynamically to tab loads
// Qty change listener: sets basic freight to 200 when Qty is exactly 1
function setupQtyChangeListener() {
  const qtyInput = document.getElementById("bookQty");
  if (!qtyInput) return;

  qtyInput.addEventListener("input", function () {
    const qty = parseInt(this.value, 10) || 1;
    document.getElementById("billBasicFreight").value = 200 * qty;
    calculateTariff();
  });
}

const originalSwitchTab = switchTab;
switchTab = function (tabId) {
  originalSwitchTab(tabId);
  if (tabId === 'booking') {
    // Wait a brief timeout for form DOM to be structured and branch dropdowns to load
    setTimeout(() => {
      setupEnterKeyNavigation();
      setupQtyChangeListener();
    }, 100);
  }
};

