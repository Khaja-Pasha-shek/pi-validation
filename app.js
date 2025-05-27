const app = document.getElementById('app');

let data = null;
let selectedChip = null;
let selectedSession = null;

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

// --- Show all chips ---
function showChips() {
  location.hash = 'chips';
  selectedChip = null;
  selectedSession = null;

  app.innerHTML = `
    <h2 class="mb-4">Select a Chip</h2>
    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4"></div>
  `;

  const grid = app.querySelector('div.row');

  data.data.forEach(device => {
    const col = document.createElement('div');
    col.className = "col";

    const card = document.createElement('div');
    card.className = "card h-100 cursor-pointer shadow-sm";

    card.innerHTML = `
      <img src="icon.png" alt="Chip Icon" class="card-img-top mb-2" style="object-fit: contain; height: 180px; padding: 5px;" />
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${device.id}</h5>
        <p class="card-text mb-2">Sessions: <strong>${device.sessions.length}</strong></p>
        <p class="card-text text-muted small mt-auto">Created at: ${formatDate(device.createdAt)}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      selectedChip = device;
      showSessions(device);
    });

    col.appendChild(card);
    grid.appendChild(col);
  });
}

// --- Show sessions list for a chip ---
function showSessions(chip) {
  location.hash = `chip=${encodeURIComponent(chip.id)}`;
  selectedSession = null;

  app.innerHTML = `
    <button type="button" class="btn btn-link mb-3 px-0">&larr; Back to Chips</button>
    <h2 class="mb-4">Sessions for Chip: ${chip.id}</h2>
    <div class="list-group"></div>
  `;

  app.querySelector('button').addEventListener('click', showChips);

  const listGroup = app.querySelector('.list-group');

  chip.sessions.forEach(session => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    item.textContent = session["session id"];

    const badgeValid = document.createElement('span');
    badgeValid.className = "badge bg-success rounded-pill ms-2";
    badgeValid.textContent = session.dataset.valid.length;

    const badgeInvalid = document.createElement('span');
    badgeInvalid.className = "badge bg-danger rounded-pill ms-2";
    badgeInvalid.textContent = session.dataset.invalid.length;

    item.appendChild(badgeInvalid);
    item.appendChild(badgeValid);

    item.addEventListener('click', () => {
      selectedSession = session;
      showSessionData(chip.id, session);
    });

    listGroup.appendChild(item);
  });
}

// --- Show data for a session ---
function showSessionData(chipId, session) {
  location.hash = `chip=${encodeURIComponent(chipId)}&session=${encodeURIComponent(session["session id"])}`;

  app.innerHTML = `
    <button type="button" class="btn btn-link mb-3 px-0">&larr; Back to Sessions</button>
    <h3 class="mb-4">Data for Chip: ${chipId} | Session: ${session["session id"]}</h3>
  `;

  app.querySelector('button').addEventListener('click', () => {
    showSessions(selectedChip);
  });

  function createTable(chunks, title, badgeClass) {
    const section = document.createElement('section');
    section.className = 'mb-4';

    const heading = document.createElement('h5');
    heading.innerHTML = `${title} <span class="badge ${badgeClass}">${chunks.length}</span>`;
    section.appendChild(heading);

    if (chunks.length === 0) {
      const p = document.createElement('p');
      p.className = 'fst-italic text-muted';
      p.textContent = 'No chunks available';
      section.appendChild(p);
      return section;
    }

    const table = document.createElement('table');
    table.className = 'table table-striped table-bordered table-hover table-sm';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th scope="col">Offset</th>
        <th scope="col">Data (100 digits)</th>
        <th scope="col">Timestamp</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    chunks.forEach(chunk => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${chunk.offset}</td>
        <td><code>${chunk.data}</code></td>
        <td>${formatDate(chunk.timestamp)}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    section.appendChild(table);

    return section;
  }

  app.appendChild(createTable(session.dataset.valid, 'Valid Chunks', 'bg-success'));
  app.appendChild(createTable(session.dataset.invalid, 'Invalid Chunks', 'bg-danger'));
}

// --- Load UI based on current URL hash ---
function loadFromHash() {
  const hash = location.hash.substring(1); // remove #
  if (!hash || hash === 'chips') {
    showChips();
    return;
  }

  const params = new URLSearchParams(hash);
  const chipId = params.get('chip');
  const sessionId = params.get('session');

  if (chipId) {
    const chip = data.data.find(c => c.id === chipId);
    if (!chip) {
      showChips();
      return;
    }
    selectedChip = chip;

    if (sessionId) {
      const session = chip.sessions.find(s => s["session id"] === sessionId);
      if (!session) {
        showSessions(chip);
        return;
      }
      selectedSession = session;
      showSessionData(chipId, session);
    } else {
      showSessions(chip);
    }
  } else {
    showChips();
  }
}

// --- Fetch data and update UI ---
async function fetchDataAndUpdate() {
  try {
    const res = await fetch('https://pi-server-j62a.onrender.com/sessions');
    if (!res.ok) throw new Error('Network error');
    const newData = await res.json();

    if (newData.status !== 'ok') throw new Error('API status not ok');
    data = newData;

    loadFromHash(); // load UI state based on URL hash
  } catch (err) {
    app.innerHTML = `<div class="alert alert-danger" role="alert">Failed to load data: ${err.message}</div>`;
  }
}

// --- Listen for URL hash changes ---
window.addEventListener('hashchange', () => {
  if (!data) return; // ignore if data not loaded
  loadFromHash();
});

// Initial load + refresh every 5 seconds
fetchDataAndUpdate();
setInterval(fetchDataAndUpdate, 5000);
