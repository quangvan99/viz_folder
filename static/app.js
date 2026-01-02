/**
 * FolderTree - JavaScript Application
 * Tree navigation with lazy loading and file preview
 */

// === Constants ===
const ICONS = {
    directory: '📁',
    text: '📄',
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    archive: '📦',
    document: '📋',
    code: '💻',
    unknown: '❓'
};

const MIME_CATEGORIES = {
    'image/': 'image',
    'video/': 'video',
    'audio/': 'audio',
    'text/': 'text',
    'application/json': 'text',
    'application/javascript': 'code',
    'application/x-python': 'code',
    'application/x-sh': 'code',
    'application/xml': 'text',
    'application/zip': 'archive',
    'application/x-tar': 'archive',
    'application/gzip': 'archive',
    'application/pdf': 'document',
    'application/msword': 'document',
    'application/vnd.openxmlformats': 'document'
};

const MAX_TEXT_SIZE = 1024 * 1024; // 1MB limit for text preview

// === State ===
let currentPath = '';
let selectedElement = null;

// === DOM Elements ===
const treeRoot = document.getElementById('tree-root');
const previewPanel = document.getElementById('preview-panel');
const statusBar = document.getElementById('status-bar');
const breadcrumb = document.getElementById('breadcrumb');
const themeToggle = document.getElementById('theme-toggle');
const refreshBtn = document.getElementById('refresh-btn');

// === Utility Functions ===

