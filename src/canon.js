const itemContainer = document.querySelector('#canon-items');
const controls = [...document.querySelectorAll('[data-layout]')];

const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

function render(items, layout) {
  itemContainer.dataset.layout = layout;
  itemContainer.innerHTML = items.map((item, index) => {
    const title = escapeHtml(item.title);
    const creator = escapeHtml(item.creator);
    const note = escapeHtml(item.note);
    const meta = [creator, item.year].filter(Boolean).join(' · ');
    const heading = item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${title}<span aria-hidden="true"> ↗</span></a>`
      : title;
    return `<article class="canon-item">
      <p class="canon-number">${String(index + 1).padStart(2, '0')}</p>
      <p class="canon-type">${escapeHtml(item.type)}</p>
      <h2>${heading}</h2>
      <p class="canon-meta">${meta}</p>
      <p class="canon-note">${note}</p>
    </article>`;
  }).join('');
}

try {
  const response = await fetch('/data/canon.json');
  if (!response.ok) throw new Error('Canon data was unavailable');
  const canon = await response.json();
  let activeLayout = canon.layout || 'index';
  const setLayout = (layout) => {
    activeLayout = layout;
    render(canon.items, activeLayout);
    controls.forEach((button) => {
      const selected = button.dataset.layout === activeLayout;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };
  controls.forEach((button) => button.addEventListener('click', () => setLayout(button.dataset.layout)));
  setLayout(activeLayout);
} catch (error) {
  itemContainer.innerHTML = '<p class="data-error">The canon is temporarily unavailable.</p>';
  console.error(error);
}
