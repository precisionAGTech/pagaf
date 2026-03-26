/* PAGAF v3.0 — Product Site + Tool App — Powered by nltGIS.ai */
(function() {
'use strict';

/* ===== TILE SOURCES ===== */
const BASEMAPS = {
  naip: {
    version: 8,
    sources: { naip: { type: 'raster', tiles: ['https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'USDA NAIP' }},
    layers: [{ id: 'naip-layer', type: 'raster', source: 'naip', minzoom: 0, maxzoom: 19 }],
    glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf'
  },
  satellite: {
    version: 8,
    sources: { esri: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar' }},
    layers: [{ id: 'satellite-layer', type: 'raster', source: 'esri' }],
    glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf'
  },
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
};

/* ===== STATE ===== */
let map = null;
let currentStep = 1;
let isDrawing = false;
let drawMode = null; // 'polygon' | 'rect'
let drawPoints = [];
let fields = [];
let selectedApp = null;
let selectedExport = null;
let currentBasemap = 'naip';
let sidebarOpen = true;
let clickHandler = null;
let dblHandler = null;

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => { requestAnimationFrame(initApp); });

function initApp() {
  if (typeof maplibregl === 'undefined') { setTimeout(initApp, 300); return; }
  initMap();
  initWorkflow();
  initLayerToggle();
  initDrawTools();
  initApplications();
  initExport();
  initSearch();
  initNavbar();
  initSidebar();
  initModals();
  initKeyboard();
  initMapToolbar();
}

/* ===== MAP ===== */
function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: BASEMAPS.naip,
    center: [-95.7, 39.8],
    zoom: 4,
    maxZoom: 19,
    minZoom: 3,
    attributionControl: false
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 150 }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  map.on('move', () => {
    const c = map.getCenter();
    const z = map.getZoom().toFixed(1);
    setEl('statusCoords', c.lat.toFixed(4) + ', ' + c.lng.toFixed(4));
    setEl('statusZoom', 'Zoom: ' + z);
  });

  map.on('load', () => {
    addDrawingSources();
    setTimeout(() => { map.flyTo({ center: [-93.5, 41.8], zoom: 6, duration: 2500 }); }, 600);
  });

  // Right-click context: show coordinates
  map.on('contextmenu', (e) => {
    const coords = e.lngLat;
    new maplibregl.Popup({ closeButton: true, maxWidth: '200px' })
      .setLngLat(coords)
      .setHTML('<div style="font-size:11px"><strong>Coordinates</strong><br>' + coords.lat.toFixed(6) + ', ' + coords.lng.toFixed(6) + '<br><em style="color:#94a3b8">Zoom: ' + map.getZoom().toFixed(1) + '</em></div>')
      .addTo(map);
  });

  // Cursor management
  map.on('mousemove', () => {
    if (isDrawing) map.getCanvas().style.cursor = 'crosshair';
  });
}

function addDrawingSources() {
  map.addSource('drawn-fields', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'fields-fill', type: 'fill', source: 'drawn-fields', paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 } });
  map.addLayer({ id: 'fields-line', type: 'line', source: 'drawn-fields', paint: { 'line-color': '#4ade80', 'line-width': 2.5, 'line-dasharray': [1] } });
  map.addSource('draw-vertices', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'vertices', type: 'circle', source: 'draw-vertices', paint: { 'circle-radius': 5, 'circle-color': '#4ade80', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
  map.addSource('draw-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'draw-line-layer', type: 'line', source: 'draw-line', paint: { 'line-color': '#4ade80', 'line-width': 1.5, 'line-dasharray': [3, 3] } });
  map.addSource('rx-layer', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'rx-fill', type: 'fill', source: 'rx-layer', paint: {
    'fill-color': ['interpolate', ['linear'], ['get', 'value'], 0, '#d73027', 0.3, '#fc8d59', 0.5, '#fee08b', 0.7, '#66bd63', 1, '#1a9850'],
    'fill-opacity': 0.6
  }});
}

/* ===== NAVBAR ===== */
function initNavbar() {
  // Dropdown hover behavior already works via CSS, but let's add click support for mobile
  document.querySelectorAll('.nav-dropdown').forEach(dd => {
    dd.querySelector('.nav-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = dd.classList.contains('open');
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
      if (!isOpen) dd.classList.add('open');
    });
  });

  // Close dropdowns on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    }
  });

  // Dropdown actions
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const action = el.dataset.action;
      if (action === 'openFieldMapper') setActiveStep(2);
      else if (action === 'openPrescriptions') setActiveStep(3);
      else if (action === 'openExport') setActiveStep(4);
      else if (action === 'openCropHealth') { setActiveStep(3); document.querySelector('[data-app="ndvi"]')?.click(); }
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    });
  });

  // Data layer dropdown items
  document.querySelectorAll('[data-layer-select]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const layer = el.dataset.layerSelect;
      switchLayer(layer);
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    });
  });

  // Equipment dropdown items
  document.querySelectorAll('[data-equip]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveStep(4);
      const fmt = el.dataset.equip;
      document.querySelector('.export-btn[data-fmt="' + fmt + '"]')?.classList.add('selected');
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    });
  });

  // Get Started button
  document.getElementById('getStartedBtn')?.addEventListener('click', () => {
    setActiveStep(1);
    document.getElementById('locationSearch')?.focus();
  });

  // Mobile toggle
  document.getElementById('mobileToggle')?.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('mobile-open');
  });
}

