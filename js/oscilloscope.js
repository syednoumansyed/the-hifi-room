/**
 * THE HIFI ROOM — Ambient Signal Trace
 * Purely atmospheric. No controls, no audio, no interaction.
 * Used on the About page workshop section to evoke "we bench-test every unit."
 * Quietly loops a Lissajous stereo phase trace — visible but not demanding.
 */

class CRTOscilloscope {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.phase   = 0;
    this.lphase  = 0;
    this.raf     = null;

    // Colours — default cobalt, matches the design system
    const themes = {
      cobalt: { stroke: '#4FC3FF', glow: 'rgba(79,195,255,0.35)', bg: '#060B12', grid: 'rgba(79,195,255,0.10)' },
      green:  { stroke: '#39FF14', glow: 'rgba(57,255,20,0.35)',   bg: '#051007', grid: 'rgba(57,255,20,0.10)'  },
      amber:  { stroke: '#FFB000', glow: 'rgba(255,176,0,0.35)',   bg: '#120904', grid: 'rgba(255,176,0,0.10)'  },
    };
    this.c = themes[options.theme] || themes.cobalt;

    this._buildDOM();
    this.animate = this._animate.bind(this);
    this.raf = requestAnimationFrame(this.animate);
  }

  _buildDOM() {
    // Outer shell — dark bezel, no controls
    this.container.style.cssText = 'width:100%;position:relative;';

    const bezel = document.createElement('div');
    bezel.style.cssText = `
      background:${this.c.bg};
      border:1px solid rgba(255,255,255,0.07);
      border-radius:4px;
      overflow:hidden;
      position:relative;
    `;

    // CRT scanline texture
    const scanlines = document.createElement('div');
    scanlines.style.cssText = `
      position:absolute;top:0;left:0;right:0;bottom:0;
      background:repeating-linear-gradient(0deg,rgba(0,0,0,0.18) 0px,rgba(0,0,0,0.18) 1px,transparent 1px,transparent 3px);
      pointer-events:none;z-index:4;
    `;

    // Glass glare
    const glare = document.createElement('div');
    glare.style.cssText = `
      position:absolute;top:0;left:0;right:0;height:40%;
      background:linear-gradient(180deg,rgba(255,255,255,0.035) 0%,transparent 100%);
      pointer-events:none;z-index:5;
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;';
    this.canvas.setAttribute('aria-hidden', 'true');

    // On-screen readout (purely atmospheric, not interactive)
    this.readout = document.createElement('div');
    this.readout.style.cssText = `
      position:absolute;bottom:10px;left:14px;z-index:6;
      font-family:var(--font-mono,monospace);font-size:10px;
      color:${this.c.stroke};opacity:0.6;
      letter-spacing:0.1em;pointer-events:none;
    `;
    this.readout.textContent = 'STEREO PHASE · LISSAJOUS · BOTH CH CLEAR';

    bezel.append(scanlines, glare, this.canvas, this.readout);
    this.container.appendChild(bezel);

    // Size canvas to match CSS dimensions on first paint
    const ro = new ResizeObserver(() => this._resize());
    ro.observe(bezel);
    this._bezel = bezel;
  }

  _resize() {
    const { width, height } = this._bezel.getBoundingClientRect();
    this.canvas.width  = width  * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
  }

  _animate() {
    const canvas = this.canvas;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) { this.raf = requestAnimationFrame(this.animate); return; }

    const ctx = canvas.getContext('2d');

    // Slow fade-trail for phosphor persistence
    ctx.fillStyle = `rgba(${this._hexToRgb(this.c.bg)},0.18)`;
    ctx.fillRect(0, 0, W, H);

    // Draw subtle grid lines
    ctx.strokeStyle = this.c.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, H * i / 4); ctx.lineTo(W, H * i / 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W * i / 4, 0); ctx.lineTo(W * i / 4, H); ctx.stroke();
    }

    // Lissajous — ratio 3:2, drifts slowly so it never repeats identically
    const rx = W * 0.38, ry = H * 0.38;
    const cx = W / 2,    cy = H / 2;
    const steps = 320;
    const freq  = 2.0 + 0.4 * Math.sin(this.phase * 0.007); // gentle wobble

    ctx.beginPath();
    ctx.strokeStyle = this.c.stroke;
    ctx.lineWidth   = devicePixelRatio * 1.2;
    ctx.shadowColor = this.c.glow;
    ctx.shadowBlur  = 8 * devicePixelRatio;

    for (let i = 0; i <= steps; i++) {
      const t  = (i / steps) * Math.PI * 2;
      const px = cx + rx * Math.sin(freq * t + this.lphase);
      const py = cy + ry * Math.sin(t);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Advance phase — very slowly (ambient speed, not flashy)
    this.phase  += 0.4;
    this.lphase += 0.003;

    this.raf = requestAnimationFrame(this.animate);
  }

  _hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}
