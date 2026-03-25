/* PAGAF — Interactive Map & Analysis Engine — Powered by nltGIS.ai */
document.addEventListener('DOMContentLoaded', () => {

  // ===== Mobile Nav =====
  const navToggle = document.getElementById('navToggle');
  const navbar = document.getElementById('navbar');
  navToggle?.addEventListener('click', () => navbar?.classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navbar?.classList.remove('open')));

  // ===== Smooth Scroll =====
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // ===== Scroll Animations =====
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('animate-in'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  const style = document.createElement('style');
  style.textContent = '.animate-in{opacity:1!important;transform:translateY(0)!important}';
  document.head.appendChild(style);
  document.querySelectorAll('.step-card,.feature-card,.tool-card,.section-header,.tech-layout,.mission-layout').forEach((el, i) => {
    el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease ' + (i % 3) * 0.1 + 's, transform 0.6s ease ' + (i % 3) * 0.1 + 's';
    obs.observe(el);
  });

  // ===== MapLibre GL Map =====
  if (typeof maplibregl === 'undefined') { console.warn('MapLibre GL not loaded'); return; }

  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [-98.5, 39.8],
    zoom: 4,
    pitch: 0,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

  // State
  let isDrawing = false;
  let drawPoints = [];
  let drawnPolygon = null;
  let currentTool = 'polygon';

  // ===== Drawing on Map =====
  map.on('load', () => {
    // Add source for drawn field
    map.addSource('drawn-field', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    map.addLayer({
      id: 'drawn-field-fill', type: 'fill', source: 'drawn-field',
      paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 }
    });
    map.addLayer({
      id: 'drawn-field-line', type: 'line', source: 'drawn-field',
      paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-dasharray': [2, 1] }
    });

    // Add source for draw points
    map.addSource('draw-points', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    map.addLayer({
      id: 'draw-points-layer', type: 'circle', source: 'draw-points',
      paint: { 'circle-radius': 5, 'circle-color': '#4ade80', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
    });

    // Add source for NDVI visualization
    map.addSource('ndvi-layer', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    map.addLayer({
      id: 'ndvi-fill', type: 'fill', source: 'ndvi-layer',
      paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'ndvi'],
        0.1, '#ff4444', 0.3, '#ffaa00', 0.5, '#88cc44', 0.7, '#22c55e', 0.9, '#006600'
      ], 'fill-opacity': 0.6 }
    });

    // Fly to US corn belt on load with a slight delay
    setTimeout(() => {
      map.flyTo({ center: [-93.5, 41.5], zoom: 5.5, pitch: 30, duration: 3000 });
    }, 1500);
  });

  // Drawing click handler
  map.on('click', (e) => {
    if (!isDrawing) return;
    const pt = [e.lngLat.lng, e.lngLat.lat];
    drawPoints.push(pt);

    // Update points display
    map.getSource('draw-points').setData({
      type: 'FeatureCollection',
      features: drawPoints.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} }))
    });

    // If 3+ points, show polygon preview
    if (drawPoints.length >= 3) {
      const coords = [...drawPoints, drawPoints[0]];
      drawnPolygon = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
      map.getSource('drawn-field').setData({ type: 'FeatureCollection', features: [drawnPolygon] });
    }
  });

  // Double click to finish drawing
  map.on('dblclick', (e) => {
    if (!isDrawing || drawPoints.length < 3) return;
    e.preventDefault();
    isDrawing = false;
    map.getCanvas().style.cursor = '';

    // Calculate area
    if (typeof turf !== 'undefined' && drawnPolygon) {
      const area = turf.area(drawnPolygon);
      const acres = (area * 0.000247105).toFixed(1);
      document.getElementById('fieldInfo').innerHTML =
        '<div style="text-align:center"><p style="font-size:24px;font-weight:900;color:white;margin-bottom:4px">' + acres + '</p>' +
        '<p style="font-size:11px;color:#94a3b8">Acres drawn</p>' +
        '<p style="font-size:11px;color:#4ade80;margin-top:8px">Field ready for analysis</p></div>';

      // Zoom to the field
      const bbox = turf.bbox(drawnPolygon);
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, duration: 1000 });
    }

    document.getElementById('drawPolygon').classList.remove('active');
  });

  // Draw tool buttons
  document.getElementById('drawPolygon')?.addEventListener('click', () => {
    isDrawing = true;
    currentTool = 'polygon';
    drawPoints = [];
    map.getCanvas().style.cursor = 'crosshair';
    document.getElementById('drawPolygon').classList.add('active');
    document.getElementById('fieldInfo').innerHTML = '<p class="field-info-placeholder">Click on map to draw corners. Double-click to finish.</p>';
  });

  document.getElementById('drawPoint')?.addEventListener('click', () => {
    currentTool = 'point';
    isDrawing = false;
    map.getCanvas().style.cursor = 'crosshair';
    map.once('click', (e) => {
      new maplibregl.Marker({ color: '#22c55e' }).setLngLat(e.lngLat).addTo(map);
      map.getCanvas().style.cursor = '';
    });
  });

  document.getElementById('clearDraw')?.addEventListener('click', () => {
    isDrawing = false;
    drawPoints = [];
    drawnPolygon = null;
    map.getCanvas().style.cursor = '';
    map.getSource('drawn-field')?.setData({ type: 'FeatureCollection', features: [] });
    map.getSource('draw-points')?.setData({ type: 'FeatureCollection', features: [] });
    map.getSource('ndvi-layer')?.setData({ type: 'FeatureCollection', features: [] });
    document.getElementById('fieldInfo').innerHTML = '<p class="field-info-placeholder">Draw a field boundary to get started</p>';
    document.getElementById('analysisPanel')?.classList.remove('visible');
    document.getElementById('drawPolygon')?.classList.remove('active');
  });

  // ===== Query / Analysis =====
  function runAnalysis(queryType) {
    const panel = document.getElementById('analysisPanel');
    const body = document.getElementById('analysisBody');
    if (!panel || !body) return;

    // Show loading
    panel.classList.add('visible');
    body.innerHTML = '<div style="text-align:center;padding:40px"><div style="width:32px;height:32px;border:3px solid #1e293b;border-top:3px solid #22c55e;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto"></div><p style="color:#94a3b8;margin-top:12px;font-size:13px">Analyzing with nltGIS.ai...</p></div>';

    // Add spin animation
    if (!document.getElementById('spin-style')) {
      const s = document.createElement('style');
      s.id = 'spin-style';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }

    // Simulate analysis after delay
    setTimeout(() => {
      if (queryType === 'ndvi' || queryType.includes('ndvi') || queryType.includes('NDVI') || queryType.includes('crop') || queryType.includes('health')) {
        showNDVIResults(body);
        if (drawnPolygon) generateNDVIGrid();
      } else if (queryType === 'soil' || queryType.includes('soil') || queryType.includes('moisture')) {
        showSoilResults(body);
      } else if (queryType === 'weather' || queryType.includes('weather') || queryType.includes('forecast')) {
        showWeatherResults(body);
      } else if (queryType === 'yield' || queryType.includes('yield') || queryType.includes('estimate')) {
        showYieldResults(body);
      } else {
        showNDVIResults(body);
        if (drawnPolygon) generateNDVIGrid();
      }
    }, 1800);
  }

  function showNDVIResults(body) {
    body.innerHTML =
      '<div class="analysis-item"><h4>NDVI Vegetation Index</h4><div class="value-lg">0.72</div><p>Healthy — above average for this region</p><div class="analysis-bar"><div class="analysis-bar-fill bar-green" style="width:72%"></div></div></div>' +
      '<div class="analysis-item"><h4>Field Health Score</h4><div class="value-lg">B+</div><p>85th percentile for corn in this zone</p><div class="analysis-bar"><div class="analysis-bar-fill bar-green" style="width:85%"></div></div></div>' +
      '<div class="analysis-item"><h4>Problem Areas Detected</h4><div class="value-lg" style="color:#facc15">2</div><p>Potential stress zones in NW corner. Recommend soil sampling.</p><div class="analysis-bar"><div class="analysis-bar-fill bar-yellow" style="width:15%"></div></div></div>' +
      '<div class="analysis-item"><h4>Data Source</h4><p>Sentinel-2 L2A, acquired 3 days ago via nltGIS.ai</p></div>';
  }

  function showSoilResults(body) {
    body.innerHTML =
      '<div class="analysis-item"><h4>Soil Moisture Index</h4><div class="value-lg">0.45</div><p>Moderate moisture — adequate for current growth stage</p><div class="analysis-bar"><div class="analysis-bar-fill bar-green" style="width:45%"></div></div></div>' +
      '<div class="analysis-item"><h4>Soil Type</h4><div class="value-lg" style="font-size:20px">Mollisol</div><p>Rich, dark prairie soil. Excellent for corn and soybean.</p></div>' +
      '<div class="analysis-item"><h4>Drainage Class</h4><p>Well-drained. No irrigation recommended at this time.</p></div>';
  }

  function showWeatherResults(body) {
    body.innerHTML =
      '<div class="analysis-item"><h4>7-Day Forecast</h4><div class="value-lg">72°F</div><p>Partly cloudy. 0.3" rain expected Thursday.</p></div>' +
      '<div class="analysis-item"><h4>Growing Degree Days</h4><div class="value-lg">1,240</div><p>On track for V8 growth stage.</p><div class="analysis-bar"><div class="analysis-bar-fill bar-green" style="width:62%"></div></div></div>' +
      '<div class="analysis-item"><h4>Frost Risk</h4><div class="value-lg" style="color:#4ade80">None</div><p>No frost risk in next 14 days.</p></div>';
  }

  function showYieldResults(body) {
    body.innerHTML =
      '<div class="analysis-item"><h4>Predicted Yield</h4><div class="value-lg">187 bu/ac</div><p>Above county average (172 bu/ac)</p><div class="analysis-bar"><div class="analysis-bar-fill bar-green" style="width:87%"></div></div></div>' +
      '<div class="analysis-item"><h4>Revenue Estimate</h4><div class="value-lg" style="color:#4ade80">$842/ac</div><p>At current corn futures price ($4.50/bu)</p></div>' +
      '<div class="analysis-item"><h4>Confidence</h4><p>High (89%) — based on satellite imagery + weather models via nltGIS.ai</p><div class="analysis-bar"><div class="analysis-bar-fill bar-green" style="width:89%"></div></div></div>';
  }

  function generateNDVIGrid() {
    if (!drawnPolygon || typeof turf === 'undefined') return;
    try {
      const bbox = turf.bbox(drawnPolygon);
      const grid = turf.pointGrid(bbox, 0.002, { units: 'degrees' });
      const withinField = turf.pointsWithinPolygon(grid, drawnPolygon);
      const ndviFeatures = withinField.features.map(f => {
        const ndvi = 0.4 + Math.random() * 0.5;
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [
          [[f.geometry.coordinates[0]-0.001, f.geometry.coordinates[1]-0.001],
           [f.geometry.coordinates[0]+0.001, f.geometry.coordinates[1]-0.001],
           [f.geometry.coordinates[0]+0.001, f.geometry.coordinates[1]+0.001],
           [f.geometry.coordinates[0]-0.001, f.geometry.coordinates[1]+0.001],
           [f.geometry.coordinates[0]-0.001, f.geometry.coordinates[1]-0.001]]
        ]}, properties: { ndvi: ndvi } };
      });
      map.getSource('ndvi-layer')?.setData({ type: 'FeatureCollection', features: ndviFeatures });
    } catch (err) { console.log('NDVI grid error:', err); }
  }

  // Query bar handlers
  document.getElementById('queryBtn')?.addEventListener('click', () => {
    const q = document.getElementById('queryInput')?.value || 'ndvi';
    runAnalysis(q);
  });
  document.getElementById('queryInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { runAnalysis(e.target.value || 'ndvi'); }
  });
  document.querySelectorAll('.suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.query || 'ndvi';
      document.getElementById('queryInput').value = btn.textContent;
      runAnalysis(q);
    });
  });

  // Analysis panel close
  document.getElementById('analysisClose')?.addEventListener('click', () => {
    document.getElementById('analysisPanel')?.classList.remove('visible');
  });

  console.log('🌿 PAGAF — Precision AG for All Farmers');
  console.log('   Powered by nltGIS.ai — AI-Native Spatial Intelligence');
});