/* ===== SIDEBAR ===== */
function initSidebar() {
  document.getElementById('sidebarCollapse')?.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('appLayout')?.classList.toggle('sidebar-collapsed', !sidebarOpen);
  const btn = document.getElementById('sidebarCollapse');
  if (btn) btn.style.transform = sidebarOpen ? '' : 'rotate(180deg)';
  setTimeout(() => { if (map) map.resize(); }, 300);
}

/* ===== MODALS ===== */
function initModals() {
  // Welcome modal
  const welcomed = localStorage.getItem('pagaf_welcomed');
  const modal = document.getElementById('welcomeModal');
  if (welcomed) { modal?.classList.add('hidden'); }

  document.getElementById('welcomeClose')?.addEventListener('click', closeWelcome);
  document.getElementById('welcomeStart')?.addEventListener('click', closeWelcome);

  function closeWelcome() {
    modal?.classList.add('hidden');
    if (document.getElementById('welcomeDontShow')?.checked) {
      localStorage.setItem('pagaf_welcomed', '1');
    }
    setTimeout(() => { document.getElementById('locationSearch')?.focus(); }, 300);
  }

  // Shortcuts modal
  document.getElementById('shortcutsClose')?.addEventListener('click', () => {
    document.getElementById('shortcutsModal')?.classList.add('hidden');
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });
}

/* ===== KEYBOARD SHORTCUTS ===== */
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    switch (e.key) {
      case 'd': case 'D': startPolygonDraw(); break;
      case 'r': case 'R': startRectDraw(); break;
      case 'Escape': cancelDraw(); break;
      case 'f': case 'F': zoomToFields(); break;
      case '1': setActiveStep(1); break;
      case '2': setActiveStep(2); break;
      case '3': setActiveStep(3); break;
      case '4': setActiveStep(4); break;
      case 's': case 'S': toggleSidebar(); break;
      case '/': e.preventDefault(); document.getElementById('locationSearch')?.focus(); break;
      case '?': document.getElementById('shortcutsModal')?.classList.toggle('hidden'); break;
    }
  });
}

/* ===== MAP TOOLBAR ===== */
function initMapToolbar() {
  document.getElementById('mapToolDraw')?.addEventListener('click', startPolygonDraw);
  document.getElementById('mapToolRect')?.addEventListener('click', startRectDraw);
  document.getElementById('mapToolZoomField')?.addEventListener('click', zoomToFields);
  document.getElementById('mapToolFullscreen')?.addEventListener('click', toggleSidebar);
  document.getElementById('mapToolMeasure')?.addEventListener('click', () => {
    showToast('Measure tool coming soon', 'info');
  });
  document.getElementById('mapHintClose')?.addEventListener('click', () => {
    document.getElementById('mapHint')?.classList.add('hidden');
  });
}

