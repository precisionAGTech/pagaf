/* PAGAF — Interactive Map & Analysis Engine — Powered by nltGIS.ai */
document.addEventListener('DOMContentLoaded', () => {

  // ===== Mobile Nav =====
  const navToggle = document.getElementById('navToggle');
  const navbar = document.getElementById('navbar');
  navToggle?.addEventListener('click', () => navbar?.classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(l =>
    l.addEventListener('click', () => navbar?.classList.remove('open'))
  );

  // ===== Smooth Scroll =====
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // ===== Scroll Animations =====
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('animate-in'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  const animStyle = document.createElement('style');
  animStyle.textContent = '.animate-in{opacity:1!important;transform:translateY(0)!important}';
  document.head.appendChild(animStyle);
  document.querySelectorAll('.step-card,.feature-card,.tool-card,.section-header,.tech-layout,.mission-layout,.code-block-wrapper').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.6s ease ${(i % 4) * 0.08}s, transform 0.6s ease ${(i % 4) * 0.08}s`;
    obs.observe(el);
  });

  // ===== MapLibre GL Map =====
  // Use requestAnimationFrame to ensure DOM is fully laid out
  requestAnimationFrame(() => {
    initMap();
  });

  function initMap() {
    if (typeof maplibregl === 'undefined') {
      console.warn('MapLibre GL JS not loaded — retrying in 500ms');
      setTimeout(initMap, 500);
      return;
    }
    const container = document.getElementById('map');
    if (!container) {
      console.warn('Map container not found');
      return;
    }

    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-95.7, 39.8],
      zoom: 4,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 2
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    // State
    let isDrawing = false;
    let drawPoints = [];
    let drawnPolygon = null;

    map.on('load', () => {
      // Drawn field layers
      map.addSource('drawn-field', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'drawn-field-fill', type: 'fill', source: 'drawn-field',
        paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 }
      });
      map.addLayer({
        id: 'drawn-field-line', type: 'line', source: 'drawn-field',
        paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-dasharray': [2, 1] }
      });

      // Draw points layer
      map.addSource('draw-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'draw-points-layer', type: 'circle', source: 'draw-points',
        paint: { 'circle-radius': 5, 'circle-color': '#4ade80', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
      });

      // NDVI visualization layer
      map.addSource('ndvi-layer', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'ndvi-fill', type: 'fill', source: 'ndvi-layer',
        paint: {
          'fill-color': ['interpolate', ['linear'], ['get', 'ndvi'],
            0.1, '#d73027', 0.3, '#fc8d59', 0.5, '#fee08b', 0.7, '#66bd63', 0.9, '#1a9850'
          ],
          'fill-opacity': 0.65
        }
      });

      // Fly to corn belt
      setTimeout(() => {
        map.flyTo({ center: [-93.5, 41.5], zoom: 5.5, pitch: 35, bearing: -5, duration: 3500, essential: true });
      }, 800);

      console.log('Map loaded successfully');
    });

    // ===== Drawing Handlers =====
    map.on('click', (e) => {
      if (!isDrawing) return;
      const pt = [e.lngLat.lng, e.lngLat.lat];
      drawPoints.push(pt);
      map.getSource('draw-points').setData({
        type: 'FeatureCollection',
        features: drawPoints.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} }))
      });
      if (drawPoints.length >= 3) {
        const coords = [...drawPoints, drawPoints[0]];
        drawnPolygon = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
        map.getSource('drawn-field').setData({ type: 'FeatureCollection', features: [drawnPolygon] });
      }
      updateFieldInfo();
    });

    map.on('dblclick', (e) => {
      if (!isDrawing || drawPoints.length < 3) return;
      e.preventDefault();
      isDrawing = false;
      map.getCanvas().style.cursor = '';
      finishDrawing();
    });

    function updateFieldInfo() {
      const info = document.getElementById('fieldInfo');
      if (!info) return;
      if (drawPoints.length < 3) {
        info.innerHTML = '<p class="field-info-placeholder">Click on map to place points. ' + drawPoints.length + '/3 minimum.</p>';
      } else {
        info.innerHTML = '<p class="field-info-placeholder">Double-click to finish. ' + drawPoints.length + ' points placed.</p>';
      }
    }

    function finishDrawing() {
      const info = document.getElementById('fieldInfo');
      if (!info || !drawnPolygon) return;
      if (typeof turf !== 'undefined') {
        const area = turf.area(drawnPolygon);
        const acres = (area * 0.000247105).toFixed(1);
        info.innerHTML =
          '<div style="text-align:center">' +
          '<p style="font-size:28px;font-weight:900;color:#4ade80;margin-bottom:2px">' + acres + ' ac</p>' +
          '<p style="font-size:11px;color:#94a3b8">Field area</p>' +
          '<p style="font-size:11px;color:#22c55e;margin-top:8px">Ready for analysis \u2192 use query bar below</p></div>';
        const bbox = turf.bbox(drawnPolygon);
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 100, duration: 1200, pitch: 40 });
      }
      document.getElementById('drawPolygon')?.classList.remove('active');
    }

    // ===== Tool Buttons =====
    document.getElementById('drawPolygon')?.addEventListener('click', () => {
      isDrawing = true;
      drawPoints = [];
      map.getCanvas().style.cursor = 'crosshair';
      document.getElementById('drawPolygon')?.classList.add('active');
      const info = document.getElementById('fieldInfo');
      if (info) info.innerHTML = '<p class="field-info-placeholder">Click on map to draw corners. Double-click to finish.</p>';
    });

    document.getElementById('drawPoint')?.addEventListener('click', () => {
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
      const info = document.getElementById('fieldInfo');
      if (info) info.innerHTML = '<p class="field-info-placeholder">Draw a field boundary to get started</p>';
      document.getElementById('analysisPanel')?.classList.remove('visible');
      document.getElementById('drawPolygon')?.classList.remove('active');
    });

    // ===== Draw panel toggle =====
    document.getElementById('drawPanelClose')?.addEventListener('click', () => {
      document.getElementById('drawPanel')?.classList.toggle('collapsed');
    });

    // ===== Query / Analysis Engine =====
    function runAnalysis(queryType) {
      const panel = document.getElementById('analysisPanel');
      const body = document.getElementById('analysisBody');
      if (!panel || !body) return;

      panel.classList.add('visible');
      body.innerHTML =
        '<div style="text-align:center;padding:40px">' +
        '<div class="loading-spinner"></div>' +
        '<p style="color:#94a3b8;margin-top:16px;font-size:13px">Analyzing with nltGIS.ai...</p></div>';

      // Add spinner CSS once
      if (!document.getElementById('spin-style')) {
        const s = document.createElement('style');
        s.id = 'spin-style';
        s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}.loading-spinner{width:36px;height:36px;border:3px solid #1e293b;border-top-color:#22c55e;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto}';
        document.head.appendChild(s);
      }

      const q = queryType.toLowerCase();
      setTimeout(() => {
        if (q.includes('ndvi') || q.includes('crop') || q.includes('health') || q.includes('vegetation')) {
          showNDVIResults(body);
          if (drawnPolygon) generateNDVIGrid();
        } else if (q.includes('soil') || q.includes('moisture') || q.includes('organic')) {
          showSoilResults(body);
        } else if (q.includes('weather') || q.includes('forecast') || q.includes('rain') || q.includes('temp')) {
          showWeatherResults(body);
        } else if (q.includes('yield') || q.includes('estimate') || q.includes('harvest') || q.includes('revenue')) {
          showYieldResults(body);
        } else {
          showNDVIResults(body);
          if (drawnPolygon) generateNDVIGrid();
        }
      }, 1600);
    }

    function resultHTML(items) {
      return items.map(i => {
        let bar = '';
        if (i.pct !== undefined) {
          bar = '<div class="analysis-bar"><div class="analysis-bar-fill ' + (i.barClass || 'bar-green') + '" style="width:' + i.pct + '%"></div></div>';
        }
        return '<div class="analysis-item"><h4>' + i.title + '</h4>' +
          (i.value ? '<div class="value-lg"' + (i.color ? ' style="color:' + i.color + '"' : '') + '>' + i.value + '</div>' : '') +
          '<p>' + i.desc + '</p>' + bar + '</div>';
      }).join('');
    }

    function showNDVIResults(body) {
      body.innerHTML = resultHTML([
        { title: 'NDVI Vegetation Index', value: '0.72', desc: 'Healthy — above average for this region and season.', pct: 72 },
        { title: 'Field Health Score', value: 'B+', desc: '85th percentile for corn in this zone.', pct: 85 },
        { title: 'Problem Areas Detected', value: '2', color: '#facc15', desc: 'Potential stress zones in NW corner. Recommend soil sampling.', pct: 15, barClass: 'bar-yellow' },
        { title: 'Data Source', desc: 'Sentinel-2 L2A, acquired 3 days ago via nltGIS.ai' }
      ]);
    }

    function showSoilResults(body) {
      body.innerHTML = resultHTML([
        { title: 'Soil Moisture Index', value: '0.45', desc: 'Moderate moisture — adequate for current growth stage.', pct: 45 },
        { title: 'Soil Type', value: 'Mollisol', desc: 'Rich, dark prairie soil. Excellent for corn and soybean.' },
        { title: 'Organic Matter', value: '3.8%', desc: 'Above county average (3.1%). Good nutrient retention.', pct: 76 },
        { title: 'Drainage Class', desc: 'Well-drained. No irrigation recommended at this time.' }
      ]);
    }

    function showWeatherResults(body) {
      body.innerHTML = resultHTML([
        { title: '7-Day Forecast', value: '72\u00b0F', desc: 'Partly cloudy. 0.3" rain expected Thursday.' },
        { title: 'Growing Degree Days', value: '1,240', desc: 'On track for V8 growth stage.', pct: 62 },
        { title: 'Frost Risk', value: 'None', color: '#4ade80', desc: 'No frost risk in next 14 days.' },
        { title: 'Precipitation Outlook', desc: '1.2" expected this week. Soil recharge adequate.' }
      ]);
    }

    function showYieldResults(body) {
      body.innerHTML = resultHTML([
        { title: 'Predicted Yield', value: '187 bu/ac', desc: 'Above county average (172 bu/ac).', pct: 87 },
        { title: 'Revenue Estimate', value: '$842/ac', color: '#4ade80', desc: 'At current corn futures price ($4.50/bu).' },
        { title: 'Confidence', value: '89%', desc: 'High confidence — satellite imagery + weather models via nltGIS.ai.', pct: 89 }
      ]);
    }

    function generateNDVIGrid() {
      if (!drawnPolygon || typeof turf === 'undefined') return;
      try {
        const bbox = turf.bbox(drawnPolygon);
        const cellSize = Math.max(0.001, (bbox[2] - bbox[0]) / 20);
        const grid = turf.pointGrid(bbox, cellSize, { units: 'degrees' });
        const within = turf.pointsWithinPolygon(grid, drawnPolygon);
        const features = within.features.map(f => {
          const ndvi = 0.35 + Math.random() * 0.55;
          const c = f.geometry.coordinates;
          const d = cellSize / 2;
          return {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [[[c[0]-d,c[1]-d],[c[0]+d,c[1]-d],[c[0]+d,c[1]+d],[c[0]-d,c[1]+d],[c[0]-d,c[1]-d]]] },
            properties: { ndvi }
          };
        });
        map.getSource('ndvi-layer')?.setData({ type: 'FeatureCollection', features });
      } catch (err) { console.warn('NDVI grid error:', err); }
    }

    // ===== Query bar events =====
    document.getElementById('queryBtn')?.addEventListener('click', () => {
      const q = document.getElementById('queryInput')?.value || 'ndvi';
      runAnalysis(q);
    });
    document.getElementById('queryInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runAnalysis(e.target.value || 'ndvi'); }
    });
    document.querySelectorAll('.suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.query || btn.textContent;
        const input = document.getElementById('queryInput');
        if (input) input.value = btn.textContent.replace(/^[^\w]+/, '');
        runAnalysis(q);
      });
    });

    // Analysis panel close
    document.getElementById('analysisClose')?.addEventListener('click', () => {
      document.getElementById('analysisPanel')?.classList.remove('visible');
    });

    // ===== Navbar scroll effect =====
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('navbar');
      if (!nav) return;
      const scrollY = window.scrollY;
      if (scrollY > 60) { nav.classList.add('scrolled'); } else { nav.classList.remove('scrolled'); }
      lastScroll = scrollY;
    }, { passive: true });

    console.log('\ud83c\udf3f PAGAF — Precision AG for All Farmers');
    console.log('  Powered by nltGIS.ai — AI-Native Spatial Intelligence');
  }
});
