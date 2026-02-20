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
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; padding: 10px 12px; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 500; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid #21262d; font-size: 13px; }
  tr:hover td { background: #161b22; }
  .level { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
  .level-config { background: #1f3d2b; color: #56d364; }
  .level-full { background: #1c2d4f; color: #58a6ff; }
  .level-sessions { background: #3d2b1f; color: #d29922; }
  .log { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin-top: 16px; font-family: monospace; font-size: 12px; line-height: 1.6; max-height: 300px; overflow-y: auto; white-space: pre-wrap; }
  .log:empty { display: none; }
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center; }
  .modal-overlay.show { display: flex; }
  .modal { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
  .modal h2 { font-size: 16px; margin-bottom: 16px; }
  .modal .file-list { font-family: monospace; font-size: 11px; line-height: 1.8; color: #8b949e; max-height: 300px; overflow-y: auto; margin: 12px 0; }
  .modal .actions { margin-top: 16px; justify-content: flex-end; }
  .empty { text-align: center; padding: 48px; color: #8b949e; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #30363d; border-top-color: #58a6ff; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="container">
  <h1><span>OpenClaw</span> Backup</h1>
  <p class="subtitle">Backup and restore dashboard</p>

  <div class="actions">
    <button class="btn btn-primary" onclick="createBackup('config')">Backup Config</button>
    <button class="btn btn-primary" onclick="createBackup('full')">Backup Full</button>
    <button class="btn btn-primary" onclick="createBackup('sessions')">Backup + Sessions</button>
    <button class="btn" onclick="refresh()">Refresh</button>
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

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function showModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').classList.add('show');
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
    let html = '<table><thead><tr><th>File</th><th>Level</th><th>Size</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
    for (const b of backups) {
      const date = b.date.replace('T', ' ').slice(0, 19);
      const levelClass = 'level-' + b.level;
      html += '<tr>';
      html += '<td style="font-family:monospace;font-size:12px">' + esc(b.file) + '</td>';
      html += '<td><span class="level ' + levelClass + '">' + esc(b.level) + '</span></td>';
      html += '<td>' + esc(b.sizeFormatted) + '</td>';
      html += '<td>' + esc(date) + '</td>';
      html += '<td>';
      html += '<button class="btn btn-sm" onclick="inspect(\\'' + esc(b.file) + '\\')">Details</button> ';
      html += '<button class="btn btn-sm btn-warn" onclick="confirmRestore(\\'' + esc(b.file) + '\\')">Restore</button>';
      html += '</td></tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  } catch (e) {
    listEl.innerHTML = '<div class="empty">Error: ' + esc(e.message) + '</div>';
  }
}

async function createBackup(level) {
  log('Creating ' + level + ' backup...');
  try {
    const res = await fetch('/api/backups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level })
    });
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    log('Backup created: ' + data.file);
    refresh();
  } catch (e) {
    log('Error: ' + e.message);
  }
}

async function inspect(file) {
  try {
    const res = await fetch('/api/backups/' + encodeURIComponent(file));
    const data = await res.json();
    if (data.error) { log('Error: ' + data.error); return; }
    const m = data.manifest;
    let html = '<div style="font-size:13px;line-height:1.8;margin-bottom:12px">';
    html += '<b>Level:</b> ' + esc(m.level) + '<br>';
    html += '<b>Created:</b> ' + esc(m.createdAt) + '<br>';
    html += '<b>OpenClaw:</b> ' + esc(m.openclawVersion) + '<br>';
    html += '<b>Platform:</b> ' + esc(m.platform) + ' (' + esc(m.hostname) + ')<br>';
    html += '<b>Files:</b> ' + m.files + '<br>';
    html += '</div>';
    html += '<div class="file-list">' + data.files.map(f => esc(f)).join('<br>') + '</div>';
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
    html += '<div class="file-list">' + data.files.map(f => esc(f)).join('<br>') + '</div>';
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

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

refresh();
</script>
</body>
</html>`;
}