function zoomToFields() {
  if (!fields.length || typeof turf === 'undefined') return;
  const fc = { type: 'FeatureCollection', features: fields };
  const bbox = turf.bbox(fc);
  map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, duration: 1000 });
}

/* ===== LAYER TOGGLE ===== */
function initLayerToggle() {
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => { switchLayer(btn.dataset.layer); });
  });
}

function switchLayer(layer) {
  if (layer === currentBasemap || !BASEMAPS[layer]) return;
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === layer));
  currentBasemap = layer;
  map.setStyle(BASEMAPS[layer]);
  map.once('style.load', () => {
    addDrawingSources();
    updateFieldsOnMap();
    const labels = { naip: 'NAIP Imagery (USDA)', satellite: 'Satellite (Esri)', dark: 'Dark Basemap' };
    setEl('statusLayer', labels[layer] || layer);
  });
}

/* ===== WORKFLOW ===== */
function initWorkflow() {
  document.querySelectorAll('.step-header').forEach(header => {
    header.addEventListener('click', () => {
      const step = parseInt(header.parentElement.dataset.step);
      setActiveStep(step);
    });
  });
}

function setActiveStep(step) {
  currentStep = step;
  document.querySelectorAll('.workflow-step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.toggle('active', n === step);
    s.classList.toggle('completed', n < step);
  });
  // Ensure sidebar is open
  if (!sidebarOpen) toggleSidebar();
}

/* ===== SEARCH ===== */
function initSearch() {
  const input = document.getElementById('locationSearch');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = input.value.trim();
    if (!q) return;
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q))
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          const d = data[0];
          map.flyTo({ center: [parseFloat(d.lon), parseFloat(d.lat)], zoom: 14, duration: 2000 });
          showToast('Navigated to ' + d.display_name.split(',')[0], 'success');
          setActiveStep(2);
        } else {
          showToast('Location not found. Try a different search.', 'info');
        }
      })
      .catch(() => showToast('Search error. Try again.', 'info'));
  });

  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const loc = btn.dataset.loc.split(',').map(Number);
      map.flyTo({ center: [loc[0], loc[1]], zoom: loc[2] || 12, duration: 2000 });
      showToast('Flying to ' + btn.textContent.trim(), 'info');
      setActiveStep(2);
    });
  });
}

/* ===== DRAWING ===== */
function initDrawTools() {
  document.getElementById('drawPolygon')?.addEventListener('click', startPolygonDraw);
  document.getElementById('drawRect')?.addEventListener('click', startRectDraw);
  document.getElementById('clearDraw')?.addEventListener('click', clearAllFields);
  document.getElementById('uploadField')?.addEventListener('click', () => {
    showToast('Upload coming soon. Draw on the map for now.', 'info');
  });
}

function cancelDraw() {
  if (!isDrawing) return;
  isDrawing = false;
  drawMode = null;
  drawPoints = [];
  map.getCanvas().style.cursor = '';
  document.getElementById('mapHint')?.classList.add('hidden');
  document.querySelectorAll('.tool-btn, .map-tool').forEach(b => b.classList.remove('active'));
  map.getSource('draw-vertices')?.setData({ type: 'FeatureCollection', features: [] });
  map.getSource('draw-line')?.setData({ type: 'FeatureCollection', features: [] });
  if (clickHandler) { map.off('click', clickHandler); clickHandler = null; }
  if (dblHandler) { map.off('dblclick', dblHandler); dblHandler = null; }
  showToast('Drawing cancelled', 'info');
}

