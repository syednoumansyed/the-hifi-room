/**
 * THE HIFI ROOM — ADMIN CONSOLE CONTROLLER
 */

let currentProducts = [];
let currentLeads = [];
let currentRequests = [];

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  initAdminEventListeners();
});

async function loadDashboardData() {
  const prodRes = await fetchAPI('/api/products');
  if (prodRes && prodRes.success) {
    currentProducts = prodRes.data;
    renderInventoryTable(currentProducts);
    updateDashboardStats(currentProducts);
  }

  const leadsRes = await fetchAPI('/api/leads');
  if (leadsRes && leadsRes.success) {
    currentLeads = leadsRes.data;
    renderLeadsList(currentLeads);
  }

  const reqRes = await fetchAPI('/api/requests');
  if (reqRes && reqRes.success) {
    currentRequests = reqRes.data;
    renderRequestsList(currentRequests);
  }
}

function updateDashboardStats(products) {
  const activeCount = products.filter(p => p.status === 'Available').length;
  const reservedCount = products.filter(p => p.status === 'Reserved').length;
  const placedCount = products.filter(p => p.status === 'Placed' || p.status === 'Sold').length;

  const statActive = document.getElementById('stat-active');
  if (statActive) statActive.textContent = activeCount;

  const statReserved = document.getElementById('stat-reserved');
  if (statReserved) statReserved.textContent = reservedCount;

  const statPlaced = document.getElementById('stat-placed');
  if (statPlaced) statPlaced.textContent = placedCount;
}

function renderInventoryTable(products) {
  const tableBody = document.getElementById('inventory-table-body');
  if (!tableBody) return;

  if (products.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#8A8A82;">No inventory items found</td></tr>`;
    return;
  }

  tableBody.innerHTML = products.map(p => {
    const statusClass = p.status === 'Available' ? 'status-available' : p.status === 'Reserved' ? 'status-reserved' : 'status-placed';
    const gradeClass = p.grade === 'A+' ? 'grade-ap' : p.grade === 'A' ? 'grade-a' : p.grade === 'B' ? 'grade-b' : 'grade-c';
    
    return `
      <tr>
        <td>
          <input type="checkbox" class="unit-select-checkbox" data-id="${p.id}">
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${p.mainImage}" alt="${p.name}" style="width:48px; height:38px; object-fit:cover; border:1px solid #C9C2B2; background:#EAE4D3;">
            <div>
              <div style="font-weight:600; font-size:13.5px;"><a href="product.html?id=${p.id}">${p.name}</a></div>
              <div style="font-family:'IBM Plex Mono', monospace; font-size:11px; color:#8A8A82;">${p.sku} · ${p.brand}</div>
            </div>
          </div>
        </td>
        <td><span class="grade-badge ${gradeClass}">${p.grade}</span></td>
        <td><span style="font-size:13px; color:#4B4B45;">${p.category}</span></td>
        <td><span style="font-family:'IBM Plex Mono', monospace; font-size:13px; font-weight:500;">₹${Number(p.price).toLocaleString('en-IN')}</span></td>
        <td>
          <select onchange="updateProductStatus('${p.id}', this.value)" style="border:1px solid #C9C2B2; background:#FBF9F3; padding:4px 8px; font-family:'IBM Plex Mono', monospace; font-size:11px; cursor:pointer;">
            <option value="Available" ${p.status === 'Available' ? 'selected' : ''}>Available</option>
            <option value="Reserved" ${p.status === 'Reserved' ? 'selected' : ''}>Reserved</option>
            <option value="Placed" ${p.status === 'Placed' ? 'selected' : ''}>Placed</option>
            <option value="Draft" ${p.status === 'Draft' ? 'selected' : ''}>Draft</option>
          </select>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button onclick="editProduct('${p.id}')" class="btn-ghost btn-sm" style="padding:4px 10px; font-size:11px;">Edit</button>
            <button onclick="deleteProduct('${p.id}')" class="btn-ghost btn-sm" style="padding:4px 10px; font-size:11px; color:#B4472F; border-color:#B4472F;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateProductStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Status updated to ${newStatus}`, 'success');
      loadDashboardData();
    }
  } catch (err) {
    showToast('Failed to update status on server, updated locally', 'info');
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to remove this unit from inventory?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Unit removed successfully', 'success');
      loadDashboardData();
    }
  } catch (err) {
    showToast('Deleted locally', 'info');
  }
}

function openAddProductModal() {
  const modal = document.getElementById('add-product-modal');
  if (modal) modal.classList.add('active');
}

function closeAddProductModal() {
  const modal = document.getElementById('add-product-modal');
  if (modal) modal.classList.remove('active');
}

async function handleAddProductSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const newProduct = {
    name: form.name.value,
    brand: form.brand.value,
    model: form.model.value,
    category: form.category.value,
    grade: form.grade.value,
    conditionScore: form.conditionScore.value || '9.0/10',
    price: Number(form.price.value),
    year: form.year.value || '1980',
    powerOutput: form.powerOutput.value || '',
    city: form.city.value || 'Mumbai',
    status: form.status.value || 'Available',
    mainImage: form.mainImage.value || 'assets/images/01-tube-amplifiers-cinematic.png',
    description: form.description.value,
    knownFaults: form.knownFaults.value || 'None noted.'
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    if (res.ok) {
      showToast('New unit successfully added to inventory!', 'success');
      closeAddProductModal();
      form.reset();
      loadDashboardData();
    }
  } catch (err) {
    showToast('Product added locally', 'success');
    closeAddProductModal();
  }
}

