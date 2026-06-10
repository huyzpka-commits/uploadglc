const API = 'http://localhost:3000/api/files';
let currentFolder = '';
let currentItems = [];
let selectedFiles = [];
let viewMode = 'grid';

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  loadFiles();
  setupEvents();
  setupDragDrop();
});

/* Fetch helpers */
async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postForm(url, formData) {
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* Load files */
async function loadFiles(folder = currentFolder) {
  currentFolder = folder;
  try {
    const data = await get(`${API}/list?folder=${encodeURIComponent(folder)}`);
    currentItems = data.items || [];
    renderBreadcrumbs(folder);
    renderItems(currentItems);
    updateStorage();
  } catch (err) {
    console.error(err);
    showError('Failed to load files');
  }
}

/* Render */
function renderBreadcrumbs(folder) {
  const el = document.getElementById('breadcrumbs');
  const parts = folder ? folder.split('/') : [];
  let html = '<span class="crumb" data-path="">My Drive</span>';
  let path = '';
  parts.forEach((part, i) => {
    path = path ? `${path}/${part}` : part;
    html += `<span class="crumb" data-path="${path}">${part}</span>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.crumb').forEach(c => {
    c.addEventListener('click', () => loadFiles(c.dataset.path));
  });
}

function renderItems(items) {
  const el = document.getElementById('itemsContainer');
  document.getElementById('itemCount').textContent = `${items.length} items`;

  if (items.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="icon">📂</div>
        <p>This folder is empty</p>
      </div>`;
    return;
  }

  el.innerHTML = items.map(item => {
    const icon = getFileIcon(item.name, item.type);
    const size = item.type === 'file' ? formatSize(item.size) : '';
    const date = item.modified ? new Date(item.modified).toLocaleDateString() : '';

    return `
      <div class="item ${selectedFiles.includes(item.path) ? 'selected' : ''}" 
           data-type="${item.type}" data-path="${item.path}" data-name="${item.name}">
        <div class="item-icon">${icon}</div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-meta">${size} ${date}</div>
        </div>
        <div class="item-actions">
          ${item.type === 'file' ? `<button class="action-btn" onclick="downloadFile('${item.path}')" title="Download">⬇</button>` : ''}
          <button class="action-btn" onclick="renameItem('${item.path}', '${item.name}')" title="Rename">✎</button>
          <button class="action-btn" onclick="deleteItem('${item.path}', '${item.type}')" title="Delete" style="color:var(--danger)">🗑</button>
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.item-actions')) return;
      const type = item.dataset.type;
      const path = item.dataset.path;
      if (type === 'folder') {
        loadFiles(path);
      } else {
        openPreview(path, item.dataset.name);
      }
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, item.dataset.path, item.dataset.type, item.dataset.name);
    });
  });
}

function getFileIcon(name, type) {
  if (type === 'folder') return '📁';
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼',
    mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬',
    mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵',
    pdf: '📄', doc: '📝', docx: '📝', txt: '📝', md: '📝',
    zip: '📦', rar: '📦', '7z': '📦', tar: '📦',
    js: '📜', ts: '📜', html: '📜', css: '📜', json: '📜', py: '📜',
    exe: '⚙', dmg: '⚙', msi: '⚙'
  };
  return map[ext] || '📄';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* View */
function setView(mode) {
  viewMode = mode;
  document.getElementById('itemsContainer').dataset.view = mode;
  document.querySelectorAll('.view-toggle .icon-btn').forEach(b => b.classList.toggle('active', false));
  event.target.classList.add('active');
}

/* Upload */
function openUploadModal() {
  selectedFiles = [];
  document.getElementById('uploadList').innerHTML = '';
  document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('active');
}

function openFolderModal() {
  document.getElementById('folderName').value = '';
  document.getElementById('folderModal').classList.add('active');
}

function closeFolderModal() {
  document.getElementById('folderModal').classList.remove('active');
}

function setupEvents() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    selectedFiles = Array.from(fileInput.files);
    renderUploadList();
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = currentItems.filter(i => i.name.toLowerCase().includes(q));
    renderItems(filtered);
  });
}

function setupDragDrop() {
  const dropzone = document.getElementById('dropzone');
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    dropzone.addEventListener(e, (ev) => { ev.preventDefault(); ev.stopPropagation(); });
  });
  dropzone.addEventListener('dragover', () => dropzone.classList.add('dragover'));
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    dropzone.classList.remove('dragover');
    selectedFiles = Array.from(e.dataTransfer.files);
    renderUploadList();
  });
}

function renderUploadList() {
  const el = document.getElementById('uploadList');
  el.innerHTML = selectedFiles.map(f => `
    <div class="file-chip">
      <span>${f.name}</span>
      <span style="color:var(--text-light)">${formatSize(f.size)}</span>
    </div>
  `).join('');
}

async function uploadFiles() {
  if (selectedFiles.length === 0) return;
  const fd = new FormData();
  selectedFiles.forEach(f => fd.append('files', f));
  fd.append('folder', currentFolder);
  try {
    await postForm(`${API}/upload`, fd);
    closeUploadModal();
    loadFiles();
  } catch (err) {
    showError('Upload failed: ' + err.message);
  }
}

async function createFolder() {
  const name = document.getElementById('folderName').value.trim();
  if (!name) return;
  try {
    await post(`${API}/folder`, { folderName: name, parent: currentFolder });
    closeFolderModal();
    loadFiles();
  } catch (err) {
    showError('Create folder failed: ' + err.message);
  }
}

/* File operations */
function downloadFile(path) {
  window.open(`${API}/download?path=${encodeURIComponent(path)}`, '_blank');
}

async function deleteItem(path, type) {
  if (!confirm(`Delete this ${type}?`)) return;
  try {
    await post(`${API}/delete`, { targetPath: path });
    loadFiles();
  } catch (err) {
    showError('Delete failed: ' + err.message);
  }
}

async function renameItem(path, oldName) {
  const newName = prompt('New name:', oldName);
  if (!newName || newName === oldName) return;
  try {
    await post(`${API}/rename`, { targetPath: path, newName });
    loadFiles();
  } catch (err) {
    showError('Rename failed: ' + err.message);
  }
}

/* Preview */
async function openPreview(path, name) {
  const ext = name.split('.').pop().toLowerCase();
  const url = `/uploads/${path}`;
  const body = document.getElementById('previewBody');
  document.getElementById('previewTitle').textContent = name;

  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) {
    body.innerHTML = `<img src="${url}" alt="${name}">`;
  } else if (['mp4','mkv','avi','mov'].includes(ext)) {
    body.innerHTML = `<video src="${url}" controls autoplay></video>`;
  } else if (['mp3','wav','ogg','flac'].includes(ext)) {
    body.innerHTML = `<audio src="${url}" controls autoplay></audio>`;
  } else if (['txt','md','js','ts','html','css','json','py','csv','log'].includes(ext)) {
    try {
      const text = await fetch(url).then(r => r.text());
      body.innerHTML = `<pre><code>${escapeHtml(text)}</code></pre>`;
    } catch {
      body.innerHTML = '<p>Cannot preview this file</p>';
    }
  } else {
    body.innerHTML = `<p>Preview not available for this file type.<br><a href="${url}" download>Download</a></p>`;
  }

  document.getElementById('previewModal').classList.add('active');
}

function closePreview() {
  document.getElementById('previewModal').classList.remove('active');
  document.getElementById('previewBody').innerHTML = '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* Context menu */
function showContextMenu(e, path, type, name) {
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';

  menu.innerHTML = `
    <div class="context-menu-item" onclick="loadFiles('${path}')">📂 Open</div>
    ${type === 'file' ? `<div class="context-menu-item" onclick="downloadFile('${path}')">⬇ Download</div>` : ''}
    <div class="context-menu-item" onclick="renameItem('${path}', '${name}')">✎ Rename</div>
    <div class="context-menu-sep"></div>
    <div class="context-menu-item" onclick="deleteItem('${path}', '${type}')" style="color:var(--danger)">🗑 Delete</div>
  `;

  document.body.appendChild(menu);
  const close = () => menu.remove();
  document.addEventListener('click', close, { once: true });
}

/* Storage */
async function updateStorage() {
  try {
    const data = await get(`${API}/tree`);
    let total = 0;
    function sum(items) {
      items.forEach(i => {
        if (i.type === 'file') total += i.size || 0;
        if (i.children) sum(i.children);
      });
    }
    sum(data.tree || []);
    const pct = Math.min((total / (1024 * 1024 * 1024)) * 100, 100); // Assume 1GB max for demo
    document.getElementById('storageBar').style.width = pct + '%';
    document.getElementById('storageText').textContent = `${formatSize(total)} used`;
  } catch (err) {
    document.getElementById('storageText').textContent = 'Unable to calculate';
  }
}

function showError(msg) {
  alert(msg); // Simple fallback; could be a toast
}

/* Keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeUploadModal();
    closeFolderModal();
    closePreview();
  }
});
