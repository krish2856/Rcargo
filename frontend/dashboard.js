// dashboard tabs management
function switchTab(tabId) {
  // Hide all tabs
  const tabs = document.querySelectorAll(".dashboard-tab");
  tabs.forEach(tab => tab.classList.remove("active"));

  // Deactivate all sidebar buttons
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
  menuItems.forEach(item => item.classList.remove("active"));

  // Activate selected tab & sidebar item
  document.getElementById(`tab-${tabId}`).classList.add("active");
  document.getElementById(`menu-${tabId}`).classList.add("active");

  // Update header title
  const tabTitles = {
    overview: "Dashboard Overview",
    booking: "Parcel Booking V4",
    tracking: "Search & Track Consignments",
    reports: "Branch Ledger Reports",
    admin: "Corporate Management Panel"
  };
  document.getElementById("currentTabTitle").innerText = tabTitles[tabId] || "Dashboard";

  // Trigger load functions
  if (tabId === 'overview') {
    refreshDashboardStats();
    loadDashboardRecentBookings();
  } else if (tabId === 'booking') {
    loadBranchDropdowns();
    loadBookingTabRecentBookings();
    calculateTariff();
  } else if (tabId === 'tracking') {
    performTrackSearch();
  } else if (tabId === 'reports') {
    generateReportSummary();
  } else if (tabId === 'admin') {
    loadAdminBranchOptions();
    loadAdminUserOptions();
    loadAdminUsersTable();
  }
}

