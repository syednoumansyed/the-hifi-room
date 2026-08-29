/**
 * THE HIFI ROOM — VINTAGE CRT OSCILLOSCOPE & SIGNAL VISUALIZER
 * Interactive Design Wow-Factor Engine
 * Modes: 1kHz Reference, Lissajous Stereo Phase, Tube Saturation, Vinyl Groove
 * Themes: McIntosh Cobalt Blue (#4FC3FF), Phosphor Green (#39FF14), Marantz Amber (#FFB000)
 */

class CRTOscilloscope {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.options = {
      theme: options.theme || 'cobalt', // 'cobalt', 'green', 'amber'
      mode: options.mode || 'lissajous', // 'sine', 'lissajous', 'tube', 'vinyl'
      freq: options.freq || 2.0,
      amp: options.amp || 32,
      enableSound: false,
      ...options
    };

    this.themeColors = {
      cobalt: { stroke: '#4FC3FF', glow: 'rgba(79, 195, 255, 0.45)', bg: '#060B12', grid: 'rgba(79, 195, 255, 0.12)' },
      green: { stroke: '#39FF14', glow: 'rgba(57, 255, 20, 0.45)', bg: '#051007', grid: 'rgba(57, 255, 20, 0.12)' },
      amber: { stroke: '#FFB000', glow: 'rgba(255, 176, 0, 0.45)', bg: '#120904', grid: 'rgba(255, 176, 0, 0.12)' }
    };

    this.phase = 0;
    this.lissajousPhase = 0;
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlayingAudio = false;

    this.initDOM();
    this.initEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="crt-oscilloscope-chassis paper" style="border: 1px solid var(--border-main); background: #0E1116; border-radius: 4px; padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4); position: relative; overflow: hidden;">
        
        <!-- Top Bezel & Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #4FC3FF; box-shadow: 0 0 8px #4FC3FF;" id="crt-power-led"></div>
            <span style="font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; color: #E5E0D5; text-transform: uppercase; font-weight: 600;">
              TYPE 545C DUAL-TRACE SIGNAL MONITOR
            </span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: #8A8A82; letter-spacing: 0.08em;">
            CALIBRATED 50mV / DIV
          </div>
        </div>

        <!-- CRT Screen Bezel -->
        <div style="position: relative; width: 100%; height: 260px; background: #060B12; border: 2px solid #1C232D; border-radius: 8px; overflow: hidden; box-shadow: inset 0 0 40px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.1);">
          
