export function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenClaw Backup</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1117; color: #e1e4e8; min-height: 100vh; }
  .container { max-width: 960px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
  h1 span { color: #f97316; }
  .subtitle { color: #8b949e; font-size: 14px; margin-bottom: 24px; }
  .actions { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
  .btn { padding: 8px 16px; border: 1px solid #30363d; border-radius: 6px; background: #21262d; color: #e1e4e8; cursor: pointer; font-size: 13px; transition: all 0.15s; }
  .btn:hover { background: #30363d; border-color: #8b949e; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: #238636; border-color: #238636; }
  .btn-primary:hover { background: #2ea043; }
  .btn-warn { background: #9e6a03; border-color: #9e6a03; }
  .btn-warn:hover { background: #bb8009; }
  .btn-danger { background: #6e1b1b; border-color: #6e1b1b; }
  .btn-danger:hover { background: #8b2525; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; padding: 10px 12px; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 500; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid #21262d; font-size: 13px; }
  tr:hover td { background: #161b22; }
  .log { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin-top: 16px; font-family: monospace; font-size: 12px; line-height: 1.6; max-height: 300px; overflow-y: auto; white-space: pre-wrap; }
  .log:empty { display: none; }
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center; }
  .modal-overlay.show { display: flex; }
  .modal { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
  .modal h2 { font-size: 16px; margin-bottom: 16px; }
  .modal .file-list { font-family: monospace; font-size: 11px; line-height: 1.8; color: #8b949e; max-height: 300px; overflow-y: auto; margin: 12px 0; }
  .group { border: 1px solid #30363d; border-radius: 6px; margin-bottom: 6px; }
  .group-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; cursor: pointer; user-select: none; font-size: 13px; }
  .group-header:hover { background: #21262d; }
  .group-header .arrow { color: #8b949e; font-size: 11px; transition: transform 0.15s; }
  .group-header.open .arrow { transform: rotate(90deg); }
  .group-name { font-weight: 500; }
  .group-count { color: #8b949e; font-size: 12px; margin-left: 8px; }
  .group-files { display: none; padding: 4px 12px 8px; font-family: monospace; font-size: 11px; line-height: 1.6; color: #8b949e; border-top: 1px solid #30363d; }
  .group-files.open { display: block; }
  .modal .actions { margin-top: 16px; justify-content: flex-end; }
  .empty { text-align: center; padding: 48px; color: #8b949e; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #30363d; border-top-color: #58a6ff; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .schedule { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .schedule-label { font-size: 13px; font-weight: 500; }
  .toggle { position: relative; width: 40px; height: 22px; cursor: pointer; }
  .toggle input { display: none; }
  .toggle-track { position: absolute; inset: 0; background: #30363d; border-radius: 11px; transition: background 0.2s; }
  .toggle input:checked + .toggle-track { background: #238636; }
  .toggle-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #e1e4e8; border-radius: 50%; transition: transform 0.2s; }
  .toggle input:checked ~ .toggle-thumb { transform: translateX(18px); }
  select.freq { padding: 6px 10px; border: 1px solid #30363d; border-radius: 6px; background: #21262d; color: #e1e4e8; font-size: 13px; cursor: pointer; }
  select.freq:disabled { opacity: 0.4; cursor: not-allowed; }
  .schedule-status { font-size: 12px; color: #8b949e; }
</style>
</head>
<body>
<div class="container">
  <h1><span>OpenClaw</span> Backup</h1>
  <p class="subtitle">Backup and restore dashboard</p>

  <div class="actions">
    <button class="btn btn-primary" onclick="createBackup()">Create Backup</button>
    <button class="btn" onclick="document.getElementById('import-file').click()">Import Archive</button>
    <input type="file" id="import-file" accept=".tar.gz,.gz" style="display:none" onchange="importBackup(this)">
    <button class="btn" onclick="refresh()">Refresh</button>
  </div>

  <div class="schedule">
    <span class="schedule-label">Scheduled Backup</span>
    <label class="toggle">
      <input type="checkbox" id="sched-toggle" onchange="toggleSchedule()">
      <div class="toggle-track"></div>
      <div class="toggle-thumb"></div>
    </label>
    <select class="freq" id="sched-freq" onchange="changeFrequency()" disabled>
      <option value="hourly">Every hour</option>
      <option value="daily" selected>Daily at 03:00</option>
      <option value="weekly">Weekly (Sunday 03:00)</option>
    </select>
    <span class="schedule-status" id="sched-status">Loading...</span>
  </div>

  <div id="backup-list"></div>
  <div id="log" class="log"></div>
</div>

<div id="modal" class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <h2 id="modal-title"></h2>
    <div id="modal-body"></div>
    <div class="actions">
      <button class="btn" onclick="closeModal()">Close</button>
    </div>
  </div>
</div>

<script>
const logEl = document.getElementById('log');
const listEl = document.getElementById('backup-list');

function log(msg) {
  logEl.style.display = 'block';
  logEl.textContent += msg + '\\n';
  logEl.scrollTop = logEl.scrollHeight;
}

function localDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function showModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').classList.add('show');
}

async function loadSchedule() {
  try {
    const res = await fetch('/api/schedule');
    const data = await res.json();
    const toggle = document.getElementById('sched-toggle');
    const freq = document.getElementById('sched-freq');
    const status = document.getElementById('sched-status');
    toggle.checked = data.enabled;
    freq.disabled = !data.enabled;
    freq.value = data.frequency;
    status.textContent = data.enabled ? 'Enabled' : 'Disabled';
  } catch (e) {
    document.getElementById('sched-status').textContent = 'Error';
  }
}

async function updateSchedule(enabled, frequency) {
  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, frequency })
    });
    const data = await res.json();
    if (data.error) { log('Schedule error: ' + data.error); return; }
    const freq = document.getElementById('sched-freq');
    const status = document.getElementById('sched-status');
    freq.disabled = !data.enabled;
    freq.value = data.frequency;
    status.textContent = data.enabled ? 'Enabled' : 'Disabled';
    log(data.enabled ? 'Scheduled backup enabled (' + data.labels[data.frequency] + ')' : 'Scheduled backup disabled');
  } catch (e) {
    log('Error: ' + e.message);
  }
}

function toggleSchedule() {
  const enabled = document.getElementById('sched-toggle').checked;
  const frequency = document.getElementById('sched-freq').value;
  updateSchedule(enabled, frequency);
}

function changeFrequency() {
  const frequency = document.getElementById('sched-freq').value;
  updateSchedule(true, frequency);
}

async function refresh() {
  listEl.innerHTML = '<div class="empty"><span class="spinner"></span> Loading...</div>';
  try {
    const res = await fetch('/api/backups');
    const backups = await res.json();
    if (backups.length === 0) {
      listEl.innerHTML = '<div class="empty">No backups yet. Create one above.</div>';
      return;
    }
    let html = '<table><thead><tr><th>File</th><th>Size</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
    for (const b of backups) {
      const date = localDate(b.date);
      html += '<tr>';
      html += '<td style="font-family:monospace;font-size:12px">' + esc(b.file) + '</td>';
      html += '<td>' + esc(b.sizeFormatted) + '</td>';
      html += '<td>' + esc(date) + '</td>';
      html += '<td>';
      html += '<button class="btn btn-sm" onclick="inspect(\\'' + esc(b.file) + '\\')">Details</button> ';
      html += '<button class="btn btn-sm btn-warn" onclick="confirmRestore(\\'' + esc(b.file) + '\\')">Restore</button> ';
      html += '<button class="btn btn-sm btn-danger" onclick="confirmDelete(\\'' + esc(b.file) + '\\')">Delete</button>';
      html += '</td></tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  } catch (e) {
    listEl.innerHTML = '<div class="empty">Error: ' + esc(e.message) + '</div>';
  }
}

async function createBackup() {
  log('Creating backup...');
  try {
    const res = await fetch('/api/backups', { method: 'POST' });
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    log('Backup created: ' + data.file);
    refresh();
  } catch (e) {
    log('Error: ' + e.message);
  }
}

async function importBackup(input) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  if (!file.name.endsWith('.tar.gz')) {
    log('Error: Only .tar.gz files can be imported');
    return;
  }
  log('Importing ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)...');
  try {
    const res = await fetch('/api/import?filename=' + encodeURIComponent(file.name), {
      method: 'POST',
      body: file
    });
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    log('Imported: ' + data.file + ' (' + (data.size / 1024).toFixed(1) + ' KB)');
    refresh();
  } catch (e) {
    log('Error: ' + e.message);
  }
}

function groupFiles(files) {
  const groups = {};
  for (const f of files) {
    const parts = f.split('/');
    const key = parts.length > 1 ? parts[0] : '(root)';
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  return groups;
}

function renderGroups(files) {
  const groups = groupFiles(files);
  const keys = Object.keys(groups).sort((a, b) => a === '(root)' ? -1 : b === '(root)' ? 1 : a.localeCompare(b));
  let html = '';
  for (const key of keys) {
    const items = groups[key];
    const label = key === '(root)' ? 'Root files' : key + '/';
    html += '<div class="group">';
    html += '<div class="group-header" onclick="this.classList.toggle(\\'open\\');this.nextElementSibling.classList.toggle(\\'open\\')">';
    html += '<span><span class="arrow">&#9654;</span> <span class="group-name">' + esc(label) + '</span><span class="group-count">(' + items.length + ')</span></span>';
    html += '</div>';
    html += '<div class="group-files">';
    for (const f of items) {
      html += esc(f) + '<br>';
    }
    html += '</div></div>';
  }
  return html;
}

async function inspect(file) {
  try {
    const res = await fetch('/api/backups/' + encodeURIComponent(file));
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    const m = data.manifest;
    let html = '<div style="font-size:13px;line-height:1.8;margin-bottom:12px">';
    html += '<b>Created:</b> ' + esc(m.createdAt) + '<br>';
    html += '<b>OpenClaw:</b> ' + esc(m.openclawVersion) + '<br>';
    html += '<b>Platform:</b> ' + esc(m.platform) + ' (' + esc(m.hostname) + ')<br>';
    html += '<b>Files:</b> ' + m.files + '<br>';
    html += '</div>';
    html += renderGroups(data.files);
    showModal('Backup Details: ' + file, html);
  } catch (e) {
    log('Error: ' + e.message);
  }
}

async function confirmRestore(file) {
  log('Previewing restore for ' + file + '...');
  try {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, dryRun: true })
    });
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    let html = '<p style="margin-bottom:12px">This will restore <b>' + data.files.length + '</b> files to ~/.openclaw/</p>';
    html += renderGroups(data.files);
    html += '<div class="actions" style="margin-top:16px;justify-content:flex-end">';
    html += '<button class="btn" onclick="closeModal()">Cancel</button> ';
    html += '<button class="btn btn-warn" onclick="doRestore(\\'' + esc(file) + '\\')">Confirm Restore</button>';
    html += '</div>';
    showModal('Restore: ' + file, html);
  } catch (e) {
    log('Error: ' + e.message);
  }
}

async function doRestore(file) {
  closeModal();
  log('Restoring ' + file + '...');
  try {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, dryRun: false })
    });
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    log('Restored ' + data.restored + ' files. Run: openclaw gateway restart');
  } catch (e) {
    log('Error: ' + e.message);
  }
}

async function confirmDelete(file) {
  if (!confirm('Delete ' + file + '? This cannot be undone.')) return;
  log('Deleting ' + file + '...');
  try {
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file })
    });
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    log('Deleted: ' + data.deleted);
    refresh();
  } catch (e) {
    log('Error: ' + e.message);
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

refresh();
loadSchedule();
</script>
</body>
</html>`;
}
