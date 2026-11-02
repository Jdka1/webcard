// Owner admin screen: manage people (add/revoke/remove) and photos
// (upload/caption/reorder/delete). All actions hit owner-only APIs; a
// signed owner session is required or the APIs return 401/403.
(function () {
  const API = window.BOARD_API || '/api/memories';
  const LOGIN = '/instagram/login.html';
  const peopleList = document.getElementById('people-list');
  const photoList = document.getElementById('photo-list');
  const note = (el, msg) => { el.textContent = msg; el.hidden = !msg; };

  async function api(path, method, body, raw) {
    const opts = { method, headers: {} };
    if (raw) { opts.body = body; }
    else if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(path, opts);
    if (res.status === 401 || res.status === 403) { location.href = LOGIN + '?next=' + encodeURIComponent(location.pathname); throw new Error('auth'); }
    return res;
  }

  // ---------- people ----------

  async function loadPeople() {
    const res = await api(API + '/admin/users', 'GET');
    const { people } = await res.json();
    peopleList.innerHTML = '';
    if (!people.length) {
      peopleList.innerHTML = '<li class="empty">nobody yet - only you can see the board.</li>';
      return;
    }
    for (const p of people) {
      const li = document.createElement('li');
      const date = new Date(p.created).toLocaleDateString();
      li.innerHTML = `<span class="p-name"></span> <span class="p-meta">added ${date}${p.active ? '' : ' · revoked'}</span>`;
      li.querySelector('.p-name').textContent = p.username;
      const btn = document.createElement('button');
      btn.textContent = p.active ? 'revoke' : 'restore';
      btn.addEventListener('click', async () => {
        await api(API + '/admin/users', 'PATCH', { username: p.username, active: !p.active });
        loadPeople();
      });
      const del = document.createElement('button');
      del.textContent = 'remove';
      del.addEventListener('click', async () => {
        if (!confirm(`remove ${p.username} entirely?`)) return;
        await api(API + '/admin/users', 'DELETE', { username: p.username });
        loadPeople();
      });
      li.appendChild(btn);
      li.appendChild(del);
      peopleList.appendChild(li);
    }
  }

  if (peopleList) {
    wirePeople();
  }

  function wirePeople() {
  document.getElementById('gen-pass').addEventListener('click', () => {
    const words = ['fog', 'granite', 'river', 'pine', 'comet', 'ember', 'meadow', 'tide', 'summit', 'dusk'];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    document.getElementById('new-pass').value = `${pick()}-${pick()}-${Math.floor(100 + Math.random() * 900)}`;
  });

  document.getElementById('add-person').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-name').value.trim();
    const password = document.getElementById('new-pass').value;
    const res = await api(API + '/admin/users', 'POST', { username, password });
    const el = document.getElementById('new-person-note');
    if (res.ok) {
      note(el, `added ${username} - pass them the password yourself, it is not stored readable and won't be shown again: ${password}`);
      document.getElementById('new-name').value = '';
      document.getElementById('new-pass').value = '';
      loadPeople();
    } else {
      note(el, (await res.json()).error || 'failed');
    }
  });
  }

  // ---------- photos ----------

  async function loadPhotos() {
    const res = await api(API + '/photos', 'GET');
    const { photos } = await res.json();
    photoList.innerHTML = '';
    if (!photos.length) {
      photoList.innerHTML = '<li class="empty">no photos yet.</li>';
      return;
    }
    photos.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'admin-photo' + (p.featured ? ' is-featured' : '');
      li.dataset.id = p.id;
      li.draggable = true;
      const thumb = p.kind === 'video'
        ? `<video src="${p.src}" muted loop playsinline preload="metadata"></video>`
        : `<img src="${p.src}" alt="" loading="lazy" />`;
      li.innerHTML = `
        ${thumb}
        <input class="cap" type="text" placeholder="caption" />
        <input class="loc" type="text" placeholder="place" />
        <div class="row-btns">
          <button data-a="save">save</button>
          <button data-a="feature">${p.featured ? 'unfeature' : 'feature'}</button>
          <button data-a="up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button data-a="down" ${i === photos.length - 1 ? 'disabled' : ''}>↓</button>
          <button data-a="del" class="danger">delete</button>
        </div>`;
      li.querySelector('.cap').value = p.caption || '';
      li.querySelector('.loc').value = p.loc || '';
      li.querySelector('.row-btns').addEventListener('click', async (e) => {
        const a = e.target.dataset.a;
        if (!a) return;
        if (a === 'save') {
          await api(API + '/admin/photos', 'PATCH', { id: p.id, caption: li.querySelector('.cap').value, loc: li.querySelector('.loc').value });
        } else if (a === 'feature') {
          await api(API + '/admin/photos', 'PATCH', { id: p.id, featured: !p.featured });
          loadPhotos();
        } else if (a === 'up' || a === 'down') {
          await api(API + '/admin/photos', 'PATCH', { id: p.id, direction: a });
          loadPhotos();
        } else if (a === 'del') {
          if (!confirm('delete this photo?')) return;
          await api(API + '/admin/photos', 'DELETE', { id: p.id });
          loadPhotos();
        }
      });
      photoList.appendChild(li);
    });
  }

  // Drag a photo row onto another to reorder; the new order is saved whole.
  let dragId = null;
  photoList.addEventListener('dragstart', (e) => {
    const li = e.target.closest('li.admin-photo');
    if (!li) return;
    dragId = li.dataset.id;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch { /* noop */ }
  });
  photoList.addEventListener('dragend', () => {
    dragId = null;
    photoList.querySelectorAll('.dragging, .drag-over').forEach((x) => x.classList.remove('dragging', 'drag-over'));
  });
  photoList.addEventListener('dragover', (e) => {
    if (!dragId) return;
    e.preventDefault();
    const li = e.target.closest('li.admin-photo');
    photoList.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over'));
    if (li && li.dataset.id !== dragId) li.classList.add('drag-over');
  });
  photoList.addEventListener('drop', async (e) => {
    if (!dragId) return;
    e.preventDefault();
    const target = e.target.closest('li.admin-photo');
    const ids = Array.from(photoList.querySelectorAll('li.admin-photo')).map((x) => x.dataset.id);
    const from = ids.indexOf(dragId);
    const to = target ? ids.indexOf(target.dataset.id) : ids.length - 1;
    dragId = null;
    photoList.querySelectorAll('.dragging, .drag-over').forEach((x) => x.classList.remove('dragging', 'drag-over'));
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    await api(API + '/admin/photos', 'PATCH', { order: ids });
    loadPhotos();
  });

  // ---------- upload ----------

  const LIMIT = 4.4 * 1024 * 1024; // host request-body cap, with margin
  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('photo-file');

  // Convert HEIC and shrink anything over the host limit so Photos-app
  // shots (Mac drag or phone library) upload without manual resizing.
  async function prepFile(file) {
    let f = file;
    if (f.type.startsWith('video/')) return f; // videos upload as-is, client-direct
    if (/image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) {
      if (!window.heic2any) return null;
      try {
        const out = await window.heic2any({ blob: f, toType: 'image/jpeg', quality: 0.9 });
        const blob = Array.isArray(out) ? out[0] : out;
        f = new File([blob], f.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      } catch {
        return null;
      }
    }
    if (f.size <= LIMIT) return f;
    try {
      const bmp = await createImageBitmap(f);
      let scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
      for (let attempt = 0; attempt < 4 && f.size > LIMIT; attempt++) {
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86 - attempt * 0.12));
        if (!blob) break;
        f = new File([blob], f.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        scale *= 0.75;
      }
      if (bmp.close) bmp.close();
      return f.size <= LIMIT ? f : null;
    } catch {
      return null;
    }
  }

  // Videos and oversized files go straight from the browser to the private
  // blob store (token from the owner-only endpoint), then get registered.
  async function clientUpload(f) {
    let upload;
    try {
      ({ upload } = await import('https://esm.sh/@vercel/blob@2.8.2/client'));
    } catch {
      try {
        ({ upload } = await import('https://cdn.jsdelivr.net/npm/@vercel/blob@2.8.2/client/+esm'));
      } catch {
        return false;
      }
    }
    try {
      const blob = await upload(f.name, f, {
        access: 'private',
        handleUploadUrl: API + '/admin/upload',
      });
      const res = await api(API + '/admin/upload', 'POST', {
        action: 'register',
        path: blob.pathname,
        url: blob.url,
        contentType: blob.contentType || f.type,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function processFiles(files) {
    const el = document.getElementById('upload-note');
    let ok = 0;
    let skipped = 0;
    note(el, files.length > 1 ? `preparing ${files.length} item${files.length > 1 ? 's' : ''}…` : 'preparing…');
    for (let i = 0; i < files.length; i++) {
      note(el, `uploading ${i + 1} of ${files.length}…`);
      const f = await prepFile(files[i]);
      if (!f) { skipped++; continue; }
      if (f.type.startsWith('video/') || f.size > LIMIT) {
        const done = await clientUpload(f);
        if (done) ok++; else skipped++;
        continue;
      }
      const res = await api(API + '/admin/upload', 'POST', f, true);
      if (res.ok) ok++; else skipped++;
    }
    note(el, `uploaded ${ok}${skipped ? `, ${skipped} skipped (couldn't convert or upload)` : ''}`);
    loadPhotos();
  }

  const isMediaFile = (f) => f.type.startsWith('image/') || f.type.startsWith('video/') || /\.hei[cf]$/i.test(f.name);

  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      dz.classList.add('drag-over');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('drag-over');
    })
  );
  dz.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(isMediaFile);
    if (files.length) processFiles(files);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) processFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });
  // Paste a copied photo (e.g. copy in Photos/Preview, Cmd+V here).
  document.addEventListener('paste', (e) => {
    if (e.target.closest('input, textarea')) return;
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []).filter(isMediaFile);
    if (files.length) {
      e.preventDefault();
      processFiles(files);
    }
  });

  document.getElementById('upload-form').addEventListener('submit', (e) => e.preventDefault());

  if (peopleList) loadPeople();
  loadPhotos();
})();
