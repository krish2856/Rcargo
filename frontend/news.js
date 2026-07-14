// news bulletin loader
async function loadNews() {
  const newsTable = document.getElementById("newsTable");
  if (!newsTable) return;
  const tbody = newsTable.querySelector("tbody");

  try {
    const res = await fetch(`${API_BASE}/api/news`);
    const list = await res.json();

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No current system announcements.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td><span class="news-date">${item.date}</span></td>
        <td>
          <div class="news-title">${item.title}</div>
          <div class="news-desc">${item.content}</div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #f87171;">Failed to fetch announcements.</td></tr>`;
  }
}