function getIcon(item) {
    if (item.type === 'directory') return ICONS.directory;

    const mime = item.mime || '';
    for (const [prefix, category] of Object.entries(MIME_CATEGORIES)) {
        if (mime.startsWith(prefix) || mime === prefix) {
            return ICONS[category] || ICONS.text;
        }
    }
    return ICONS.unknown;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

function setStatus(msg) {
    statusBar.textContent = msg;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isTextMime(mime) {
    const textMimes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/x-python',
        'application/x-sh',
        'application/x-yaml'
    ];
    return textMimes.some(t => mime.startsWith(t) || mime === t);
}

// === API Functions ===

async function fetchTree(path = '') {
    const url = `/api/tree?path=${encodeURIComponent(path)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    return res.json();
}

// === Tree Rendering ===

function createTreeItem(item, parentPath) {
    const li = document.createElement('li');
    const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    const div = document.createElement('div');
    div.className = 'tree-item';
    div.dataset.path = fullPath;
    div.dataset.type = item.type;
    div.dataset.mime = item.mime || '';
    div.dataset.size = item.size || 0;
    div.dataset.modified = item.modified || 0;

    div.innerHTML = `
        <span class="toggle"></span>
        <span class="icon">${getIcon(item)}</span>
        <span class="name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
    `;

    if (item.type === 'directory') {
        div.dataset.loaded = 'false';
        const childUl = document.createElement('ul');
        childUl.style.display = 'none';
        li.appendChild(div);
        li.appendChild(childUl);

        div.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFolder(div, childUl, fullPath);
        });
    } else {
        li.appendChild(div);
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            selectFile(div, item, fullPath);
        });
    }

    return li;
}

async function toggleFolder(div, childUl, path) {
    const isExpanded = div.classList.contains('expanded');

    if (isExpanded) {
        div.classList.remove('expanded');
        childUl.style.display = 'none';
    } else {
        // Lazy load on first expand
        if (div.dataset.loaded === 'false') {
            div.dataset.loaded = 'loading';
            div.classList.add('loading');
            setStatus('Loading...');

            try {
                const data = await fetchTree(path);
                childUl.innerHTML = '';

                if (data.children.length === 0) {
                    const emptyLi = document.createElement('li');
                    emptyLi.innerHTML = '<div class="tree-item" style="color: var(--text-secondary); font-style: italic;"><span class="toggle"></span><span class="icon">📭</span><span class="name">(empty)</span></div>';
                    childUl.appendChild(emptyLi);
                } else {
                    data.children.forEach(child => {
                        childUl.appendChild(createTreeItem(child, path));
                    });
                }

                div.dataset.loaded = 'true';
                setStatus(`Loaded ${data.children.length} items`);
            } catch (e) {
                setStatus(`Error: ${e.message}`);
                div.dataset.loaded = 'false';
                div.classList.remove('loading');
                return;
            }

            div.classList.remove('loading');
        }

        div.classList.add('expanded');
        childUl.style.display = 'block';
    }
}

function selectFile(div, item, path) {
    if (selectedElement) {
        selectedElement.classList.remove('selected');
    }
    div.classList.add('selected');
    selectedElement = div;

    // Update breadcrumb
    breadcrumb.innerHTML = `<span class="path">/${escapeHtml(path)}</span>`;

    // Render preview
    renderPreview(item, path);
}

// === Preview Rendering ===

function renderPreview(item, path) {
    const mime = item.mime || '';

    if (mime.startsWith('image/')) {
        renderImagePreview(path, item);
    } else if (mime.startsWith('video/')) {
        renderVideoPreview(path, item);
    } else if (mime.startsWith('audio/')) {
        renderAudioPreview(path, item);
    } else if (isTextMime(mime)) {
        renderTextPreview(path, item);
    } else {
        renderFileInfo(item, path);
    }
}

function renderImagePreview(path, item) {
    previewPanel.innerHTML = `
        <div class="preview-container">
            <img
                src="/api/file?path=${encodeURIComponent(path)}"
                alt="${escapeHtml(item.name)}"
                class="preview-image"
                loading="lazy"
            >
            <div class="preview-meta">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${formatSize(item.size)}</span>
            </div>
        </div>
    `;
}

function renderVideoPreview(path, item) {
    previewPanel.innerHTML = `
        <div class="preview-container">
            <video
                src="/api/file?path=${encodeURIComponent(path)}"
                class="preview-video"
                controls
                preload="metadata"
            >
                Your browser does not support video playback.
            </video>
            <div class="preview-meta">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${formatSize(item.size)}</span>
            </div>
        </div>
    `;
}

function renderAudioPreview(path, item) {
    previewPanel.innerHTML = `
        <div class="file-info">
            <div class="icon">🎵</div>
            <div class="name">${escapeHtml(item.name)}</div>
            <audio
                src="/api/file?path=${encodeURIComponent(path)}"
                controls
                preload="metadata"
                style="margin: 1rem 0;"
            >
                Your browser does not support audio playback.
            </audio>
            <div class="meta">
                <div>Size: ${formatSize(item.size)}</div>
                <div>Type: ${item.mime}</div>
            </div>
        </div>
    `;
}

async function renderTextPreview(path, item) {
    if (item.size > MAX_TEXT_SIZE) {
        previewPanel.innerHTML = `
            <div class="file-info">
                <div class="icon">📄</div>
                <div class="name">${escapeHtml(item.name)}</div>
                <div class="meta">File too large to preview (${formatSize(item.size)})</div>
                <a href="/api/file?path=${encodeURIComponent(path)}"
                   class="download-btn" download>⬇️ Download</a>
            </div>
        `;
        return;
    }

    setStatus('Loading file...');
    previewPanel.innerHTML = '<div class="preview-placeholder"><div class="placeholder-icon">⏳</div><div class="placeholder-text">Loading...</div></div>';

    try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
        const text = await res.text();
        const lines = text.split('\n');

        const lineHtml = lines.map((line, i) => `
            <div class="line">
                <span class="line-number">${i + 1}</span>
                <span class="line-content">${escapeHtml(line)}</span>
            </div>
        `).join('');

        previewPanel.innerHTML = `
            <div class="preview-text-wrapper">
                <div class="preview-header">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${lines.length} lines | ${formatSize(item.size)}</span>
                </div>
                <div class="preview-text">${lineHtml}</div>
            </div>
        `;

        setStatus('Ready');
    } catch (e) {
        previewPanel.innerHTML = `<div class="error">Error loading file: ${e.message}</div>`;
        setStatus('Error');
    }
}

function renderFileInfo(item, path) {
    previewPanel.innerHTML = `
        <div class="file-info">
            <div class="icon">${getIcon(item)}</div>
            <div class="name">${escapeHtml(item.name)}</div>
            <div class="meta">
                <div>Size: ${formatSize(item.size)}</div>
                <div>Type: ${item.mime || 'Unknown'}</div>
                <div>Modified: ${formatDate(item.modified)}</div>
            </div>
            <a href="/api/file?path=${encodeURIComponent(path)}"
               class="download-btn" download="${escapeHtml(item.name)}">
                ⬇️ Download
            </a>
        </div>
    `;
}

// === Initialization ===

async function initTree() {
    setStatus('Loading root...');

    try {
        const data = await fetchTree('');
        treeRoot.innerHTML = '';

        if (data.children.length === 0) {
            treeRoot.innerHTML = '<li><div class="tree-item" style="color: var(--text-secondary);"><span class="toggle"></span><span class="icon">📭</span><span class="name">(empty directory)</span></div></li>';
        } else {
            data.children.forEach(child => {
                treeRoot.appendChild(createTreeItem(child, ''));
            });
        }

        setStatus(`Ready - ${data.children.length} items`);
    } catch (e) {
        setStatus(`Error: ${e.message}`);
        treeRoot.innerHTML = `<li><div class="error">Failed to load: ${e.message}</div></li>`;
    }
}

// === Theme Toggle ===

function initTheme() {
    const savedTheme = localStorage.getItem('foldertree-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('foldertree-theme', isDark ? 'dark' : 'light');
});

// === Refresh Button ===

refreshBtn.addEventListener('click', () => {
    // Reset state
    selectedElement = null;
    breadcrumb.innerHTML = '<span class="path">/</span>';
    previewPanel.innerHTML = '<div class="preview-placeholder"><div class="placeholder-icon">📄</div><div class="placeholder-text">Select a file to preview</div></div>';

    // Reload tree
    initTree();
});

// === Keyboard Navigation ===

document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        refreshBtn.click();
    }
});

// === Start Application ===

// === Hash Router ===

const pages = {
    dashboard: document.getElementById('page-dashboard'),
    files: document.getElementById('page-files')
};
const navTabs = document.querySelectorAll('.nav-tab');

function getPageFromHash() {
    const hash = window.location.hash.slice(1); // Remove #
    return pages[hash] ? hash : 'files';
}

function showPage(pageName) {
    // Update pages visibility
    Object.entries(pages).forEach(([name, el]) => {
        if (el) el.hidden = (name !== pageName);
    });

    // Update nav tabs
    navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.page === pageName);
    });

    // Initialize dashboard on first visit
    if (pageName === 'dashboard' && window.initDashboard) {
        window.initDashboard();
    }
}

function initRouter() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
        showPage(getPageFromHash());
    });

    // Handle initial load
    showPage(getPageFromHash());
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTree();
    initRouter();
});
