const figures = Array.from(document.querySelectorAll(".gallery figure"));
const imgs = figures.map((f) => f.querySelector("img"));
let current = -1;

function resetHorizontalScroll() {
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  if (document.scrollingElement) {
    document.scrollingElement.scrollLeft = 0;
    document.scrollingElement.scrollTop = 0;
  }
}

resetHorizontalScroll();
window.addEventListener("pageshow", resetHorizontalScroll);
window.addEventListener("load", resetHorizontalScroll);

// ── Build scrolling track ─────────────────────────────────────────────────────

const gallery = document.querySelector(".gallery");
const galleryHint = document.querySelector(".gallery-hint");
const marquee = document.createElement("div");
marquee.className = "gallery-marquee";

const track = document.createElement("div");
track.className = "gallery-track";
figures.forEach((f) => {
  const img = f.querySelector("img");
  const caption = f.querySelector("figcaption");
  const media = document.createElement("div");
  media.className = "gallery-media";
  f.insertBefore(media, img);
  media.appendChild(img);
  media.appendChild(caption);
  img.classList.add("visible");
  track.appendChild(f);
});

const clone = track.cloneNode(true);
marquee.appendChild(track);
marquee.appendChild(clone);
gallery.appendChild(marquee);

// ── Marquee animation ─────────────────────────────────────────────────────────

const FIGURE_SIZE = track.firstElementChild.getBoundingClientRect().width;
const GAP = parseFloat(getComputedStyle(track).columnGap) || 60;
const loopDistance = figures.length * (FIGURE_SIZE + GAP);
const SPEED = loopDistance / 180;
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 280;

let pos = 0;
let isHovered = false;
let isLightboxOpen = false;
let isDragging = false;
let hasDragged = false;
let dragStartX = 0;
let dragStartPos = 0;
let lastTime = null;

function wrapPosition(value) {
  return ((value % loopDistance) + loopDistance) % loopDistance;
}

function wheelPixels(e) {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return { x: e.deltaX * WHEEL_LINE_PX, y: e.deltaY * WHEEL_LINE_PX };
  }
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return { x: e.deltaX * WHEEL_PAGE_PX, y: e.deltaY * WHEEL_PAGE_PX };
  }
  return { x: e.deltaX, y: e.deltaY };
}

function hideGalleryHint() {
  if (!galleryHint) return;
  galleryHint.classList.add("is-hidden");
}

function tick(now) {
  if (lastTime !== null && !isDragging && !isLightboxOpen) {
    const dt = (now - lastTime) / 1000;
    const speed = isHovered ? SPEED * 0.40 : SPEED;
    pos = (pos + speed * dt) % loopDistance;
  }
  lastTime = now;
  marquee.style.transform = `translate3d(-${pos}px, 0, 0)`;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

gallery.addEventListener("mouseenter", () => { isHovered = true; });
gallery.addEventListener("mouseleave", () => { isHovered = false; });

gallery.addEventListener("mousedown", (e) => {
  hideGalleryHint();
  isDragging = true;
  hasDragged = false;
  dragStartX = e.clientX;
  dragStartPos = pos;
  marquee.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  if (Math.abs(dx) > 5) hasDragged = true;
  pos = wrapPosition(dragStartPos - dx);
  lastTime = null;
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  marquee.style.cursor = "";
});

gallery.addEventListener("touchstart", (e) => {
  hideGalleryHint();
  isDragging = true;
  hasDragged = false;
  dragStartX = e.touches[0].clientX;
  dragStartPos = pos;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  const dx = e.touches[0].clientX - dragStartX;
  if (Math.abs(dx) > 5) hasDragged = true;
  pos = wrapPosition(dragStartPos - dx);
  lastTime = null;
}, { passive: true });

window.addEventListener("touchend", () => { isDragging = false; });

gallery.addEventListener("wheel", (e) => {
  if (isLightboxOpen) return;

  const delta = wheelPixels(e);
  if (Math.abs(delta.x) <= Math.abs(delta.y)) return;

  e.preventDefault();
  hideGalleryHint();
  pos = wrapPosition(pos + delta.x);
  lastTime = null;
}, { passive: false });

// Suppress figure click when the pointer was dragging
gallery.addEventListener("click", (e) => {
  if (hasDragged) {
    e.stopPropagation();
    hasDragged = false;
  }
}, true);

// ── Lightbox ──────────────────────────────────────────────────────────────────

const lb = document.createElement("div");
lb.className = "lightbox";
lb.setAttribute("aria-modal", "true");
lb.setAttribute("role", "dialog");
lb.innerHTML = `
  <button class="lb-close" aria-label="Close">&times;</button>
  <button class="lb-prev" aria-label="Previous photo">&#8592;</button>
  <button class="lb-next" aria-label="Next photo">&#8594;</button>
  <div class="lb-frame">
    <img class="lb-img" src="" alt="" />
    <p class="lb-caption"></p>
  </div>
`;
document.body.appendChild(lb);

const lbImg = lb.querySelector(".lb-img");
const lbCaption = lb.querySelector(".lb-caption");

function wrapWords(text) {
  return text.split(" ").map((w) => `<span class="lb-word">${w}</span>`).join(" ");
}

function buildCaption(text) {
  const parts = text.split(" · ");
  if (parts.length < 2) return wrapWords(text);
  const title = `<em>${wrapWords(parts[0])}</em>`;
  const location = `<span class="caption-loc">${wrapWords(parts.slice(1).join(" · "))}</span>`;
  return `${title}<br>${location}`;
}

function open(index) {
  current = (index + imgs.length) % imgs.length;
  lbImg.src = imgs[current].src;
  lbImg.alt = imgs[current].alt;
  lbCaption.innerHTML = buildCaption(imgs[current].dataset.caption || "");
  lb.classList.add("is-open");
  isLightboxOpen = true;
  document.body.classList.add("photo-lightbox-open");
  document.body.style.overflow = "hidden";
}

function close() {
  lb.classList.remove("is-open");
  isLightboxOpen = false;
  document.body.classList.remove("photo-lightbox-open");
  document.body.style.overflow = "";
}

function navigate(dir) {
  open(current + dir);
}

figures.forEach((figure, i) => {
  figure.style.cursor = "pointer";
  figure.addEventListener("click", () => open(i));
});

clone.querySelectorAll("figure").forEach((figure, i) => {
  figure.style.cursor = "pointer";
  figure.addEventListener("click", () => open(i));
});

lb.querySelector(".lb-close").addEventListener("click", (e) => { e.stopPropagation(); close(); });
lb.querySelector(".lb-prev").addEventListener("click", (e) => { e.stopPropagation(); navigate(-1); });
lb.querySelector(".lb-next").addEventListener("click", (e) => { e.stopPropagation(); navigate(1); });

lb.querySelector(".lb-frame").addEventListener("click", (e) => e.stopPropagation());
lb.addEventListener("click", close);

document.addEventListener("keydown", (e) => {
  if (!lb.classList.contains("is-open")) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowRight") navigate(1);
  if (e.key === "ArrowLeft") navigate(-1);
});
