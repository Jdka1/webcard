// Memories board (view-only). Loads the photo list from the gated API and
// renders the grid; click a tile for the lightbox (arrows/keyboard/Escape).
(function () {
  const board = document.getElementById('board');
  let tiles = [];
  let items = [];
  let current = -1;
  let box = null;

  async function load() {
    const res = await fetch('/api/memories/photos');
    if (res.status === 401) { location.href = '/memories/login.html'; return; }
    const { photos } = await res.json();
    items = photos;
    if (!photos.length) {
      document.getElementById('board-empty').hidden = false;
      return;
    }
    for (const p of photos) {
      const fig = document.createElement('figure');
      fig.className = 'tile';
      const img = document.createElement('img');
      img.src = p.src;
      img.alt = [p.caption, p.loc].filter(Boolean).join(' · ') || 'memory';
      img.loading = 'lazy';
      const cap = document.createElement('figcaption');
      const em = document.createElement('em');
      em.textContent = p.caption || '';
      const loc = document.createElement('span');
      loc.className = 'tile-loc';
      loc.textContent = p.loc || '';
      cap.appendChild(em);
      cap.appendChild(loc);
      fig.appendChild(img);
      fig.appendChild(cap);
      board.appendChild(fig);
    }
    tiles = Array.from(document.querySelectorAll('.tile'));
    tiles.forEach((t, i) => t.addEventListener('click', () => open(i)));
  }

  function open(i) {
    current = i;
    close();
    const p = items[i];
    box = document.createElement('div');
    box.className = 'mem-lightbox';
    const big = document.createElement('img');
    big.src = p.src;
    big.alt = p.caption || 'memory';
    const c = document.createElement('div');
    c.className = 'mem-cap';
    c.textContent = [p.caption, p.loc].filter(Boolean).join('  ·  ');
    const mk = (cls, label, fn) => {
      const b = document.createElement('button');
      b.className = 'mem-lb-btn ' + cls;
      b.textContent = label;
      b.setAttribute('aria-label', cls.replace('mem-lb-', ''));
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    box.appendChild(big);
    box.appendChild(c);
    box.appendChild(mk('mem-lb-close', '×', close));
    box.appendChild(mk('mem-lb-prev', '←', () => step(-1)));
    box.appendChild(mk('mem-lb-next', '→', () => step(1)));
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.body.appendChild(box);
    document.addEventListener('keydown', onKey);
  }

  function step(d) { open((current + d + items.length) % items.length); }

  function close() {
    if (box) { box.remove(); box = null; }
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  load();
})();