          <!-- CRT Glass Glare Overlay -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%); pointer-events: none; z-index: 5;"></div>
          
          <!-- Phosphor Scanline Texture -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 3px); pointer-events: none; z-index: 4;"></div>

          <!-- Main Oscilloscope Canvas -->
          <canvas id="crt-screen-canvas" style="width: 100%; height: 100%; display: block;"></canvas>

          <!-- On-screen Readout Tags -->
          <div style="position: absolute; top: 12px; left: 14px; z-index: 6; font-family: var(--font-mono); font-size: 10.5px; color: #4FC3FF; pointer-events: none;" id="crt-mode-readout">
            MODE: LISSAJOUS STEREO PHASE [45°]
          </div>
          <div style="position: absolute; bottom: 12px; right: 14px; z-index: 6; font-family: var(--font-mono); font-size: 10.5px; color: rgba(255,255,255,0.4); pointer-events: none;" id="crt-freq-readout">
            FREQ: 1.00 kHz • REF CH-A
          </div>
        </div>

        <!-- Interactive Control Console -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding-top: 4px;">
          
          <!-- Signal Mode Selector -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="font-family: var(--font-mono); font-size: 10px; color: #8A8A82; text-transform: uppercase; letter-spacing: 0.08em;">SIGNAL PATTERN</label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="crt-btn crt-mode-btn active" data-mode="lissajous">Lissajous (Stereo)</button>
              <button class="crt-btn crt-mode-btn" data-mode="sine">1kHz Sine</button>
              <button class="crt-btn crt-mode-btn" data-mode="tube">Tube Warmth</button>
              <button class="crt-btn crt-mode-btn" data-mode="vinyl">Vinyl Groove</button>
            </div>
          </div>

          <!-- Phosphor Color Selector -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="font-family: var(--font-mono); font-size: 10px; color: #8A8A82; text-transform: uppercase; letter-spacing: 0.08em;">PHOSPHOR COLOR</label>
            <div style="display: flex; gap: 6px;">
              <button class="crt-btn crt-color-btn active" data-color="cobalt" style="color: #4FC3FF; border-color: rgba(79,195,255,0.4);">Cobalt Blue</button>
              <button class="crt-btn crt-color-btn" data-color="green" style="color: #39FF14; border-color: rgba(57,255,20,0.4);">Green Phosphor</button>
              <button class="crt-btn crt-color-btn" data-color="amber" style="color: #FFB000; border-color: rgba(255,176,0,0.4);">Amber Glow</button>
            </div>
          </div>

          <!-- Interactive Dials & Audio Tone Button -->
          <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-family: var(--font-mono); font-size: 10px; color: #8A8A82; text-transform: uppercase; letter-spacing: 0.08em;">FREQUENCY SWEEP</label>
              <input type="range" id="crt-freq-slider" min="0.5" max="5.0" step="0.1" value="2.0" style="accent-color: #4FC3FF; width: 140px; cursor: pointer;">
            </div>

            <button id="crt-audio-toggle" class="crt-btn" style="height: 34px; padding: 0 14px; background: rgba(255,255,255,0.05); color: #E5E0D5; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              <span>Sound: Muted</span>
            </button>
          </div>

        </div>

      </div>
    `;

    this.canvas = document.getElementById('crt-screen-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.modeReadout = document.getElementById('crt-mode-readout');
    this.freqReadout = document.getElementById('crt-freq-readout');
    this.freqSlider = document.getElementById('crt-freq-slider');
    this.audioToggleBtn = document.getElementById('crt-audio-toggle');
    this.powerLed = document.getElementById('crt-power-led');
  }

  initEvents() {
    // Mode Buttons
    this.container.querySelectorAll('.crt-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.container.querySelectorAll('.crt-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.options.mode = btn.dataset.mode;
        this.updateReadout();
      });
    });

    // Color Buttons
    this.container.querySelectorAll('.crt-color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.container.querySelectorAll('.crt-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.options.theme = btn.dataset.color;
        const colorHex = this.themeColors[this.options.theme].stroke;
        if (this.powerLed) {
          this.powerLed.style.background = colorHex;
          this.powerLed.style.boxShadow = `0 0 8px ${colorHex}`;
        }
        if (this.modeReadout) {
          this.modeReadout.style.color = colorHex;
        }
        if (this.freqSlider) {
          this.freqSlider.style.accentColor = colorHex;
        }
      });
    });

    // Frequency Slider
    if (this.freqSlider) {
      this.freqSlider.addEventListener('input', (e) => {
        this.options.freq = parseFloat(e.target.value);
        if (this.freqReadout) {
          this.freqReadout.textContent = `FREQ: ${(this.options.freq * 0.5).toFixed(2)} kHz • REF CH-A`;
        }
        if (this.oscillator && this.isPlayingAudio) {
          this.oscillator.frequency.setValueAtTime(220 * this.options.freq, this.audioCtx.currentTime);
        }
      });
    }

    // Audio Toggle
    if (this.audioToggleBtn) {
      this.audioToggleBtn.addEventListener('click', () => {
        this.toggleAudio();
      });
    }
  }

  updateReadout() {
    const modeNames = {
      lissajous: 'MODE: LISSAJOUS STEREO PHASE [45°]',
      sine: 'MODE: 1.00 kHz REFERENCE SINE',
      tube: 'MODE: 12AX7 TUBE SATURATION HARMONICS',
      vinyl: 'MODE: PHONO RIAA GROOVE VIBRATION'
    };
    if (this.modeReadout) {
      this.modeReadout.textContent = modeNames[this.options.mode] || 'MODE: ACTIVE TRACE';
    }
  }

  toggleAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }

    if (this.isPlayingAudio) {
      if (this.gainNode) {
        this.gainNode.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
        setTimeout(() => {
          if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
          }
        }, 100);
      }
      this.isPlayingAudio = false;
      this.audioToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
        <span>Sound: Muted</span>
      `;
    } else {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();
      
      this.oscillator.type = this.options.mode === 'tube' ? 'sawtooth' : 'sine';
      this.oscillator.frequency.setValueAtTime(220 * this.options.freq, this.audioCtx.currentTime);
      
      // Warm low-pass filter for silky vintage tube sound
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.audioCtx.currentTime);

      this.gainNode.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.08, this.audioCtx.currentTime + 0.15); // gentle soft volume

      this.oscillator.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      this.oscillator.start();

      this.isPlayingAudio = true;
      this.audioToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${this.themeColors[this.options.theme].stroke}" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        <span style="color:${this.themeColors[this.options.theme].stroke}; font-weight:600;">Sound: Live Tone</span>
      `;
    }
  }

  animate() {
    if (!this.canvas) return;
    const w = this.canvas.width = this.canvas.parentElement.clientWidth || 600;
    const h = this.canvas.height = this.canvas.parentElement.clientHeight || 260;
    const cx = w / 2;
    const cy = h / 2;
    const ctx = this.ctx;
    const theme = this.themeColors[this.options.theme] || this.themeColors.cobalt;

    // Background Clear with subtle persistence glow
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    // CRT Graticule Subdivisions
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = gridSize; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center Baseline Crosshairs
    ctx.strokeStyle = theme.glow;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();

    // Waveform Trace Configuration
    ctx.strokeStyle = theme.stroke;
    ctx.shadowColor = theme.stroke;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.4;
    ctx.beginPath();

    const mode = this.options.mode;
    const freq = this.options.freq;
    const amp = this.options.amp;

    if (mode === 'lissajous') {
      // Rotating 3D Lissajous Stereo Phase Loop
      const numPoints = 240;
      const rx = Math.min(w, h) * 0.36;
      const ry = rx * 0.85;
      for (let i = 0; i <= numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 2;
        const x = cx + Math.sin(t * 2 + this.lissajousPhase) * rx;
        const y = cy + Math.cos(t * 3 + this.phase * 0.5) * ry;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      this.lissajousPhase += 0.024;
    } else if (mode === 'sine') {
      // Pure 1kHz Sine Wave
      for (let x = 0; x < w; x++) {
        const angle = (x / w) * Math.PI * 2 * freq + this.phase;
        const y = cy + Math.sin(angle) * (amp * 1.8);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (mode === 'tube') {
      // Tube Harmonic Soft-Saturation (2nd & 3rd Harmonics)
      for (let x = 0; x < w; x++) {
        const angle = (x / w) * Math.PI * 2 * freq + this.phase;
        const fund = Math.sin(angle);
        const secondHarmonic = Math.sin(angle * 2 + 0.5) * 0.22;
        const thirdHarmonic = Math.sin(angle * 3) * 0.12;
        // Soft clipping curve
        let combined = fund + secondHarmonic + thirdHarmonic;
        combined = Math.tanh(combined * 1.4);
        const y = cy + combined * (amp * 1.8);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (mode === 'vinyl') {
      // Dynamic Phono Groove Vibration
      for (let x = 0; x < w; x++) {
        const angle = (x / w) * Math.PI * 2 * freq + this.phase;
        const bass = Math.sin(angle * 0.7) * 1.4;
        const mid = Math.sin(angle * 2.3 + this.phase * 1.5) * 0.6;
        const vinylNoise = (Math.random() - 0.5) * 0.08;
        const y = cy + (bass + mid + vinylNoise) * (amp * 1.2);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Advance Phase
    this.phase += 0.04 * freq;
    requestAnimationFrame(this.animate);
  }
}

// Attach CSS styles for CRT controls
(function injectCRTCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .crt-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: #A8A295;
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 2px;
      transition: all 140ms ease;
    }
    .crt-btn:hover {
      background: rgba(255,255,255,0.12);
      color: #FFFFFF;
    }
    .crt-btn.active {
      background: #2E6FA3;
      color: #FFFFFF;
      border-color: #4FC3FF;
      box-shadow: 0 0 10px rgba(79,195,255,0.3);
    }
  `;
  document.head.appendChild(style);
})();

window.CRTOscilloscope = CRTOscilloscope;
