import { geoEquirectangular, geoGraticule10, geoOrthographic, geoPath } from 'https://cdn.jsdelivr.net/npm/d3-geo@3/+esm';
import { feature } from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

const svg = document.querySelector('#travel-map');
const list = document.querySelector('#travel-list');
const help = document.querySelector('#map-help');
const buttons = [...document.querySelectorAll('[data-view]')];
const width = 960;
const height = 580;
let view = 'globe';
let rotation = [12, -18, 0];
let zoom = 1;
let selectedIndex = null;
let isDragging = false;
let origin = null;

const ns = 'http://www.w3.org/2000/svg';
const make = (tag, attributes = {}) => {
  const node = document.createElementNS(ns, tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
};

const [placesResponse, atlasResponse] = await Promise.all([
  fetch('/data/travel.json'),
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
]);
if (!placesResponse.ok || !atlasResponse.ok) throw new Error('Map data was unavailable');
const { places } = await placesResponse.json();
const atlas = await atlasResponse.json();
let land = null;
try {
  land = feature(atlas, atlas.objects.land || atlas.objects.countries);
} catch (error) {
  // The globe, graticule, and pins remain useful if a CDN map-data update is malformed.
  console.warn('World boundary data was unavailable.', error);
}
const graticule = geoGraticule10();

function projection() {
  if (view === 'map') return geoEquirectangular().fitExtent([[38, 48], [922, 532]], { type: 'Sphere' });
  return geoOrthographic().translate([width / 2, height / 2]).scale(244 * zoom).rotate(rotation).clipAngle(90);
}

function isVisible(place) {
  if (view === 'map') return true;
  const lambda = (place.longitude + rotation[0]) * Math.PI / 180;
  const phi = place.latitude * Math.PI / 180;
  const phi0 = -rotation[1] * Math.PI / 180;
  return Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda) + Math.sin(phi0) * Math.sin(phi) > 0;
}

function draw() {
  const project = projection();
  const path = geoPath(project);
  svg.replaceChildren();
  const sphere = make('path', { class: 'map-sphere', d: path({ type: 'Sphere' }) });
  svg.append(sphere);
  svg.append(make('path', { class: 'map-graticule', d: path(graticule()) }));
  if (land) svg.append(make('path', { class: 'map-land', d: path(land) }));

  places.forEach((place, index) => {
    if (!isVisible(place)) return;
    const point = project([place.longitude, place.latitude]);
    if (!point) return;
    const group = make('g', { class: `destination${selectedIndex === index ? ' is-selected' : ''}`, tabindex: '0', role: 'button', 'aria-label': `${place.name}, ${place.country}` });
    group.append(make('circle', { cx: point[0], cy: point[1], r: 5 }));
    group.append(make('circle', { class: 'destination-ring', cx: point[0], cy: point[1], r: 10 }));
    const label = make('text', { x: point[0] + 13, y: point[1] + 4 });
    label.textContent = place.name;
    group.append(label);
    group.addEventListener('click', () => select(index));
    group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') select(index); });
    svg.append(group);
  });
}

function renderList() {
  list.innerHTML = places.map((place, index) => `<li class="travel-item${selectedIndex === index ? ' is-selected' : ''}"><button type="button" data-index="${index}"><span>${place.name}</span><span>${place.country}</span><small>${place.note}</small></button></li>`).join('');
  list.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => select(Number(button.dataset.index))));
}

function select(index) {
  selectedIndex = selectedIndex === index ? null : index;
  renderList();
  draw();
}

function setView(nextView) {
  view = nextView;
  help.textContent = view === 'globe' ? 'drag to turn · scroll to zoom · select a point' : 'drag to pan · select a point';
  buttons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  draw();
}

svg.addEventListener('pointerdown', (event) => {
  isDragging = true;
  origin = { x: event.clientX, y: event.clientY, rotation: [...rotation] };
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove', (event) => {
  if (!isDragging || !origin) return;
  const dx = event.clientX - origin.x;
  const dy = event.clientY - origin.y;
  if (view === 'globe') rotation = [origin.rotation[0] + dx * 0.35, Math.max(-70, Math.min(70, origin.rotation[1] - dy * 0.35)), 0];
  draw();
});
svg.addEventListener('pointerup', () => { isDragging = false; origin = null; });
svg.addEventListener('wheel', (event) => {
  if (view !== 'globe') return;
  event.preventDefault();
  zoom = Math.max(0.7, Math.min(1.65, zoom - event.deltaY * 0.001));
  draw();
}, { passive: false });
buttons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));

renderList();
setView('globe');