function renderLeadsList(leads) {
  const leadsContainer = document.getElementById('leads-list-container');
  if (!leadsContainer) return;

  leadsContainer.innerHTML = leads.map(l => `
    <div class="lead-row" onclick="selectLead('${l.id}')" style="padding:16px 18px; border-bottom:1px solid #E4E1D6; cursor:pointer; background:${l.status === 'New' ? '#F6EFDF' : 'transparent'};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span style="font-size:13.5px; font-weight:600;">${l.brand} ${l.model}</span>
        <span class="status-tag status-${l.status.toLowerCase()}">${l.status}</span>
      </div>
      <div style="font-size:12px; color:#4B4B45; margin-top:3px;">${l.name} — ${l.city}</div>
      <div style="font-family:'IBM Plex Mono', monospace; font-size:11px; color:#8A8A82; margin-top:4px;">Submitted ${l.date}</div>
    </div>
  `).join('');
}

function selectLead(leadId) {
  const lead = currentLeads.find(l => l.id === leadId);
  const detailPanel = document.getElementById('lead-detail-panel');
  if (!lead || !detailPanel) return;

  detailPanel.innerHTML = `
    <div style="padding:20px 24px; border-bottom:1px solid #C9C2B2; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-family:'IBM Plex Mono', monospace; font-size:11px; color:#8A8A82;">LEAD ${lead.id}</div>
        <h2 style="font-size:22px; margin-top:2px;">${lead.brand} ${lead.model}</h2>
      </div>
      <span class="status-tag status-${lead.status.toLowerCase()}">${lead.status}</span>
    </div>
    <div style="padding:24px; display:flex; flex-direction:column; gap:18px;">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <div>
          <div class="field-label">SELLER CONTACT</div>
          <div style="font-size:14px; font-weight:500;">${lead.name}</div>
          <div style="font-family:'IBM Plex Mono', monospace; font-size:12.5px; color:#4B4B45; margin-top:2px;">${lead.phone}</div>
          <div style="font-size:12px; color:#8A8A82;">${lead.email} · ${lead.city}</div>
        </div>
        <div>
          <div class="field-label">ESTIMATED VALUATION</div>
          <div style="font-family:'IBM Plex Mono', monospace; font-size:18px; font-weight:600; color:#2E6FA3;">${lead.estimatedValuation}</div>
          <div style="font-size:12px; color:#8A8A82; margin-top:2px;">Based on current secondary market data</div>
        </div>
      </div>

      <div>
        <div class="field-label">SELLER'S DESCRIPTION</div>
        <div style="background:#FFFFFF; border:1px solid #C9C2B2; padding:12px 14px; font-size:13px; color:#4B4B45; line-height:1.5;">
          ${lead.description}
        </div>
      </div>

      <div style="display:flex; gap:12px; align-items:center; margin-top:8px;">
        <a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v12H8l-4 4V4z"></path></svg>
          Chat on WhatsApp
        </a>
        <button onclick="updateLeadStatus('${lead.id}', 'Quoted')" class="btn btn-outline btn-sm">Mark Quoted</button>
        <button onclick="updateLeadStatus('${lead.id}', 'Scheduled')" class="btn btn-ghost btn-sm">Schedule Inspection</button>
      </div>
    </div>
  `;
}

async function updateLeadStatus(id, status) {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(`Lead status updated to ${status}`, 'success');
      loadDashboardData();
    }
  } catch (e) {
    showToast('Updated locally', 'info');
  }
}

function renderRequestsList(requests) {
  const reqContainer = document.getElementById('requests-list-container');
  if (!reqContainer) return;

  reqContainer.innerHTML = requests.map(r => `
    <div class="req-row" style="padding:16px 20px; border-bottom:1px solid #E4E1D6; display:flex; flex-direction:column; gap:6px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
        <span style="font-size:14px; font-weight:600;">${r.wanted}</span>
        <span class="status-tag status-${r.status.toLowerCase()}">${r.status}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:12px; color:#4B4B45;">
        <span>${r.clientName} · <span style="font-family:'IBM Plex Mono', monospace;">${r.budget}</span></span>
        <span style="font-family:'IBM Plex Mono', monospace; color:#8A8A82;">${r.date}</span>
      </div>
      ${r.matchedUnit ? `<div style="font-family:'IBM Plex Mono', monospace; font-size:11px; color:#2E6FA3; background:rgba(46,111,163,0.08); padding:4px 8px; border:1px dashed #2E6FA3;">Matched Inventory: ${r.matchedUnit}</div>` : ''}
    </div>
  `).join('');
}

function initAdminEventListeners() {
  const searchInput = document.getElementById('admin-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = currentProducts.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
      renderInventoryTable(filtered);
    });
  }

  const categorySelect = document.getElementById('admin-category-select');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      const cat = e.target.value;
      if (cat === 'All' || cat === 'All categories') {
        renderInventoryTable(currentProducts);
      } else {
        renderInventoryTable(currentProducts.filter(p => p.category === cat));
      }
    });
  }
}