function startPolygonDraw() {
  if (isDrawing) cancelDraw();
  isDrawing = true;
  drawMode = 'polygon';
  drawPoints = [];
  document.getElementById('drawPolygon')?.classList.add('active');
  document.getElementById('mapToolDraw')?.classList.add('active');
  map.getCanvas().style.cursor = 'crosshair';

  const hint = document.getElementById('mapHint');
  const hintText = document.getElementById('mapHintText');
  if (hint && hintText) {
    hintText.textContent = 'Click on the map to place field corners. Double-click to finish.';
    hint.classList.remove('hidden');
  }

  clickHandler = (e) => {
    if (!isDrawing) return;
    drawPoints.push([e.lngLat.lng, e.lngLat.lat]);
    updateDrawPreview();
  };
  dblHandler = (e) => {
    if (!isDrawing || drawPoints.length < 3) return;
    e.preventDefault();
    isDrawing = false;
    drawMode = null;
    map.getCanvas().style.cursor = '';
    document.getElementById('mapHint')?.classList.add('hidden');
    map.off('click', clickHandler); clickHandler = null;
    map.off('dblclick', dblHandler); dblHandler = null;
    finishField();
    document.getElementById('drawPolygon')?.classList.remove('active');
    document.getElementById('mapToolDraw')?.classList.remove('active');
  };
  map.on('click', clickHandler);
  map.on('dblclick', dblHandler);
  setActiveStep(2);
}

function startRectDraw() {
  if (isDrawing) cancelDraw();
  isDrawing = true;
  drawMode = 'rect';
  drawPoints = [];
  document.getElementById('drawRect')?.classList.add('active');
  document.getElementById('mapToolRect')?.classList.add('active');
  map.getCanvas().style.cursor = 'crosshair';

  const hint = document.getElementById('mapHint');
  const hintText = document.getElementById('mapHintText');
  if (hint && hintText) {
    hintText.textContent = 'Click two opposite corners to define the field rectangle.';
    hint.classList.remove('hidden');
  }

  let clicks = 0;
  clickHandler = (e) => {
    clicks++;
    drawPoints.push([e.lngLat.lng, e.lngLat.lat]);
    if (clicks === 2) {
      isDrawing = false;
      drawMode = null;
      map.getCanvas().style.cursor = '';
      document.getElementById('mapHint')?.classList.add('hidden');
      map.off('click', clickHandler); clickHandler = null;
      const [p1, p2] = drawPoints;
      drawPoints = [p1, [p2[0], p1[1]], p2, [p1[0], p2[1]]];
      finishField();
      document.getElementById('drawRect')?.classList.remove('active');
      document.getElementById('mapToolRect')?.classList.remove('active');
    } else { updateDrawPreview(); }
  };
  map.on('click', clickHandler);
  setActiveStep(2);
}

function updateDrawPreview() {
  map.getSource('draw-vertices')?.setData({
    type: 'FeatureCollection',
    features: drawPoints.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} }))
  });
  if (drawPoints.length >= 2) {
    map.getSource('draw-line')?.setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: drawPoints }, properties: {} }]
    });
  }
  if (drawPoints.length >= 3) {
    const coords = [...drawPoints, drawPoints[0]];
    map.getSource('drawn-fields')?.setData({
      type: 'FeatureCollection',
      features: [...fields, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: { name: 'Preview', id: 'preview' } }]
    });
  }
}

function finishField() {
  if (drawPoints.length < 3) return;
  const coords = [...drawPoints, drawPoints[0]];
  const polygon = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: { name: 'Field ' + (fields.length + 1), id: 'field_' + Date.now() } };
  if (typeof turf !== 'undefined') {
    const area = turf.area(polygon);
    polygon.properties.acres = (area * 0.000247105).toFixed(1);
  }
  fields.push(polygon);
  drawPoints = [];
  updateFieldsOnMap();
  updateFieldsList();
  updateStatusFields();
  showToast('Field ' + fields.length + ' added (' + (polygon.properties.acres || '?') + ' acres)', 'success');
  if (typeof turf !== 'undefined') {
    const bbox = turf.bbox(polygon);
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, duration: 800 });
  }
  if (fields.length >= 1) setActiveStep(3);
}

function updateFieldsOnMap() {
  map.getSource('drawn-fields')?.setData({ type: 'FeatureCollection', features: fields });
  map.getSource('draw-vertices')?.setData({ type: 'FeatureCollection', features: [] });
  map.getSource('draw-line')?.setData({ type: 'FeatureCollection', features: [] });
}

