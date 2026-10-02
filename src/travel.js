import { geoGraticule10, geoOrthographic, geoPath } from 'https://cdn.jsdelivr.net/npm/d3-geo@3/+esm';
import { feature } from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

const svg = document.querySelector('#travel-map');
const list = document.querySelector('#travel-list');
const width = 960;
const height = 580;
let rotation = [12, -18, 0];
let zoom = 1;
let selectedIndex = null;
let isDragging = false;
let origin = null;
let animationFrame = null;

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
let countries = null;
try {
  countries = feature(atlas, atlas.objects.countries);
} catch (error) {
  // The globe, graticule, and pins remain useful if a CDN map-data update is malformed.
  console.warn('World boundary data was unavailable.', error);
}
const graticule = geoGraticule10();

function scheduleDraw() {
  if (animationFrame) return;
  animationFrame = requestAnimationFrame(() => {
    animationFrame = null;
    draw();
  });
}

function projection() {
  return geoOrthographic().translate([width / 2, height / 2]).scale(275 * zoom).rotate(rotation).clipAngle(90);
}

function isVisible(place) {
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
  svg.append(make('path', { class: 'map-graticule', d: path(graticule) }));
  if (countries) svg.append(make('path', { class: 'map-countries', d: path(countries) }));

  places.forEach((place, index) => {
    if (!isVisible(place)) return;
    const point = project([place.longitude, place.latitude]);
    if (!point) return;
    const group = make('g', { class: `destination${selectedIndex === index ? ' is-selected' : ''}`, tabindex: '0', role: 'button', 'aria-label': `${place.name}, ${place.country}` });
    // Screen-upright beacons keep the visual language stable while their bases stay attached to the globe.
    const heightAboveSurface = 26;
    const tipX = point[0];
    const tipY = point[1] - heightAboveSurface;
    const baseWidth = 6;
    const tipWidth = 4;
    const points = (coordinates) => coordinates.map(([x, y]) => `${x},${y}`).join(' ');

    group.append(make('ellipse', { class: 'waypoint-shadow', cx: point[0], cy: point[1], rx: baseWidth + 2, ry: 3 }));
    group.append(make('polygon', { class: 'waypoint-side', points: points([
      [point[0], point[1]],
      [tipX, tipY],
      [tipX + tipWidth, tipY + 2],
      [point[0] + baseWidth, point[1] + 2]
    ]) }));
    group.append(make('polygon', { class: 'waypoint-face', points: points([
      [point[0] - baseWidth, point[1] + 2],
      [tipX - tipWidth, tipY + 2],
      [tipX, tipY],
      [point[0], point[1]]
    ]) }));
    group.append(make('ellipse', { class: 'waypoint-cap', cx: tipX, cy: tipY, rx: 7, ry: 5 }));
    group.append(make('circle', { class: 'destination-ring', cx: tipX, cy: tipY, r: 12 }));
    const label = make('text', { x: tipX + 15, y: tipY + 4 });
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
  scheduleDraw();
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
  rotation = [origin.rotation[0] + dx * 0.35, Math.max(-70, Math.min(70, origin.rotation[1] - dy * 0.35)), 0];
  scheduleDraw();
});
svg.addEventListener('pointerup', () => { isDragging = false; origin = null; });
svg.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoom = Math.max(0.65, Math.min(4.5, zoom - event.deltaY * 0.0025));
  scheduleDraw();
}, { passive: false });

renderList();
draw();
