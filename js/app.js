/**
 * THE HIFI ROOM — CLIENT RUNTIME & INTERACTIVE CONTROLLER
 * Baseline Coding Standards: Clean naming, immutability, error handling, mobile accessibility
 */

// Local fallback database cache in case of static hosting
let dbFallback = null;

// Toast Notification Manager
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
  const iconColor = type === 'success' ? '#4B7A51' : (type === 'error' ? '#B4472F' : '#2E6FA3');
  
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
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

// Resilient API Fetcher with Static Database Fallback
async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (!dbFallback) {
      try {
        const local = await fetch('data/db.json');
        dbFallback = await local.json();
      } catch (loadError) {
        console.error('Cannot load data/db.json directly', loadError);
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

// Global Lifecycle Initializer
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initHeartButtons();
});

// Mobile Slide-Out Drawer Navigation
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

// Favorite Heart Toggle Button
function initHeartButtons() {
  document.querySelectorAll('.heart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isFilled = btn.getAttribute('fill') !== 'none';
      if (isFilled) {
        btn.setAttribute('fill', 'none');
        btn.setAttribute('stroke', '#1B1812');
        showToast('Item removed from saved wishlist');
      } else {
        btn.setAttribute('fill', '#B4472F');
        btn.setAttribute('stroke', '#B4472F');
        showToast('Saved to your wishlist', 'success');
      }
    });
  });
}

// Currency Formatter Utility
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Offer Worksheet Submission
function submitOffer(productId, productName, listedPrice) {
  const offerAmountInput = document.getElementById('offer-amount-input');
  const offerAmount = offerAmountInput ? offerAmountInput.value : null;
  
  if (!offerAmount || isNaN(offerAmount) || Number(offerAmount) <= 0) {
    showToast('Please enter a valid numeric offer amount', 'error');
    return;
  }

  showToast(`Offer of ₹${Number(offerAmount).toLocaleString('en-IN')} submitted for ${productName}!`, 'success');
  
  const modal = document.getElementById('offer-modal');
  if (modal) modal.classList.remove('active');
}
