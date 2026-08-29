const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data', 'db.json');

// Helper to read DB
function readDB() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database:', err);
    return { settings: {}, products: [], leads: [], requests: [], sales: [] };
  }
}

// Helper to write DB
function writeDB(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const method = req.method.toUpperCase();

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse JSON Body for POST / PUT
  let bodyData = '';
  req.on('data', chunk => {
    bodyData += chunk;
  });

  req.on('end', () => {
    let body = {};
    if (bodyData) {
      try {
        body = JSON.parse(bodyData);
      } catch (e) {
        body = {};
      }
    }

    // ==========================================
    // API ROUTER
    // ==========================================
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      const db = readDB();

      // --- /api/products ---
      if (pathname === '/api/products') {
        if (method === 'GET') {
          let results = [...db.products];
          const { category, grade, status, search, minPrice, maxPrice, sort } = parsedUrl.query;

          if (category && category !== 'All' && category !== 'All categories') {
            results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
          }
          if (grade && grade !== 'All') {
            results = results.filter(p => p.grade.toLowerCase() === grade.toLowerCase());
          }
          if (status && status !== 'All') {
            results = results.filter(p => p.status.toLowerCase() === status.toLowerCase());
          }
          if (search) {
            const q = search.toLowerCase();
            results = results.filter(p => 
              (p.name && p.name.toLowerCase().includes(q)) ||
              (p.brand && p.brand.toLowerCase().includes(q)) ||
              (p.model && p.model.toLowerCase().includes(q)) ||
              (p.sku && p.sku.toLowerCase().includes(q)) ||
              (p.description && p.description.toLowerCase().includes(q))
            );
          }
          if (minPrice) {
            results = results.filter(p => p.price >= parseInt(minPrice, 10));
          }
          if (maxPrice) {
            results = results.filter(p => p.price <= parseInt(maxPrice, 10));
          }
          if (sort === 'price-low') {
            results.sort((a, b) => a.price - b.price);
          } else if (sort === 'price-high') {
            results.sort((a, b) => b.price - a.price);
          } else if (sort === 'grade') {
            results.sort((a, b) => a.grade.localeCompare(b.grade));
          } else {
            // Default newest
            results.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
          }

          res.writeHead(200);
          res.end(JSON.stringify({ success: true, count: results.length, data: results }));
          return;
        }

        if (method === 'POST') {
          const newProduct = {
            id: 'HFR-' + String(Math.floor(1000 + Math.random() * 9000)),
            sku: 'HFR-' + String(Math.floor(1000 + Math.random() * 9000)),
            name: body.name || 'Untitled Equipment',
            subtitle: body.subtitle || body.category || 'Vintage Audio',
            brand: body.brand || 'Unknown Brand',
            model: body.model || '',
            category: body.category || 'Amplifiers',
            grade: body.grade || 'A',
            conditionScore: body.conditionScore || '9.0/10',
            serviceDate: body.serviceDate || new Date().toISOString().slice(0, 7),
            price: Number(body.price) || 25000,
            originalPrice: Number(body.originalPrice) || Number(body.price) || 25000,
            year: body.year || '1975',
            powerOutput: body.powerOutput || 'Standard',
            inputs: body.inputs || 'RCA',
            valves: body.valves || 'Solid State',
            dimensions: body.dimensions || '430 x 150 x 320 mm',
            weight: body.weight || '12.0 kg',
            city: body.city || 'Mumbai',
            status: body.status || 'Available',
            featured: Boolean(body.featured),
            included: body.included || 'Power lead, manual copy',
            mainImage: body.mainImage || 'assets/images/01-tube-amplifiers-cinematic.png',
            gallery: body.gallery || [body.mainImage || 'assets/images/01-tube-amplifiers-cinematic.png'],
            description: body.description || 'Bench-tested vintage audio component in verified condition.',
            knownFaults: body.knownFaults || 'None. Operates to factory electrical specification.',
            benchReport: body.benchReport || {
              inspector: 'Laboratory Bench Technician',
              testDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              thd: '<0.05%',
              snr: '>90 dB',
              channelBalance: '±0.2 dB',
              freqResponse: '20Hz - 20kHz',
              dampingFactor: '>40',
              tubeEmission: 'N/A',
              dcOffset: '<5.0 mV',
              waveform: 'Pure sine verification pass'
            }
          };

          db.products.unshift(newProduct);
          writeDB(db);
          res.writeHead(201);
          res.end(JSON.stringify({ success: true, message: 'Product added successfully', data: newProduct }));
          return;
        }
      }

      // --- /api/products/:id ---
      const productMatch = pathname.match(/^\/api\/products\/([A-Za-z0-9_-]+)$/);
      if (productMatch) {
        const id = productMatch[1];
        const productIndex = db.products.findIndex(p => p.id === id || p.sku === id);

        if (productIndex === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, message: 'Product not found' }));
          return;
        }

        if (method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: db.products[productIndex] }));
          return;
        }

        if (method === 'PUT') {
          db.products[productIndex] = { ...db.products[productIndex], ...body, id: db.products[productIndex].id };
          writeDB(db);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Product updated', data: db.products[productIndex] }));
          return;
        }

        if (method === 'DELETE') {
          const removed = db.products.splice(productIndex, 1);
          writeDB(db);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Product deleted', data: removed[0] }));
          return;
        }
      }

      // --- /api/leads ---
      if (pathname === '/api/leads') {
        if (method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, count: db.leads.length, data: db.leads }));
          return;
        }

        if (method === 'POST') {
          const newLead = {
            id: 'LEAD-' + String(Math.floor(100 + Math.random() * 900)),
            name: body.name || 'Anonymous Seller',
            phone: body.phone || '',
            email: body.email || '',
            city: body.city || 'Mumbai',
            brand: body.brand || '',
            model: body.model || '',
            category: body.category || 'Amplifiers',
            description: body.description || '',
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: 'New',
            estimatedValuation: body.estimatedValuation || '₹25,000 - ₹35,000',
            quotedAmount: Number(body.quotedAmount) || 0,
            notes: body.notes || 'Submitted via intake sheet.'
          };

          db.leads.unshift(newLead);
          writeDB(db);
          res.writeHead(201);
          res.end(JSON.stringify({ success: true, message: 'Appraisal intake received', data: newLead }));
          return;
        }
      }

      // --- /api/leads/:id ---
      const leadMatch = pathname.match(/^\/api\/leads\/([A-Za-z0-9_-]+)$/);
      if (leadMatch) {
        const id = leadMatch[1];
        const leadIndex = db.leads.findIndex(l => l.id === id);

        if (leadIndex === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, message: 'Lead not found' }));
          return;
        }

        if (method === 'PUT') {
          db.leads[leadIndex] = { ...db.leads[leadIndex], ...body, id: db.leads[leadIndex].id };
          writeDB(db);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Lead updated', data: db.leads[leadIndex] }));
          return;
        }
      }

      // --- /api/requests ---
      if (pathname === '/api/requests') {
        if (method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, count: db.requests.length, data: db.requests }));
          return;
        }

        if (method === 'POST') {
          const newReq = {
            id: 'REQ-' + String(Math.floor(200 + Math.random() * 800)),
            clientName: body.clientName || 'Collector',
            phone: body.phone || '',
            email: body.email || '',
            wanted: body.wanted || '',
            category: body.category || 'Amplifiers',
            budget: body.budget || '₹30,000 - ₹50,000',
            maxBudget: Number(body.maxBudget) || 50000,
            timeline: body.timeline || 'No rush',
            conditionAcceptable: body.conditionAcceptable || 'Grade A or B',
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: 'Open',
            matchedUnit: null
          };

          db.requests.unshift(newReq);
          writeDB(db);
          res.writeHead(201);
          res.end(JSON.stringify({ success: true, message: 'Sourcing request submitted', data: newReq }));
          return;
        }
      }

      // --- /api/requests/:id ---
      const reqMatch = pathname.match(/^\/api\/requests\/([A-Za-z0-9_-]+)$/);
      if (reqMatch) {
        const id = reqMatch[1];
        const reqIndex = db.requests.findIndex(r => r.id === id);

        if (reqIndex === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, message: 'Request not found' }));
          return;
        }

        if (method === 'PUT') {
          db.requests[reqIndex] = { ...db.requests[reqIndex], ...body, id: db.requests[reqIndex].id };
          writeDB(db);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Request updated', data: db.requests[reqIndex] }));
          return;
        }
      }

      // --- /api/settings ---
      if (pathname === '/api/settings') {
        if (method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: db.settings }));
          return;
        }

        if (method === 'PUT') {
          db.settings = { ...db.settings, ...body };
          writeDB(db);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Settings updated', data: db.settings }));
          return;
        }
      }

      // --- /api/sales ---
      if (pathname === '/api/sales') {
        if (method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, count: db.sales.length, data: db.sales }));
          return;
        }

        if (method === 'POST') {
          const newSale = {
            id: 'SALE-' + String(Math.floor(300 + Math.random() * 700)),
            unit: body.unit || 'Vintage Audio Unit',
            type: body.type || 'Amplifier',
            grade: body.grade || 'A',
            price: Number(body.price) || 45000,
            buyerCity: body.buyerCity || 'Mumbai',
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: 'SOLD'
          };
          db.sales.unshift(newSale);
          writeDB(db);
          res.writeHead(201);
          res.end(JSON.stringify({ success: true, message: 'Sale recorded', data: newSale }));
          return;
        }
      }

      // Unmatched API route
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, message: 'Endpoint not found' }));
      return;
    }

    // ==========================================
    // STATIC FILE SERVER
    // ==========================================
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Access denied');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // If not found, try adding .html extension
        if (!path.extname(filePath)) {
          const htmlPath = filePath + '.html';
          if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
            filePath = htmlPath;
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1><p>The requested file could not be found.</p><p><a href="/">Return to The HiFi Room</a></p>');
            return;
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 Not Found</h1><p>The requested file could not be found.</p><p><a href="/">Return to The HiFi Room</a></p>');
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
  });
});

server.listen(PORT, () => {
  console.log(`The HiFi Room Server running at http://localhost:${PORT}`);
});
