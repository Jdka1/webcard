const imgs = Array.from(document.querySelectorAll(".gallery img"));
let current = -1;

// ── Scroll fade-in ────────────────────────────────────────────────────────────

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.05 }
);
imgs.forEach((img) => observer.observe(img));

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
  </div>
`;
document.body.appendChild(lb);

const lbImg = lb.querySelector(".lb-img");

function open(index) {
  current = (index + imgs.length) % imgs.length;
  lbImg.src = imgs[current].src;
  lbImg.alt = imgs[current].alt;
  lb.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function close() {
  lb.classList.remove("is-open");
  document.body.style.overflow = "";
}

function navigate(dir) {
  open(current + dir);
}

imgs.forEach((img, i) => {
  img.style.cursor = "zoom-in";
  img.addEventListener("click", () => open(i));
});

lb.querySelector(".lb-close").addEventListener("click", close);
lb.querySelector(".lb-prev").addEventListener("click", () => navigate(-1));
lb.querySelector(".lb-next").addEventListener("click", () => navigate(1));

lb.querySelector(".lb-frame").addEventListener("click", (e) => e.stopPropagation());
lb.addEventListener("click", close);

document.addEventListener("keydown", (e) => {
  if (!lb.classList.contains("is-open")) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowRight") navigate(1);
  if (e.key === "ArrowLeft") navigate(-1);
});
