// Owner admin screen: manage people (add/revoke/remove) and photos
// (upload/caption/reorder/delete). All actions hit owner-only APIs; a
// signed owner session is required or the APIs return 401/403.
(function () {
  const peopleList = document.getElementById('people-list');
  const photoList = document.getElementById('photo-list');
  const note = (el, msg) => { el.textContent = msg; el.hidden = !msg; };

  async function api(path, method, body, raw) {
    const opts = { method, headers: {} };
    if (raw) { opts.body = body; }
    else if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(path, opts);
    if (res.status === 401 || res.status === 403) { location.href = '/memories/login.html'; throw new Error('auth'); }
    return res;
  }

  // ---------- people ----------

  async function loadPeople() {
    const res = await api('/api/memories/admin/users', 'GET');
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
        await api('/api/memories/admin/users', 'PATCH', { username: p.username, active: !p.active });
        loadPeople();
      });
      const del = document.createElement('button');
      del.textContent = 'remove';
      del.addEventListener('click', async () => {
        if (!confirm(`remove ${p.username} entirely?`)) return;
        await api('/api/memories/admin/users', 'DELETE', { username: p.username });
        loadPeople();
      });
      li.appendChild(btn);
      li.appendChild(del);
      peopleList.appendChild(li);
    }
  }

  document.getElementById('gen-pass').addEventListener('click', () => {
    const words = ['fog', 'granite', 'river', 'pine', 'comet', 'ember', 'meadow', 'tide', 'summit', 'dusk'];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    document.getElementById('new-pass').value = `${pick()}-${pick()}-${Math.floor(100 + Math.random() * 900)}`;
  });

  document.getElementById('add-person').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-name').value.trim();
    const password = document.getElementById('new-pass').value;
    const res = await api('/api/memories/admin/users', 'POST', { username, password });
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

  // ---------- photos ----------

  async function loadPhotos() {
    const res = await api('/api/memories/photos', 'GET');
    const { photos } = await res.json();
    photoList.innerHTML = '';
    if (!photos.length) {
      photoList.innerHTML = '<li class="empty">no photos yet.</li>';
      return;
    }
    photos.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'admin-photo';
      li.innerHTML = `
        <img src="${p.src}" alt="" loading="lazy" />
        <input class="cap" type="text" placeholder="caption" />
        <input class="loc" type="text" placeholder="place" />
        <div class="row-btns">
          <button data-a="save">save</button>
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
          await api('/api/memories/admin/photos', 'PATCH', { id: p.id, caption: li.querySelector('.cap').value, loc: li.querySelector('.loc').value });
        } else if (a === 'up' || a === 'down') {
          await api('/api/memories/admin/photos', 'PATCH', { id: p.id, direction: a });
          loadPhotos();
        } else if (a === 'del') {
          if (!confirm('delete this photo?')) return;
          await api('/api/memories/admin/photos', 'DELETE', { id: p.id });
          loadPhotos();
        }
      });
      photoList.appendChild(li);
    });
  }

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = document.getElementById('photo-file').files;
    const el = document.getElementById('upload-note');
    if (!files.length) return;
    let ok = 0;
    let failed = 0;
    for (const f of files) {
      if (f.size > 4.4 * 1024 * 1024) { failed++; continue; }
      const res = await api('/api/memories/admin/upload', 'POST', f, true);
      res.ok ? ok++ : failed++;
    }
    note(el, `uploaded ${ok}${failed ? `, ${failed} skipped (over the size limit)` : ''}`);
    document.getElementById('photo-file').value = '';
    loadPhotos();
  });

  loadPeople();
  loadPhotos();
})();
