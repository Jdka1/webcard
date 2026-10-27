// Memories board lightbox. Click a tile to expand; arrows / keyboard to move;
// click outside the image or Escape to close. View-only board, no upload UI.
(function () {
  const tiles = Array.from(document.querySelectorAll('.tile'));
  let current = -1;
  let box = null;

  function open(i) {
    current = i;
    close();
    const img = tiles[i].querySelector('img');
    const cap = tiles[i].querySelector('figcaption');

    box = document.createElement('div');
    box.className = 'mem-lightbox';

    const big = document.createElement('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;

    const c = document.createElement('div');
    c.className = 'mem-cap';
    const em = cap && cap.querySelector('em');
    const loc = cap && cap.querySelector('.tile-loc');
    c.textContent = [em && em.textContent.trim(), loc && loc.textContent.trim()]
      .filter(Boolean).join('  \u00b7  ');

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

  function step(d) { open((current + d + tiles.length) % tiles.length); }

  function close() {
    if (box) { box.remove(); box = null; }
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  tiles.forEach((t, i) => t.addEventListener('click', () => open(i)));
})();