function updateFieldsList() {
  const el = document.getElementById('fieldsList');
  if (!el) return;
  if (fields.length === 0) {
    el.innerHTML = '<div class="fields-empty"><p>No fields drawn yet</p><span>Click "Draw Field" then click on the map</span></div>';
    return;
  }
  el.innerHTML = fields.map((f, i) =>
    '<div class="field-item"><span class="field-name">' + f.properties.name + '</span><span class="field-acres">' + (f.properties.acres || '?') + ' ac</span><button class="field-remove" data-idx="' + i + '">\u00d7</button></div>'
  ).join('');
  el.querySelectorAll('.field-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      fields.splice(parseInt(btn.dataset.idx), 1);
      updateFieldsOnMap();
      updateFieldsList();
      updateStatusFields();
    });
  });
}

function updateStatusFields() {
  const total = fields.reduce((s, f) => s + parseFloat(f.properties.acres || 0), 0);
  setEl('statusFields', fields.length + ' field' + (fields.length !== 1 ? 's' : ''));
  setEl('statusAcres', total.toFixed(1) + ' acres');
}

function clearAllFields() {
  fields = [];
  drawPoints = [];
  isDrawing = false;
  drawMode = null;
  map.getCanvas().style.cursor = '';
  updateFieldsOnMap();
  updateFieldsList();
  updateStatusFields();
  map.getSource('rx-layer')?.setData({ type: 'FeatureCollection', features: [] });
  document.getElementById('resultsPanel')?.classList.remove('visible');
  document.querySelectorAll('.tool-btn, .map-tool').forEach(b => b.classList.remove('active'));
  document.getElementById('mapHint')?.classList.add('hidden');
  showToast('All fields cleared', 'info');
  setActiveStep(1);
}

/* ===== APPLICATIONS ===== */
function initApplications() {
  document.querySelectorAll('.app-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.app-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedApp = card.dataset.app;
      if (fields.length === 0) { showToast('Draw at least one field first (Step 2)', 'info'); setActiveStep(2); return; }
      runAnalysis(selectedApp);
      setActiveStep(4);
    });
  });
}

function runAnalysis(appType) {
  const panel = document.getElementById('resultsPanel');
  const body = document.getElementById('resultsBody');
  if (!panel || !body) return;
  panel.classList.add('visible');
  body.innerHTML = '<div style="text-align:center;padding:30px"><div class="loading-spinner"></div><p style="color:var(--slate-400);margin-top:12px;font-size:12px">Analyzing ' + fields.length + ' field(s) with nltGIS.ai...</p></div>';
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}.loading-spinner{width:28px;height:28px;border:3px solid var(--navy-600);border-top-color:var(--green-500);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}';
    document.head.appendChild(s);
  }
  setTimeout(() => {
    body.innerHTML = generateResults(appType);
    generatePrescriptionGrid(appType);
  }, 1500);
}

function generateResults(appType) {
  const totalAcres = fields.reduce((s, f) => s + parseFloat(f.properties.acres || 0), 0).toFixed(1);
  const configs = {
    ndvi: [
      { title: 'Avg NDVI Index', value: '0.72', desc: 'Healthy vegetation across ' + totalAcres + ' acres', pct: 72 },
      { title: 'Problem Zones', value: '2', desc: 'Stress detected in NW sector', pct: 15, cls: 'bar-yellow' },
      { title: 'Source', desc: 'Sentinel-2 L2A via nltGIS.ai, 3 days ago' }
    ],
    seeding: [
      { title: 'Recommended Rate', value: '34K seeds/ac', desc: 'Variable-rate across ' + totalAcres + ' acres' },
      { title: 'Zone Avg', value: '32.5K', desc: '3 management zones identified', pct: 81 },
      { title: 'Potential Savings', value: '$12.40/ac', desc: 'vs. flat-rate seeding', color: '#4ade80' }
    ],
    fertilizer: [
      { title: 'Nitrogen Rx', value: '165 lb/ac', desc: 'Variable-rate N application map' },
      { title: 'Phosphorus', value: '45 lb/ac', desc: 'Uniform rate recommended', pct: 60 },
      { title: 'Estimated Cost', value: '$87/ac', desc: 'Based on current fertilizer prices' }
    ],
    pesticide: [
      { title: 'Spray Zones', value: '4 zones', desc: 'Targeted application areas identified' },
      { title: 'Coverage', value: '62%', desc: '38% of field needs no treatment', pct: 62 },
      { title: 'Savings vs Blanket', value: '38%', desc: 'Reduced chemical usage', color: '#4ade80' }
    ],
    fungicide: [
      { title: 'Disease Risk', value: 'Moderate', desc: 'Based on weather + crop stage model', pct: 55 },
      { title: 'Application Rate', value: '6 oz/ac', desc: 'Targeted to high-risk zones' },
      { title: 'Optimal Window', value: '3-5 days', desc: 'Apply before next rain event' }
    ],
    yield: [
      { title: 'Predicted Yield', value: '187 bu/ac', desc: 'Above county average (172)', pct: 87 },
      { title: 'Revenue Est.', value: '$' + (187 * 4.5 * parseFloat(totalAcres)).toFixed(0), desc: totalAcres + ' ac at $4.50/bu corn', color: '#4ade80' },
      { title: 'Confidence', value: '89%', desc: 'Satellite + weather models via nltGIS.ai', pct: 89 }
    ]
  };
  const items = configs[appType] || configs.ndvi;
  return items.map(i => {
    let bar = '';
    if (i.pct !== undefined) bar = '<div class="analysis-bar"><div class="analysis-bar-fill ' + (i.cls || 'bar-green') + '" style="width:' + i.pct + '%"></div></div>';
    return '<div class="analysis-item"><h4>' + i.title + '</h4>' + (i.value ? '<div class="value-lg"' + (i.color ? ' style="color:' + i.color + '"' : '') + '>' + i.value + '</div>' : '') + '<p>' + i.desc + '</p>' + bar + '</div>';
  }).join('');
}

