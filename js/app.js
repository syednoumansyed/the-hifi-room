/**
 * THE HIFI ROOM — CLIENT RUNTIME & INTERACTIVE CONTROLLER
 */

// Local fallback database in case of file:// direct viewing
let dbFallback = null;

// Toast Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#4B7A51' : '#2E6FA3'}" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// API Helper with fallback
async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API call ${endpoint} failed, checking local database:`, err);
    if (!dbFallback) {
      try {
        const local = await fetch('data/db.json');
        dbFallback = await local.json();
      } catch (e) {
        console.error('Cannot load data/db.json directly', e);
      }
    }
    
    // Simulate API responses from local json
    if (dbFallback) {
      if (endpoint.startsWith('/api/products/')) {
        const id = endpoint.replace('/api/products/', '').split('?')[0];
        const item = dbFallback.products.find(p => p.id === id || p.sku === id) || dbFallback.products[0];
        return { success: true, data: item };
      }
      if (endpoint.startsWith('/api/products')) {
        return { success: true, data: dbFallback.products, count: dbFallback.products.length };
      }
      if (endpoint.startsWith('/api/leads')) {
        return { success: true, data: dbFallback.leads };
      }
      if (endpoint.startsWith('/api/requests')) {
        return { success: true, data: dbFallback.requests };
      }
      if (endpoint.startsWith('/api/settings')) {
        return { success: true, data: dbFallback.settings };
      }
      if (endpoint.startsWith('/api/sales')) {
        return { success: true, data: dbFallback.sales };
      }
    }
    return { success: false, data: [] };
  }
}

// Global Setup
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initOscilloscopes();
  initVUMeters();
  initHeartButtons();
});

// Mobile Drawer
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('mobile-drawer-close');
  
  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', () => {
      drawer.classList.add('open');
    });
  }
  if (closeBtn && drawer) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  }
  if (drawer) {
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) {
        drawer.classList.remove('open');
      }
    });
  }
}

// Favorite Heart Toggle
function initHeartButtons() {
  document.querySelectorAll('.heart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isFilled = btn.getAttribute('fill') !== 'none';
      if (isFilled) {
        btn.setAttribute('fill', 'none');
        btn.setAttribute('stroke', '#1B1812');
        showToast('Item removed from saved list');
      } else {
        btn.setAttribute('fill', '#B4472F');
        btn.setAttribute('stroke', '#B4472F');
        showToast('Saved to your wishlist');
      }
    });
  });
}

// Oscilloscope Canvas Visualizer
function initOscilloscopes() {
  const canvases = document.querySelectorAll('.oscilloscope-canvas');
  canvases.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    let phase = 0;
    let freq = parseFloat(canvas.dataset.freq || '2.0');
    let amp = parseFloat(canvas.dataset.amp || '30.0');
    let isGlowing = true;

    function render() {
      const w = canvas.width = canvas.parentElement.clientWidth || 300;
      const h = canvas.height = canvas.parentElement.clientHeight || 120;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // CRT Graticule Subdivisions
      ctx.strokeStyle = 'rgba(46,111,163,0.15)';
      ctx.lineWidth = 1;
      for (let x = 20; x < w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 20; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center baseline
      ctx.strokeStyle = 'rgba(79,195,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Audio Waveform
      ctx.strokeStyle = '#4FC3FF';
      ctx.shadowColor = '#4FC3FF';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const angle = (x / w) * Math.PI * 2 * freq + phase;
        // Mix in a slight 3rd harmonic for analog warmth
        const y = cy + Math.sin(angle) * amp + Math.sin(angle * 3) * (amp * 0.08);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.045;
      requestAnimationFrame(render);
    }
    render();
  });
}

// Analog VU Needle Physics
function initVUMeters() {
  const needles = document.querySelectorAll('.vu-needle');
  if (!needles.length) return;

  setInterval(() => {
    needles.forEach(needle => {
      // Random gentle analog bounce between -25deg and +15deg
      const targetDeg = -30 + Math.random() * 42;
      needle.style.transform = `rotate(${targetDeg}deg)`;
    });
  }, 320);
}

// Currency Formatter
function formatINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN');
}

// Offer Worksheet Submission
function submitOffer(productId, productName, listedPrice) {
  const offerAmount = document.getElementById('offer-amount-input') ? document.getElementById('offer-amount-input').value : null;
  const buyerName = document.getElementById('offer-name-input') ? document.getElementById('offer-name-input').value : '';
  const buyerPhone = document.getElementById('offer-phone-input') ? document.getElementById('offer-phone-input').value : '';
  
  if (!offerAmount || isNaN(offerAmount)) {
    showToast('Please enter a valid offer amount', 'error');
    return;
  }

  showToast(`Offer of ₹${Number(offerAmount).toLocaleString('en-IN')} submitted for ${productName}!`, 'success');
  
  const modal = document.getElementById('offer-modal');
  if (modal) modal.classList.remove('active');
}
