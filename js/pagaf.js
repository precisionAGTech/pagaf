/* PAGAF v4.0 — Mature Product Platform — Powered by nltGIS.ai */
(function() {
  'use strict';

  /* ===== CONFIGURATION ===== */
  const VERSION = '4.0.0';
  const APP_NAME = 'PAGAF';

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
    osm: {
      version: 8,
      sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap' }},
      layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }],
      glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf'
    },
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    topo: {
      version: 8,
      sources: { topo: { type: 'raster', tiles: ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 16, attribution: 'USGS' }},
      layers: [{ id: 'topo-layer', type: 'raster', source: 'topo' }],
      glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf'
    }
  };

  const DATA_LAYERS = {
    ssurgo: { name: 'SSURGO Soils', url: 'https://sdmdataaccess.sc.egov.usda.gov/Spatial/SDMWGS84Geographic.wms', type: 'wms', layers: 'MapunitPoly', visible: false },
    cdl: { name: 'Cropland Data Layer', url: 'https://nassgeodata.gmu.edu/CropScapeService/wms_cdl', type: 'wms', layers: 'cdl_2023', visible: false },
    wetlands: { name: 'NWI Wetlands', url: 'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/export', type: 'arcgis', visible: false }
  };

  const PRESCRIPTIONS = {
    ndvi: { name: 'Crop Health (NDVI)', icon: '🌱', colors: ['#d73027','#fc8d59','#fee08b','#d9ef8b','#66bd63','#1a9850'], unit: 'index' },
    seeding: { name: 'Seeding Rate Rx', icon: '🌾', colors: ['#fef0d9','#fdcc8a','#fc8d59','#e34a33','#b30000'], unit: 'seeds/ac' },
    fertilizer: { name: 'Fertilizer Rx', icon: '🧪', colors: ['#eff3ff','#bdd7e7','#6baed6','#3182bd','#08519c'], unit: 'lb/ac' },
    pesticide: { name: 'Pest / Weed Map', icon: '🐛', colors: ['#fee5d9','#fcae91','#fb6a4a','#de2d26','#a50f15'], unit: 'oz/ac' },
    fungicide: { name: 'Fungicide Rx', icon: '🍄', colors: ['#f2f0f7','#cbc9e2','#9e9ac8','#756bb1','#54278f'], unit: 'oz/ac' },
    yield: { name: 'Yield Estimate', icon: '📊', colors: ['#d73027','#fc8d59','#fee08b','#66bd63','#1a9850'], unit: 'bu/ac' }
  };

  /* ===== STATE ===== */
  let map = null;
  let currentStep = 1;
  let isDrawing = false;
  let drawMode = null;
  let drawPoints = [];
  let fields = [];
  let selectedApp = null;
  let selectedExport = null;
  let currentBasemap = 'naip';
  let sidebarOpen = true;
  let clickHandler = null;
  let dblHandler = null;
  let moveHandler = null;
  let measureMode = false;
  let measurePoints = [];
  let undoStack = [];
  let redoStack = [];
  let activeDataLayers = {};
  let fieldIdCounter = 1;
  let selectedFieldIdx = null;

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
    initFileUpload();
    initDataLayers();
    initFieldProperties();
    restoreSession();
    console.log(APP_NAME + ' v' + VERSION + ' — Powered by nltGIS.ai');
    console.log('MapLibre GL JS | Turf.js | NAIP via USDA | OSM');
  }

  /* ===== SESSION PERSISTENCE ===== */
  function saveSession() {
    try {
      const session = {
        fields: fields,
        currentBasemap: currentBasemap,
        center: map ? [map.getCenter().lng, map.getCenter().lat] : [-95.7, 39.8],
        zoom: map ? map.getZoom() : 4,
        version: VERSION
      };
      localStorage.setItem('pagaf_session', JSON.stringify(session));
    } catch(e) { /* quota exceeded or private browsing */ }
  }

  function restoreSession() {
    try {
      const saved = localStorage.getItem('pagaf_session');
      if (!saved) return;
      const session = JSON.parse(saved);
      if (session.fields && session.fields.length > 0) {
        fields = session.fields;
        fieldIdCounter = fields.length + 1;
        updateFieldsOnMap();
        updateFieldsList();
        updateStatusFields();
        showToast('Restored ' + fields.length + ' field(s) from last session', 'success');
        if (fields.length > 0) setActiveStep(3);
      }
    } catch(e) { /* ignore corrupt session */ }
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
      attributionControl: false,
      hash: true
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 150, unit: 'imperial' }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'top-right');

    map.on('move', updateStatusBar);
    map.on('load', () => {
      addDrawingSources();
      addMeasureSources();
      setTimeout(() => { map.flyTo({ center: [-93.5, 41.8], zoom: 6, duration: 2500 }); }, 600);
    });

    map.on('contextmenu', (e) => {
      const coords = e.lngLat;
      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
        .setLngLat(coords)
        .setHTML('<div class="ctx-popup">' +
          '<div class="ctx-coords">' + coords.lat.toFixed(6) + ', ' + coords.lng.toFixed(6) + '</div>' +
          '<div class="ctx-zoom">Zoom: ' + map.getZoom().toFixed(1) + '</div>' +
          '<div class="ctx-actions">' +
            '<button onclick="navigator.clipboard.writeText(\'' + coords.lat.toFixed(6) + ', ' + coords.lng.toFixed(6) + '\');this.textContent=\'Copied!\'">Copy coords</button>' +
            '<button onclick="window.__pagafCenterHere(' + coords.lng + ',' + coords.lat + ')">Center here</button>' +
          '</div></div>')
        .addTo(map);
    });

    map.on('mousemove', (e) => {
      if (isDrawing || measureMode) {
        map.getCanvas().style.cursor = 'crosshair';
      }
      if (isDrawing && drawPoints.length > 0) {
        updateDrawPreviewLine(e.lngLat);
      }
      if (measureMode && measurePoints.length > 0) {
        updateMeasurePreview(e.lngLat);
      }
    });

    // Click on field to select
    map.on('click', 'fields-fill', (e) => {
      if (isDrawing || measureMode) return;
      const feature = e.features[0];
      if (feature) {
        const idx = fields.findIndex(f => f.properties.id === feature.properties.id);
        if (idx >= 0) selectField(idx);
      }
    });
    map.on('mouseenter', 'fields-fill', () => { if (!isDrawing && !measureMode) map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'fields-fill', () => { if (!isDrawing && !measureMode) map.getCanvas().style.cursor = ''; });
  }

  // Global helper for popup buttons
  window.__pagafCenterHere = function(lng, lat) {
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 800 });
  };

  function updateStatusBar() {
    const c = map.getCenter();
    const z = map.getZoom().toFixed(1);
    setEl('statusCoords', c.lat.toFixed(4) + ', ' + c.lng.toFixed(4));
    setEl('statusZoom', 'Zoom: ' + z);
  }

  function addDrawingSources() {
    map.addSource('drawn-fields', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'fields-fill', type: 'fill', source: 'drawn-fields', paint: { 'fill-color': ['case', ['boolean', ['get', 'selected'], false], '#3b82f6', '#22c55e'], 'fill-opacity': ['case', ['boolean', ['get', 'selected'], false], 0.25, 0.15] } });
    map.addLayer({ id: 'fields-line', type: 'line', source: 'drawn-fields', paint: { 'line-color': ['case', ['boolean', ['get', 'selected'], false], '#60a5fa', '#4ade80'], 'line-width': 2.5 } });
    map.addLayer({ id: 'fields-label', type: 'symbol', source: 'drawn-fields', layout: { 'text-field': ['concat', ['get', 'name'], '\n', ['get', 'acresLabel']], 'text-size': 12, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] }, paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.7)', 'text-halo-width': 1.5 } });
    map.addSource('draw-vertices', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'vertices', type: 'circle', source: 'draw-vertices', paint: { 'circle-radius': 5, 'circle-color': '#4ade80', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
    map.addSource('draw-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'draw-line-layer', type: 'line', source: 'draw-line', paint: { 'line-color': '#4ade80', 'line-width': 1.5, 'line-dasharray': [3, 3] } });
    map.addSource('rx-layer', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'rx-fill', type: 'fill', source: 'rx-layer', paint: {
      'fill-color': ['interpolate', ['linear'], ['get', 'value'], 0, '#d73027', 0.3, '#fc8d59', 0.5, '#fee08b', 0.7, '#66bd63', 1, '#1a9850'],
      'fill-opacity': 0.6
    }});
    // Highlight layer
    map.addSource('highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'highlight-line', type: 'line', source: 'highlight', paint: { 'line-color': '#f59e0b', 'line-width': 3, 'line-dasharray': [4, 2] } });
  }

  function addMeasureSources() {
    map.addSource('measure-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'measure-line-layer', type: 'line', source: 'measure-line', paint: { 'line-color': '#f59e0b', 'line-width': 2, 'line-dasharray': [4, 4] } });
    map.addSource('measure-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'measure-points-layer', type: 'circle', source: 'measure-points', paint: { 'circle-radius': 4, 'circle-color': '#f59e0b', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
  }
  /* ===== NAVBAR ===== */
  function initNavbar() {
    document.querySelectorAll('.nav-dropdown').forEach(dd => {
      dd.querySelector('.nav-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = dd.classList.contains('open');
        document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
        if (!isOpen) dd.classList.add('open');
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-dropdown')) document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    });
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const action = el.dataset.action;
        if (action === 'openFieldMapper') setActiveStep(2);
        else if (action === 'openPrescriptions') setActiveStep(3);
        else if (action === 'openExport') setActiveStep(4);
        else if (action === 'openCropHealth') { setActiveStep(3); document.querySelector('[data-app="ndvi"]')?.click(); }
        else if (action === 'openAbout') document.getElementById('aboutModal')?.classList.remove('hidden');
        else if (action === 'openDocs') document.getElementById('docsPanel')?.classList.toggle('visible');
        document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
      });
    });
    document.querySelectorAll('[data-layer-select]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); switchLayer(el.dataset.layerSelect); document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open')); });
    });
    document.querySelectorAll('[data-equip]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); setActiveStep(4); document.querySelector('.export-btn[data-fmt="' + el.dataset.equip + '"]')?.classList.add('selected'); document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open')); });
    });
    document.getElementById('getStartedBtn')?.addEventListener('click', () => { setActiveStep(1); document.getElementById('locationSearch')?.focus(); });
    document.getElementById('mobileToggle')?.addEventListener('click', () => { document.querySelector('.nav-links')?.classList.toggle('mobile-open'); });
  }

  /* ===== SIDEBAR ===== */
  function initSidebar() { document.getElementById('sidebarCollapse')?.addEventListener('click', toggleSidebar); }
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('appLayout')?.classList.toggle('sidebar-collapsed', !sidebarOpen);
    const btn = document.getElementById('sidebarCollapse');
    if (btn) btn.style.transform = sidebarOpen ? '' : 'rotate(180deg)';
    setTimeout(() => { if (map) map.resize(); }, 300);
  }

  /* ===== MODALS ===== */
  function initModals() {
    const welcomed = localStorage.getItem('pagaf_welcomed');
    const modal = document.getElementById('welcomeModal');
    if (welcomed) modal?.classList.add('hidden');
    document.getElementById('welcomeClose')?.addEventListener('click', closeWelcome);
    document.getElementById('welcomeStart')?.addEventListener('click', closeWelcome);
    function closeWelcome() {
      modal?.classList.add('hidden');
      if (document.getElementById('welcomeDontShow')?.checked) localStorage.setItem('pagaf_welcomed', '1');
      setTimeout(() => { document.getElementById('locationSearch')?.focus(); }, 300);
    }
    document.getElementById('shortcutsClose')?.addEventListener('click', () => { document.getElementById('shortcutsModal')?.classList.add('hidden'); });
    document.getElementById('aboutClose')?.addEventListener('click', () => { document.getElementById('aboutModal')?.classList.add('hidden'); });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
    });
    // Docs panel
    document.getElementById('docsClose')?.addEventListener('click', () => { document.getElementById('docsPanel')?.classList.remove('visible'); });
  }

  /* ===== KEYBOARD ===== */
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') { if (e.key === 'Escape') e.target.blur(); return; }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); return; }
        if (e.key === 'y') { e.preventDefault(); redo(); return; }
      }
      switch(e.key) {
        case 'd': case 'D': startPolygonDraw(); break;
        case 'r': case 'R': startRectDraw(); break;
        case 'm': case 'M': toggleMeasure(); break;
        case 'Escape': if (measureMode) stopMeasure(); else cancelDraw(); break;
        case 'f': case 'F': zoomToFields(); break;
        case '1': setActiveStep(1); break;
        case '2': setActiveStep(2); break;
        case '3': setActiveStep(3); break;
        case '4': setActiveStep(4); break;
        case 's': case 'S': toggleSidebar(); break;
        case '/': e.preventDefault(); document.getElementById('locationSearch')?.focus(); break;
        case '?': document.getElementById('shortcutsModal')?.classList.toggle('hidden'); break;
        case 'Delete': case 'Backspace': if (selectedFieldIdx !== null) deleteField(selectedFieldIdx); break;
        case 'l': case 'L': document.getElementById('dataLayerPanel')?.classList.toggle('visible'); break;
      }
    });
  }

  /* ===== UNDO / REDO ===== */
  function pushUndo() {
    undoStack.push(JSON.parse(JSON.stringify(fields)));
    redoStack = [];
    if (undoStack.length > 30) undoStack.shift();
  }
  function undo() {
    if (undoStack.length === 0) { showToast('Nothing to undo', 'info'); return; }
    redoStack.push(JSON.parse(JSON.stringify(fields)));
    fields = undoStack.pop();
    updateFieldsOnMap(); updateFieldsList(); updateStatusFields();
    showToast('Undo', 'info');
    saveSession();
  }
  function redo() {
    if (redoStack.length === 0) { showToast('Nothing to redo', 'info'); return; }
    undoStack.push(JSON.parse(JSON.stringify(fields)));
    fields = redoStack.pop();
    updateFieldsOnMap(); updateFieldsList(); updateStatusFields();
    showToast('Redo', 'info');
    saveSession();
  }

  /* ===== MAP TOOLBAR ===== */
  function initMapToolbar() {
    document.getElementById('mapToolDraw')?.addEventListener('click', startPolygonDraw);
    document.getElementById('mapToolRect')?.addEventListener('click', startRectDraw);
    document.getElementById('mapToolZoomField')?.addEventListener('click', zoomToFields);
    document.getElementById('mapToolFullscreen')?.addEventListener('click', toggleSidebar);
    document.getElementById('mapToolMeasure')?.addEventListener('click', toggleMeasure);
    document.getElementById('mapToolUndo')?.addEventListener('click', undo);
    document.getElementById('mapToolLayers')?.addEventListener('click', () => { document.getElementById('dataLayerPanel')?.classList.toggle('visible'); });
    document.getElementById('mapHintClose')?.addEventListener('click', () => { document.getElementById('mapHint')?.classList.add('hidden'); });
  }

  /* ===== MEASURE TOOL ===== */
  function toggleMeasure() {
    if (measureMode) { stopMeasure(); return; }
    if (isDrawing) cancelDraw();
    measureMode = true;
    measurePoints = [];
    document.getElementById('mapToolMeasure')?.classList.add('active');
    map.getCanvas().style.cursor = 'crosshair';
    showMapHint('Click points to measure distance. Double-click to finish. Press Esc to cancel.');
    clickHandler = (e) => {
      measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
      updateMeasureDisplay();
    };
    dblHandler = (e) => {
      e.preventDefault();
      finishMeasure();
    };
    map.on('click', clickHandler);
    map.on('dblclick', dblHandler);
  }

  function updateMeasurePreview(lngLat) {
    if (measurePoints.length === 0) return;
    const pts = [...measurePoints, [lngLat.lng, lngLat.lat]];
    map.getSource('measure-line')?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} }] });
  }

  function updateMeasureDisplay() {
    map.getSource('measure-points')?.setData({ type: 'FeatureCollection', features: measurePoints.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} })) });
    if (measurePoints.length >= 2) {
      map.getSource('measure-line')?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: measurePoints }, properties: {} }] });
      const line = turf.lineString(measurePoints);
      const len = turf.length(line, { units: 'miles' });
      const lenFt = turf.length(line, { units: 'feet' });
      const lenKm = turf.length(line, { units: 'kilometers' });
      showMapHint('Distance: ' + len.toFixed(2) + ' mi (' + lenFt.toFixed(0) + ' ft / ' + lenKm.toFixed(2) + ' km). Double-click to finish.');
    }
  }

  function finishMeasure() {
    if (measurePoints.length >= 2) {
      const line = turf.lineString(measurePoints);
      const len = turf.length(line, { units: 'miles' });
      showToast('Total distance: ' + len.toFixed(2) + ' miles', 'success');
    }
    stopMeasure();
  }

  function stopMeasure() {
    measureMode = false;
    measurePoints = [];
    map.getCanvas().style.cursor = '';
    document.getElementById('mapToolMeasure')?.classList.remove('active');
    document.getElementById('mapHint')?.classList.add('hidden');
    map.getSource('measure-line')?.setData({ type: 'FeatureCollection', features: [] });
    map.getSource('measure-points')?.setData({ type: 'FeatureCollection', features: [] });
    if (clickHandler) { map.off('click', clickHandler); clickHandler = null; }
    if (dblHandler) { map.off('dblclick', dblHandler); dblHandler = null; }
  }

  function zoomToFields() {
    if (!fields.length || typeof turf === 'undefined') { showToast('No fields to zoom to', 'info'); return; }
    const fc = { type: 'FeatureCollection', features: fields };
    const bbox = turf.bbox(fc);
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, duration: 1000 });
  }
  /* ===== LAYER TOGGLE ===== */
  function initLayerToggle() {
    document.querySelectorAll('.layer-btn').forEach(btn => { btn.addEventListener('click', () => { switchLayer(btn.dataset.layer); }); });
  }
  function switchLayer(layer) {
    if (layer === currentBasemap || !BASEMAPS[layer]) return;
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === layer));
    currentBasemap = layer;
    map.setStyle(BASEMAPS[layer]);
    map.once('style.load', () => {
      addDrawingSources(); addMeasureSources();
      updateFieldsOnMap();
      reapplyDataLayers();
      const labels = { naip:'NAIP Imagery (USDA)', satellite:'Satellite (Esri)', dark:'Dark Basemap', osm:'OpenStreetMap', topo:'USGS Topo' };
      setEl('statusLayer', labels[layer] || layer);
    });
    saveSession();
  }

  /* ===== DATA LAYERS ===== */
  function initDataLayers() {
    document.querySelectorAll('[data-overlay]').forEach(el => {
      el.addEventListener('change', (e) => {
        const layerKey = el.dataset.overlay;
        if (el.checked) enableDataLayer(layerKey);
        else disableDataLayer(layerKey);
      });
    });
    document.getElementById('dataLayerClose')?.addEventListener('click', () => { document.getElementById('dataLayerPanel')?.classList.remove('visible'); });
  }

  function enableDataLayer(key) {
    const cfg = DATA_LAYERS[key];
    if (!cfg || activeDataLayers[key]) return;
    const sourceId = 'overlay-' + key;
    const layerId = 'overlay-' + key + '-layer';
    if (cfg.type === 'wms') {
      const bbox = map.getBounds();
      const wmsUrl = cfg.url + '?service=WMS&version=1.1.1&request=GetMap&layers=' + cfg.layers +
        '&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&styles=&format=image/png&transparent=true';
      map.addSource(sourceId, { type: 'raster', tiles: [wmsUrl], tileSize: 256 });
      map.addLayer({ id: layerId, type: 'raster', source: sourceId, paint: { 'raster-opacity': 0.6 } }, 'fields-fill');
    }
    activeDataLayers[key] = true;
    showToast(cfg.name + ' layer enabled', 'success');
  }

  function disableDataLayer(key) {
    const sourceId = 'overlay-' + key;
    const layerId = 'overlay-' + key + '-layer';
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    activeDataLayers[key] = false;
  }

  function reapplyDataLayers() {
    Object.keys(activeDataLayers).forEach(key => {
      if (activeDataLayers[key]) {
        activeDataLayers[key] = false;
        enableDataLayer(key);
      }
    });
  }

  /* ===== WORKFLOW ===== */
  function initWorkflow() {
    document.querySelectorAll('.step-header').forEach(header => {
      header.addEventListener('click', () => { setActiveStep(parseInt(header.parentElement.dataset.step)); });
    });
  }
  function setActiveStep(step) {
    currentStep = step;
    document.querySelectorAll('.workflow-step').forEach(s => {
      const n = parseInt(s.dataset.step);
      s.classList.toggle('active', n === step);
      s.classList.toggle('completed', n < step);
    });
    if (!sidebarOpen) toggleSidebar();
  }

  /* ===== SEARCH ===== */
  function initSearch() {
    const input = document.getElementById('locationSearch');
    if (!input) return;
    let searchTimeout;
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      if (!q) return;
      // Check if it looks like coordinates
      const coordMatch = q.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          map.flyTo({ center: [lng, lat], zoom: 14, duration: 2000 });
          showToast('Navigating to coordinates', 'success');
          setActiveStep(2);
          return;
        }
      }
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + encodeURIComponent(q))
        .then(r => r.json())
        .then(data => {
          if (data.length > 0) {
            const d = data[0];
            map.flyTo({ center: [parseFloat(d.lon), parseFloat(d.lat)], zoom: 14, duration: 2000 });
            showToast('Navigated to ' + d.display_name.split(',')[0], 'success');
            setActiveStep(2);
          } else showToast('Location not found. Try a different search.', 'info');
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

  /* ===== FILE UPLOAD ===== */
  function initFileUpload() {
    const uploadBtn = document.getElementById('uploadField');
    const fileInput = document.getElementById('fileUploadInput');
    if (!uploadBtn || !fileInput) return;
    uploadBtn.addEventListener('click', () => { fileInput.click(); });
    fileInput.addEventListener('change', handleFileUpload);

    // Drag and drop on map
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.addEventListener('dragover', (e) => { e.preventDefault(); mapEl.classList.add('drag-over'); });
      mapEl.addEventListener('dragleave', () => { mapEl.classList.remove('drag-over'); });
      mapEl.addEventListener('drop', (e) => {
        e.preventDefault();
        mapEl.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
      });
    }
  }

  function handleFileUpload(e) {
    if (e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = '';
  }

  function handleFiles(fileList) {
    Array.from(fileList).forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();
      if (ext === 'geojson' || ext === 'json') {
        reader.onload = (e) => {
          try {
            const geojson = JSON.parse(e.target.result);
            importGeoJSON(geojson, file.name);
          } catch(err) { showToast('Invalid GeoJSON file', 'error'); }
        };
        reader.readAsText(file);
      } else if (ext === 'kml') {
        reader.onload = (e) => {
          try {
            const parser = new DOMParser();
            const kml = parser.parseFromString(e.target.result, 'text/xml');
            const geojson = kmlToGeoJSON(kml);
            importGeoJSON(geojson, file.name);
          } catch(err) { showToast('Invalid KML file', 'error'); }
        };
        reader.readAsText(file);
      } else if (ext === 'zip') {
        showToast('Processing Shapefile ZIP...', 'info');
        reader.onload = async (e) => {
          try {
            if (typeof shp !== 'undefined') {
              const geojson = await shp(e.target.result);
              importGeoJSON(geojson, file.name);
            } else {
              showToast('Shapefile reader loading... try again in a moment', 'info');
            }
          } catch(err) { showToast('Error reading Shapefile: ' + err.message, 'error'); }
        };
        reader.readAsArrayBuffer(file);
      } else {
        showToast('Unsupported format: .' + ext + '. Use .geojson, .kml, or .zip (Shapefile)', 'info');
      }
    });
  }

  function importGeoJSON(geojson, filename) {
    pushUndo();
    let count = 0;
    const features = geojson.type === 'FeatureCollection' ? geojson.features :
                     geojson.type === 'Feature' ? [geojson] :
                     [{ type: 'Feature', geometry: geojson, properties: {} }];
    features.forEach(f => {
      if (!f.geometry) return;
      if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
        const polys = f.geometry.type === 'MultiPolygon' ?
          f.geometry.coordinates.map(c => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: c }, properties: { ...f.properties } })) : [f];
        polys.forEach(poly => {
          const field = { type: 'Feature', geometry: poly.geometry, properties: {
            name: poly.properties.name || poly.properties.NAME || ('Imported ' + fieldIdCounter),
            id: 'field_' + Date.now() + '_' + fieldIdCounter,
            source: filename
          }};
          if (typeof turf !== 'undefined') {
            const area = turf.area(field);
            field.properties.acres = (area * 0.000247105).toFixed(1);
            field.properties.acresLabel = field.properties.acres + ' ac';
          }
          fields.push(field);
          fieldIdCounter++;
          count++;
        });
      }
    });
    updateFieldsOnMap(); updateFieldsList(); updateStatusFields();
    if (count > 0) {
      showToast('Imported ' + count + ' field(s) from ' + filename, 'success');
      zoomToFields();
      setActiveStep(3);
      saveSession();
    } else {
      showToast('No polygon features found in file', 'info');
    }
  }

  function kmlToGeoJSON(kmlDoc) {
    const features = [];
    const placemarks = kmlDoc.querySelectorAll('Placemark');
    placemarks.forEach(pm => {
      const name = pm.querySelector('name')?.textContent || 'Unnamed';
      const coordsEl = pm.querySelector('coordinates');
      if (!coordsEl) return;
      const coordStr = coordsEl.textContent.trim();
      const coords = coordStr.split(/\s+/).map(c => {
        const [lng, lat, alt] = c.split(',').map(Number);
        return [lng, lat];
      }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
      if (coords.length >= 3) {
        if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) coords.push(coords[0]);
        features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: { name: name } });
      }
    });
    return { type: 'FeatureCollection', features: features };
  }
  /* ===== DRAWING ===== */
  function initDrawTools() {
    document.getElementById('drawPolygon')?.addEventListener('click', startPolygonDraw);
    document.getElementById('drawRect')?.addEventListener('click', startRectDraw);
    document.getElementById('clearDraw')?.addEventListener('click', clearAllFields);
  }

  function showMapHint(text) {
    const hint = document.getElementById('mapHint');
    const hintText = document.getElementById('mapHintText');
    if (hint && hintText) { hintText.textContent = text; hint.classList.remove('hidden'); }
  }

  function cancelDraw() {
    if (!isDrawing) return;
    isDrawing = false; drawMode = null; drawPoints = [];
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
    if (measureMode) stopMeasure();
    isDrawing = true; drawMode = 'polygon'; drawPoints = [];
    document.getElementById('drawPolygon')?.classList.add('active');
    document.getElementById('mapToolDraw')?.classList.add('active');
    map.getCanvas().style.cursor = 'crosshair';
    showMapHint('Click on the map to place field corners. Double-click to finish. Esc to cancel.');
    clickHandler = (e) => {
      if (!isDrawing) return;
      drawPoints.push([e.lngLat.lng, e.lngLat.lat]);
      updateDrawPreview();
      if (drawPoints.length >= 3) {
        const coords = [...drawPoints, drawPoints[0]];
        const area = turf.area(turf.polygon([coords]));
        const acres = (area * 0.000247105).toFixed(1);
        showMapHint(drawPoints.length + ' points | ~' + acres + ' acres. Double-click to finish.');
      }
    };
    dblHandler = (e) => {
      if (!isDrawing || drawPoints.length < 3) return;
      e.preventDefault();
      isDrawing = false; drawMode = null;
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
    if (measureMode) stopMeasure();
    isDrawing = true; drawMode = 'rect'; drawPoints = [];
    document.getElementById('drawRect')?.classList.add('active');
    document.getElementById('mapToolRect')?.classList.add('active');
    map.getCanvas().style.cursor = 'crosshair';
    showMapHint('Click two opposite corners to define the field rectangle.');
    let clicks = 0;
    clickHandler = (e) => {
      clicks++;
      drawPoints.push([e.lngLat.lng, e.lngLat.lat]);
      if (clicks === 2) {
        isDrawing = false; drawMode = null;
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
    map.getSource('draw-vertices')?.setData({ type: 'FeatureCollection', features: drawPoints.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} })) });
    if (drawPoints.length >= 2) {
      map.getSource('draw-line')?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [...drawPoints, drawPoints[0]] }, properties: {} }] });
    }
  }

  function updateDrawPreviewLine(lngLat) {
    if (drawPoints.length < 1) return;
    const previewCoords = [...drawPoints, [lngLat.lng, lngLat.lat]];
    if (drawPoints.length >= 2) previewCoords.push(drawPoints[0]);
    map.getSource('draw-line')?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: previewCoords }, properties: {} }] });
  }

  function finishField() {
    if (drawPoints.length < 3) return;
    pushUndo();
    const coords = [...drawPoints, drawPoints[0]];
    const polygon = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {
      name: 'Field ' + fieldIdCounter,
      id: 'field_' + Date.now(),
      color: '#22c55e'
    }};
    if (typeof turf !== 'undefined') {
      const area = turf.area(polygon);
      polygon.properties.acres = (area * 0.000247105).toFixed(1);
      polygon.properties.acresLabel = polygon.properties.acres + ' ac';
      const centroid = turf.centroid(polygon);
      polygon.properties.centroid = centroid.geometry.coordinates;
      const perimeter = turf.length(turf.lineString(coords), { units: 'feet' });
      polygon.properties.perimeter = perimeter.toFixed(0);
    }
    fields.push(polygon);
    fieldIdCounter++;
    drawPoints = [];
    updateFieldsOnMap(); updateFieldsList(); updateStatusFields();
    showToast('Field ' + (fields.length) + ' added (' + (polygon.properties.acres || '?') + ' acres)', 'success');
    if (typeof turf !== 'undefined') {
      const bbox = turf.bbox(polygon);
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, duration: 800 });
    }
    if (fields.length >= 1) setActiveStep(3);
    saveSession();
  }

  function updateFieldsOnMap() {
    const features = fields.map((f, i) => ({
      ...f,
      properties: { ...f.properties, selected: i === selectedFieldIdx }
    }));
    map.getSource('drawn-fields')?.setData({ type: 'FeatureCollection', features: features });
    map.getSource('draw-vertices')?.setData({ type: 'FeatureCollection', features: [] });
    map.getSource('draw-line')?.setData({ type: 'FeatureCollection', features: [] });
  }

  function selectField(idx) {
    selectedFieldIdx = (selectedFieldIdx === idx) ? null : idx;
    updateFieldsOnMap();
    updateFieldsList();
    if (selectedFieldIdx !== null) {
      const field = fields[selectedFieldIdx];
      showFieldProperties(field);
      if (typeof turf !== 'undefined') {
        const bbox = turf.bbox(field);
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 100, duration: 800 });
      }
    } else {
      document.getElementById('fieldPropsPanel')?.classList.remove('visible');
    }
  }

  function deleteField(idx) {
    if (idx < 0 || idx >= fields.length) return;
    pushUndo();
    const name = fields[idx].properties.name;
    fields.splice(idx, 1);
    selectedFieldIdx = null;
    updateFieldsOnMap(); updateFieldsList(); updateStatusFields();
    document.getElementById('fieldPropsPanel')?.classList.remove('visible');
    showToast(name + ' deleted', 'info');
    saveSession();
  }

  function initFieldProperties() {
    document.getElementById('fieldPropsClose')?.addEventListener('click', () => {
      document.getElementById('fieldPropsPanel')?.classList.remove('visible');
      selectedFieldIdx = null;
      updateFieldsOnMap();
    });
    document.getElementById('fieldPropsSave')?.addEventListener('click', saveFieldProperties);
    document.getElementById('fieldPropsDelete')?.addEventListener('click', () => {
      if (selectedFieldIdx !== null) deleteField(selectedFieldIdx);
    });
  }

  function showFieldProperties(field) {
    const panel = document.getElementById('fieldPropsPanel');
    if (!panel) return;
    panel.classList.add('visible');
    const nameInput = document.getElementById('fieldNameInput');
    if (nameInput) nameInput.value = field.properties.name || '';
    setEl('fieldPropsAcres', (field.properties.acres || '—') + ' acres');
    setEl('fieldPropsPerimeter', (field.properties.perimeter ? (parseFloat(field.properties.perimeter)/5280).toFixed(2) + ' mi' : '—'));
    const centroid = field.properties.centroid || (typeof turf !== 'undefined' ? turf.centroid(field).geometry.coordinates : null);
    setEl('fieldPropsCentroid', centroid ? centroid[1].toFixed(5) + ', ' + centroid[0].toFixed(5) : '—');
    setEl('fieldPropsSource', field.properties.source || 'Drawn on map');
  }

  function saveFieldProperties() {
    if (selectedFieldIdx === null) return;
    pushUndo();
    const nameInput = document.getElementById('fieldNameInput');
    if (nameInput) fields[selectedFieldIdx].properties.name = nameInput.value || ('Field ' + (selectedFieldIdx + 1));
    updateFieldsOnMap(); updateFieldsList();
    showToast('Field properties saved', 'success');
    saveSession();
  }

  function updateFieldsList() {
    const el = document.getElementById('fieldsList');
    if (!el) return;
    if (fields.length === 0) {
      el.innerHTML = '<div class="fields-empty"><p>No fields drawn yet</p><span>Click "Draw Field" or drag & drop a GeoJSON/KML file</span></div>';
      return;
    }
    el.innerHTML = fields.map((f, i) =>
      '<div class="field-item' + (i === selectedFieldIdx ? ' selected' : '') + '" data-idx="' + i + '">' +
        '<div class="field-item-left">' +
          '<span class="field-color-dot" style="background:' + (i === selectedFieldIdx ? '#3b82f6' : '#22c55e') + '"></span>' +
          '<span class="field-name">' + f.properties.name + '</span>' +
        '</div>' +
        '<div class="field-item-right">' +
          '<span class="field-acres">' + (f.properties.acres || '?') + ' ac</span>' +
          '<button class="field-zoom" data-idx="' + i + '" title="Zoom to field">⌖</button>' +
          '<button class="field-remove" data-idx="' + i + '" title="Delete field">×</button>' +
        '</div>' +
      '</div>'
    ).join('');
    el.querySelectorAll('.field-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.field-remove') || e.target.closest('.field-zoom')) return;
        selectField(parseInt(item.dataset.idx));
      });
    });
    el.querySelectorAll('.field-remove').forEach(btn => {
      btn.addEventListener('click', () => { deleteField(parseInt(btn.dataset.idx)); });
    });
    el.querySelectorAll('.field-zoom').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const field = fields[idx];
        if (field && typeof turf !== 'undefined') {
          const bbox = turf.bbox(field);
          map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 100, duration: 800 });
        }
      });
    });
  }

  function updateStatusFields() {
    const total = fields.reduce((s, f) => s + parseFloat(f.properties.acres || 0), 0);
    setEl('statusFields', fields.length + ' field' + (fields.length !== 1 ? 's' : ''));
    setEl('statusAcres', total.toFixed(1) + ' acres');
  }

  function clearAllFields() {
    if (fields.length === 0) { showToast('No fields to clear', 'info'); return; }
    pushUndo();
    fields = []; drawPoints = []; isDrawing = false; drawMode = null; selectedFieldIdx = null;
    map.getCanvas().style.cursor = '';
    updateFieldsOnMap(); updateFieldsList(); updateStatusFields();
    map.getSource('rx-layer')?.setData({ type: 'FeatureCollection', features: [] });
    document.getElementById('resultsPanel')?.classList.remove('visible');
    document.getElementById('fieldPropsPanel')?.classList.remove('visible');
    document.querySelectorAll('.tool-btn, .map-tool').forEach(b => b.classList.remove('active'));
    document.getElementById('mapHint')?.classList.add('hidden');
    showToast('All fields cleared', 'info');
    setActiveStep(1);
    saveSession();
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
    body.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Analyzing ' + fields.length + ' field(s) with nltGIS.ai...</p></div>';
    if (!document.getElementById('spin-style')) {
      const s = document.createElement('style');
      s.id = 'spin-style';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}.loading-spinner{width:28px;height:28px;border:3px solid var(--navy-600);border-top-color:var(--green-500);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}.loading-state{text-align:center;padding:30px}.loading-state p{color:var(--slate-400);margin-top:12px;font-size:12px}';
      document.head.appendChild(s);
    }
    setTimeout(() => {
      body.innerHTML = generateResults(appType);
      generatePrescriptionGrid(appType);
    }, 1200);
  }

  function generateResults(appType) {
    const totalAcres = fields.reduce((s, f) => s + parseFloat(f.properties.acres || 0), 0).toFixed(1);
    const configs = {
      ndvi: [
        { title: 'Average NDVI', value: (0.55 + Math.random() * 0.3).toFixed(2), desc: 'Across ' + totalAcres + ' acres — healthy range is 0.6–0.9', pct: 72 },
        { title: 'Stress Zones', value: Math.ceil(Math.random() * 4), desc: 'Areas below 0.45 threshold detected', pct: 15, cls: 'bar-yellow' },
        { title: 'Data Source', desc: 'Simulated Sentinel-2 L2A via nltGIS.ai analysis engine' }
      ],
      seeding: [
        { title: 'Recommended Rate', value: Math.round(30 + Math.random() * 8) + 'K seeds/ac', desc: 'Variable-rate across ' + totalAcres + ' acres' },
        { title: 'Management Zones', value: Math.ceil(Math.random() * 5 + 2), desc: 'Based on yield potential + soil variability', pct: 81 },
        { title: 'Potential Savings', value: '$' + (8 + Math.random() * 12).toFixed(2) + '/ac', desc: 'Compared to flat-rate seeding', color: '#4ade80' }
      ],
      fertilizer: [
        { title: 'Nitrogen Rx', value: Math.round(130 + Math.random() * 60) + ' lb/ac', desc: 'Variable-rate N application map' },
        { title: 'Phosphorus', value: Math.round(30 + Math.random() * 30) + ' lb/ac', desc: 'Based on soil test interpolation', pct: 60 },
        { title: 'Est. Cost', value: '$' + Math.round(70 + Math.random() * 40) + '/ac', desc: 'Based on current input prices' }
      ],
      pesticide: [
        { title: 'Spray Zones', value: Math.ceil(Math.random() * 5 + 2) + ' zones', desc: 'Targeted application areas' },
        { title: 'Coverage', value: Math.round(40 + Math.random() * 40) + '%', desc: 'Only treating needed areas', pct: 62 },
        { title: 'Savings', value: Math.round(20 + Math.random() * 30) + '%', desc: 'vs. blanket application', color: '#4ade80' }
      ],
      fungicide: [
        { title: 'Disease Risk', value: ['Low', 'Moderate', 'Moderate-High'][Math.floor(Math.random() * 3)], desc: 'Weather + crop stage model', pct: 55 },
        { title: 'Application Rate', value: Math.round(4 + Math.random() * 6) + ' oz/ac', desc: 'Targeted to high-risk zones' },
        { title: 'Optimal Window', value: Math.ceil(Math.random() * 5 + 1) + '-' + Math.ceil(Math.random() * 4 + 5) + ' days', desc: 'Apply before next rain event' }
      ],
      yield: [
        { title: 'Predicted Yield', value: Math.round(160 + Math.random() * 50) + ' bu/ac', desc: 'Satellite + weather models', pct: 87 },
        { title: 'Revenue Est.', value: '$' + Math.round(160 * 4.5 * parseFloat(totalAcres)).toLocaleString(), desc: totalAcres + ' ac at ~$4.50/bu corn', color: '#4ade80' },
        { title: 'Confidence', value: Math.round(78 + Math.random() * 15) + '%', desc: 'Model confidence interval', pct: 89 }
      ]
    };
    const items = configs[appType] || configs.ndvi;
    return '<div class="results-app-header"><span class="results-app-icon">' + (PRESCRIPTIONS[appType]?.icon || '📊') + '</span><h3>' + (PRESCRIPTIONS[appType]?.name || appType) + '</h3></div>' +
      items.map(i => {
        let bar = '';
        if (i.pct !== undefined) bar = '<div class="analysis-bar"><div class="analysis-bar-fill ' + (i.cls || 'bar-green') + '" style="width:' + i.pct + '%"></div></div>';
        return '<div class="analysis-item"><h4>' + i.title + '</h4>' +
          (i.value ? '<div class="value-lg"' + (i.color ? ' style="color:' + i.color + '"' : '') + '>' + i.value + '</div>' : '') +
          '<p>' + i.desc + '</p>' + bar + '</div>';
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
    } catch(e) { console.warn('Rx grid error:', e); }
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
    document.getElementById('resultsExportBtn')?.addEventListener('click', () => { if (fields.length === 0) return; exportFields(selectedExport || 'geojson'); });
    document.getElementById('resultsClose')?.addEventListener('click', () => {
      document.getElementById('resultsPanel')?.classList.remove('visible');
      map.getSource('rx-layer')?.setData({ type: 'FeatureCollection', features: [] });
    });
  }

  function exportFields(fmt) {
    const fc = { type: 'FeatureCollection', features: fields.map(f => ({
      ...f, properties: { ...f.properties, selected: undefined, centroid: undefined }
    }))};
    const labels = { geojson:'GeoJSON', shapefile:'Shapefile', kml:'KML', csv:'CSV', geotiff:'GeoTIFF', geopackage:'GeoPackage', isoxml:'ISO-XML (ISOBUS)', johndeere:'John Deere', cnh:'Case IH/NH', trimble:'Trimble/AgLeader' };

    if (fmt === 'geojson') {
      downloadBlob(JSON.stringify(fc, null, 2), 'pagaf_fields.geojson', 'application/geo+json');
      showToast('Downloaded pagaf_fields.geojson', 'success');
    } else if (fmt === 'kml') {
      const kml = geoJSONtoKML(fc);
      downloadBlob(kml, 'pagaf_fields.kml', 'application/vnd.google-earth.kml+xml');
      showToast('Downloaded pagaf_fields.kml', 'success');
    } else if (fmt === 'csv') {
      const csv = geoJSONtoCSV(fc);
      downloadBlob(csv, 'pagaf_fields.csv', 'text/csv');
      showToast('Downloaded pagaf_fields.csv', 'success');
    } else if (fmt === 'isoxml') {
      const xml = geoJSONtoISOXML(fc);
      downloadBlob(xml, 'pagaf_taskdata.xml', 'application/xml');
      showToast('Downloaded ISO-XML TaskData', 'success');
    } else if (fmt === 'shapefile') {
      if (typeof shpwrite !== 'undefined') {
        try {
          const options = { folder: 'pagaf_fields', types: { polygon: 'pagaf_fields' } };
          shpwrite.download(fc, options);
          showToast('Shapefile download started', 'success');
        } catch(e) { showToast('Shapefile export error. Try GeoJSON.', 'error'); }
      } else {
        showToast('Shapefile library loading... try again', 'info');
      }
    } else {
      showToast((labels[fmt] || fmt) + ' export: use GeoJSON → convert with QGIS or ogr2ogr', 'info');
    }
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function geoJSONtoKML(fc) {
    let kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>PAGAF Fields Export</name>\n';
    kml += '<Style id="fieldStyle"><PolyStyle><color>5000ff00</color><outline>1</outline></PolyStyle><LineStyle><color>ff00ff00</color><width>2</width></LineStyle></Style>\n';
    fc.features.forEach(f => {
      const coords = f.geometry.coordinates[0].map(c => c[0] + ',' + c[1] + ',0').join(' ');
      kml += '<Placemark>\n<name>' + (f.properties.name || 'Field') + '</name>\n<styleUrl>#fieldStyle</styleUrl>\n';
      kml += '<ExtendedData><Data name="acres"><value>' + (f.properties.acres || '') + '</value></Data></ExtendedData>\n';
      kml += '<Polygon><outerBoundaryIs><LinearRing><coordinates>' + coords + '</coordinates></LinearRing></outerBoundaryIs></Polygon>\n</Placemark>\n';
    });
    kml += '</Document>\n</kml>';
    return kml;
  }

  function geoJSONtoCSV(fc) {
    let csv = 'name,acres,perimeter_ft,centroid_lat,centroid_lng,vertices\n';
    fc.features.forEach(f => {
      const centroid = typeof turf !== 'undefined' ? turf.centroid(f).geometry.coordinates : [0, 0];
      csv += '"' + (f.properties.name || '') + '",' + (f.properties.acres || '') + ',' + (f.properties.perimeter || '') + ',' + centroid[1].toFixed(6) + ',' + centroid[0].toFixed(6) + ',' + (f.geometry.coordinates[0].length - 1) + '\n';
    });
    return csv;
  }

  function geoJSONtoISOXML(fc) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ISO11783_TaskData VersionMajor="4" VersionMinor="3" DataTransferOrigin="1">\n';
    fc.features.forEach((f, i) => {
      const id = 'PFD' + String(i + 1).padStart(4, '0');
      xml += '<PFD A="' + id + '" C="' + (f.properties.name || 'Field') + '" D="' + (f.properties.acres || '0') + '">\n';
      xml += '<PLN A="1" B="1">\n<LSG A="1" B="1" C="1">\n';
      f.geometry.coordinates[0].forEach(c => {
        xml += '<PNT A="2" C="' + c[1].toFixed(9) + '" D="' + c[0].toFixed(9) + '"/>\n';
      });
      xml += '</LSG>\n</PLN>\n</PFD>\n';
    });
    xml += '</ISO11783_TaskData>';
    return xml;
  }

  /* ===== UTILS ===== */
  function setEl(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

  function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✓', info: 'ℹ', error: '✕', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span>' + msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-8px)'; }, 3500);
    setTimeout(() => { toast.remove(); }, 4000);
  }

})();