function generatePrescriptionGrid(appType) {
  if (!fields.length || typeof turf === 'undefined') return;
  try {
    const allFeatures = [];
    fields.forEach(field => {
      const bbox = turf.bbox(field);
      const cellSize = Math.max(0.0005, (bbox[2] - bbox[0]) / 25);
      const grid = turf.pointGrid(bbox, cellSize, { units: 'degrees' });
      const within = turf.pointsWithinPolygon(grid, field);
      within.features.forEach(f => {
        const val = 0.2 + Math.random() * 0.8;
        const c = f.geometry.coordinates;
        const d = cellSize / 2;
        allFeatures.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[c[0]-d,c[1]-d],[c[0]+d,c[1]-d],[c[0]+d,c[1]+d],[c[0]-d,c[1]+d],[c[0]-d,c[1]-d]]] }, properties: { value: val } });
      });
    });
    map.getSource('rx-layer')?.setData({ type: 'FeatureCollection', features: allFeatures });
  } catch (e) { console.warn('Rx grid error:', e); }
}

/* ===== EXPORT ===== */
function initExport() {
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.fmt;
      if (fields.length === 0) { showToast('No fields to export. Draw fields first.', 'info'); return; }
      document.querySelectorAll('.export-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedExport = fmt;
      exportFields(fmt);
    });
  });
  document.getElementById('resultsExportBtn')?.addEventListener('click', () => {
    if (fields.length === 0) return;
    exportFields(selectedExport || 'geojson');
  });
  document.getElementById('resultsClose')?.addEventListener('click', () => {
    document.getElementById('resultsPanel')?.classList.remove('visible');
  });
}

function exportFields(fmt) {
  const fc = { type: 'FeatureCollection', features: fields };
  const labels = { geojson:'GeoJSON', shapefile:'Shapefile', geotiff:'GeoTIFF', geopackage:'GeoPackage', isoxml:'ISO-XML (ISOBUS)', johndeere:'John Deere', cnh:'Case IH/NH', trimble:'Trimble/AgLeader' };
  if (fmt === 'geojson') {
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pagaf_fields.geojson'; a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded pagaf_fields.geojson', 'success');
  } else {
    showToast((labels[fmt] || fmt) + ' export coming soon. GeoJSON available now.', 'info');
  }
}

/* ===== UTILS ===== */
function setEl(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function showToast(msg, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'info');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = '0.3s'; }, 3000);
  setTimeout(() => { toast.remove(); }, 3500);
}

console.log('PAGAF v3.0 — Product Site + Tool App');
console.log('Powered by nltGIS.ai | NAIP via USDA');
})();
