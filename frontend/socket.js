// socket.js - Manages real-time WebSocket connection for live dashboard updates

(function initWebSocket() {
  // Derive WebSocket URL from API_BASE (e.g., http://... to ws://...)
  let wsUrl = 'ws://localhost:3000';
  
  if (typeof API_BASE !== 'undefined') {
    wsUrl = API_BASE.replace(/^http/, 'ws');
  }

  const connect = () => {
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[WebSocket] Connected successfully for live dashboard updates.');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'REFRESH_DASHBOARD') {
          console.log('[WebSocket] Received REFRESH_DASHBOARD event. Updating UI...');
          
          // Only trigger if these functions are currently available in the window scope
          if (typeof refreshDashboardStats === 'function') {
            refreshDashboardStats();
          }
          if (typeof loadDashboardRecentBookings === 'function') {
            loadDashboardRecentBookings();
          }
          if (typeof loadBookingTabRecentBookings === 'function') {
            loadBookingTabRecentBookings();
          }
        }
      } catch (err) {
        console.error('[WebSocket] Error parsing message data:', err);
      }
    };

    socket.onclose = () => {
      console.log('[WebSocket] Connection closed. Attempting to reconnect in 5 seconds...');
      setTimeout(connect, 5000);
    };

    socket.onerror = (err) => {
      console.error('[WebSocket] Connection error. Closing socket to force reconnect.');
      socket.close();
    };
  };

  // Initialize connection
  connect();
})();
