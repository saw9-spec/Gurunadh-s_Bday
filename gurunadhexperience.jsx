import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowDown,
  X,
  Menu,
  Upload,
  Film,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Sliders,
  Compass,
  Trash2,
  Check,
  Eye,
} from 'lucide-react';

// ============================================================================
// 1. CENTRALIZED PERSONAL MEDIA CONFIGURATION
// Replace local paths in /public/media/ or upload live via the "Personalize Media" drawer.
// ============================================================================
const PERSONAL_MEDIA_CONFIG = {
  honoreeFullName: 'Sai Gurunadh Koppuravuri',
  honoreeDisplayName: 'GURUNADH',
  tagline: 'One man. Many passions. One extraordinary journey.',
  videos: {
    gym: {
      src: '/media/gym-workout.mp4',
      poster: '/media/gym-poster.webp',
      label: 'Chapter 01 — The Strength',
      description: 'Silhouetted dark gym training & disciplined lighting',
    },
    motorcycle: {
      src: '/media/motorcycle-ride.mp4',
      poster: '/media/motorcycle-poster.webp',
      label: 'Chapter 02 — The Freedom',
      description: 'Night highway headlights & winding mountain roads',
    },
    heritage: {
      src: '/media/south-indian-heritage.mp4',
      poster: '/media/heritage-poster.webp',
      label: 'Chapter 03 — The Roots',
      description: 'South Indian streets, carved temples & warm sunrise light',
    },
  },
  // Optional personal photos/videos of Gurunadh shown during the Convergence Reveal montage
  personalGallery: [],
};

const CHAPTERS = [
  { id: 'hero', code: '00', label: 'AWAKENING', navLabel: null },
  { id: 'strength', code: '01', label: 'THE STRENGTH', navLabel: 'THE STRENGTH' },
  { id: 'freedom', code: '02', label: 'THE FREEDOM', navLabel: 'THE FREEDOM' },
  { id: 'roots', code: '03', label: 'THE ROOTS', navLabel: 'THE ROOTS' },
  { id: 'convergence', code: '04', label: 'THE CELEBRATION', navLabel: 'THE CELEBRATION' },
];

// ============================================================================
// 2. THREE.JS DYNAMIC LOADER & WEBGL DETECTION
// Loads Three.js r128 safely without bundler failures; provides WebGL capability check.
// ============================================================================
let threeLoadPromise = null;

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function useThreeJS() {
  const [state, setState] = useState(() => ({
    THREE: typeof window !== 'undefined' && window.THREE ? window.THREE : null,
    webglSupported: typeof window !== 'undefined' ? detectWebGL() : false,
    failed: false,
  }));

  useEffect(() => {
    const supported = detectWebGL();
    if (!supported) {
      setState({ THREE: null, webglSupported: false, failed: true });
      return;
    }
    if (window.THREE) {
      setState({ THREE: window.THREE, webglSupported: true, failed: false });
      return;
    }

    if (!threeLoadPromise) {
      threeLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-three-cdn="true"]');
        if (existing) {
          existing.addEventListener('load', () => resolve(window.THREE));
          existing.addEventListener('error', reject);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.async = true;
        script.dataset.threeCdn = 'true';
        script.onload = () => {
          if (window.THREE) resolve(window.THREE);
          else reject(new Error('THREE global missing after load'));
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    let cancelled = false;
    threeLoadPromise
      .then((THREE) => {
        if (!cancelled) setState({ THREE, webglSupported: true, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ THREE: null, webglSupported: false, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// ============================================================================
// 3. PROCEDURAL WEB AUDIO API SOUND ENGINE (MUTED BY DEFAULT)
// Synthesizes distinct atmospheric chapter soundscapes with smooth crossfades.
// ============================================================================
class CinematicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = false;
    this.currentChapter = 'hero';
    this.layers = {};
    this.pulseTimer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;

    // Gentle warm lowpass filter for cinematic smoothness
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 1850;
    this.masterFilter.Q.value = 0.7;

    // Subtle spatial feedback delay for atmospheric depth
    this.delay = this.ctx.createDelay(1.0);
    this.delay.delayTime.value = 0.34;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.28;
    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.value = 0.22;

    this.masterGain.connect(this.masterFilter);
    this.masterFilter.connect(this.ctx.destination);
    this.masterFilter.connect(this.delay);
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.delayWet);
    this.delayWet.connect(this.ctx.destination);

    this._buildLayers();
  }

  _createNoiseBuffer() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  _buildLayers() {
    const createChordLayer = (freqs, type = 'sine', detuneAmt = 4, filterFreq = 900) => {
      const groupGain = this.ctx.createGain();
      groupGain.gain.value = 0.0001;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      groupGain.connect(filter);
      filter.connect(this.masterGain);

      const oscs = freqs.map((f, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = f;
        osc.detune.value = (idx % 2 === 0 ? 1 : -1) * detuneAmt;
        g.gain.value = 0.22 / freqs.length;
        osc.connect(g);
        g.connect(groupGain);
        osc.start();
        return osc;
      });
      return { gain: groupGain, oscs, filter };
    };

    // Hero / Opening: Deep sub-bass + moody D minor atmospheric pad
    this.layers.hero = createChordLayer([55, 110, 164.81, 220], 'sine', 5, 650);

    // Chapter 1 — Strength: Tense low sub-drone + rhythmic disciplined pulse handled by timer
    this.layers.strength = createChordLayer([49, 98, 146.83], 'triangle', 3, 420);

    // Chapter 2 — Freedom: Airy highway travel chord + wind noise
    const freedomLayer = createChordLayer([73.42, 146.83, 220, 261.63, 329.63], 'sine', 7, 1100);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this._createNoiseBuffer();
    noiseSource.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 1.6;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.35;
    noiseSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(freedomLayer.gain);
    noiseSource.start();
    this.layers.freedom = freedomLayer;

    // Chapter 3 — Roots: Warm South Indian tanpura-inspired Sa-Pa-Sa harmonic drone
    this.layers.roots = createChordLayer([73.42, 110.0, 146.83, 220.0, 293.66], 'triangle', 6, 820);

    // Chapter 4 — Convergence & Birthday Reveal: Warm uplifting Dmaj9 ambient chord swell
    this.layers.convergence = createChordLayer([73.42, 146.83, 185.0, 220.0, 277.18, 329.63], 'sine', 6, 1500);

    // Rhythmic pulse interval for Chapter 1 (Strength)
    this.pulseTimer = window.setInterval(() => {
      if (!this.enabled || !this.ctx || this.currentChapter !== 'strength') return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(84, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.16);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }, 880);
  }

  async setEnabled(shouldEnable) {
    this.enabled = shouldEnable;
    if (shouldEnable) {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.42, now, 0.45);
        this.setChapter(this.currentChapter);
      }
    } else if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.25);
    }
  }

  setChapter(chapterId) {
    this.currentChapter = chapterId;
    if (!this.ctx || !this.layers) return;
    const now = this.ctx.currentTime;
    Object.entries(this.layers).forEach(([key, layer]) => {
      const target = key === chapterId ? 0.9 : 0.0001;
      layer.gain.gain.cancelScheduledValues(now);
      layer.gain.gain.setTargetAtTime(target, now, 0.85);
    });
  }

  playLiquidRipple() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.55);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  playWishChime() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.0, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 2.3);
    });
  }

  dispose() {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

// ============================================================================
// 4. REUSABLE CINEMATIC MEDIA LAYER + ATMOSPHERIC CANVAS FALLBACKS
// Plays local/uploaded video or seamlessly renders rich GPU-friendly atmospheric scenes.
// ============================================================================
function AtmosphericFallbackCanvas({ variant = 'gym', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(320, Math.floor(rect.width));
      height = Math.max(200, Math.floor(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Seed deterministic particles
    const motes = Array.from({ length: 48 }, (_, i) => ({
      x: ((i * 73.13) % 100) / 100,
      y: ((i * 41.77) % 100) / 100,
      r: 0.8 + (i % 4) * 0.65,
      s: 0.15 + (i % 5) * 0.08,
      p: i * 0.7,
    }));

    const render = (timeMs) => {
      const t = timeMs * 0.001;
      ctx.clearRect(0, 0, width, height);

      if (variant === 'gym') {
        // Dark silhouetted gym lighting: volumetric emerald-silver shafts, mist & iron shadow silhouettes
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#040806');
        bg.addColorStop(0.5, '#09120D');
        bg.addColorStop(1, '#020403');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Overhead volumetric gym light beams
        for (let i = 0; i < 3; i++) {
          const bx = width * (0.22 + i * 0.28) + Math.sin(t * 0.25 + i) * 28;
          const beam = ctx.createLinearGradient(bx, 0, bx + 40, height * 0.92);
          beam.addColorStop(0, 'rgba(57, 255, 136, 0.14)');
          beam.addColorStop(0.45, 'rgba(17, 107, 58, 0.07)');
          beam.addColorStop(1, 'rgba(3, 5, 4, 0)');
          ctx.fillStyle = beam;
          ctx.beginPath();
          ctx.moveTo(bx - 30, 0);
          ctx.lineTo(bx + 30, 0);
          ctx.lineTo(bx + 170, height);
          ctx.lineTo(bx - 130, height);
          ctx.closePath();
          ctx.fill();
        }

        // Subtle barbell & athletic silhouette outline in deep shadow
        ctx.save();
        ctx.translate(width * 0.5, height * 0.62);
        const breathe = Math.sin(t * 1.1) * 4;
        ctx.strokeStyle = 'rgba(57, 255, 136, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-width * 0.24, breathe);
        ctx.lineTo(width * 0.24, breathe);
        ctx.stroke();

        // Plates on left & right of barbell silhouette
        [-width * 0.19, width * 0.19].forEach((px) => {
          ctx.fillStyle = 'rgba(8, 15, 11, 0.9)';
          ctx.strokeStyle = 'rgba(57, 255, 136, 0.22)';
          ctx.fillRect(px - 10, -48 + breathe, 20, 96);
          ctx.strokeRect(px - 10, -48 + breathe, 20, 96);
          ctx.fillRect(px + (px < 0 ? -24 : 12), -36 + breathe, 12, 72);
        });
        ctx.restore();

        // Drifting gym chalk dust motes
        motes.forEach((m) => {
          const x = ((m.x + t * 0.012 * m.s) % 1) * width;
          const y = ((m.y - t * 0.015 * m.s + 10) % 1) * height;
          const alpha = 0.08 + 0.14 * Math.sin(t * 1.3 + m.p);
          ctx.fillStyle = `rgba(141, 201, 165, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, m.r, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (variant === 'motorcycle') {
        // Night mountain highway motion trails, emerald moonlight & headlight sweep
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, '#020403');
        sky.addColorStop(0.52, '#07140D');
        sky.addColorStop(1, '#020303');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        const horizonY = height * 0.52;
        const vpX = width * 0.5 + Math.sin(t * 0.45) * width * 0.06;

        // Distant mountain silhouette
        ctx.fillStyle = '#050B07';
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= width; x += 28) {
          const ridge =
            Math.sin(x * 0.008 + 1.2) * 34 +
            Math.cos(x * 0.021) * 16 +
            Math.sin(x * 0.004 - 0.5) * 24;
          ctx.lineTo(x, horizonY - 22 - Math.abs(ridge));
        }
        ctx.lineTo(width, horizonY);
        ctx.closePath();
        ctx.fill();

        // Atmospheric horizon emerald haze
        const glow = ctx.createRadialGradient(vpX, horizonY, 8, vpX, horizonY, width * 0.42);
        glow.addColorStop(0, 'rgba(57, 255, 136, 0.22)');
        glow.addColorStop(0.45, 'rgba(17, 107, 58, 0.08)');
        glow.addColorStop(1, 'rgba(3, 5, 4, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // Perspective road surface & rushing streaks
        ctx.strokeStyle = 'rgba(57, 255, 136, 0.34)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(vpX, horizonY);
        ctx.lineTo(width * 0.05, height);
        ctx.moveTo(vpX, horizonY);
        ctx.lineTo(width * 0.95, height);
        ctx.stroke();

        // Flowing center dashes
        for (let i = 0; i < 12; i++) {
          const p = ((i / 12 + t * 0.42) % 1);
          const p2 = Math.min(1, p + 0.045);
          const y1 = horizonY + p * p * (height - horizonY);
          const y2 = horizonY + p2 * p2 * (height - horizonY);
          const x1 = vpX + (width * 0.5 - vpX) * p * p;
          const x2 = vpX + (width * 0.5 - vpX) * p2 * p2;
          ctx.strokeStyle = `rgba(57, 255, 136, ${0.15 + p * 0.55})`;
          ctx.lineWidth = 1 + p * 3;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (variant === 'streets' || variant === 'heritage' || variant === 'temple' || variant === 'celebration') {
        // South Indian Heritage atmospheres: subtle natural golden lamp/sunrise warmth balanced with obsidian-emerald theme
        const isCelebration = variant === 'celebration';
        const isTemple = variant === 'temple' || variant === 'heritage';

        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#040705');
        bg.addColorStop(0.55, isCelebration ? '#12120A' : '#0B130D');
        bg.addColorStop(1, '#030504');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Warm sunrise / temple lamp core glow
        const sunX = width * (isTemple ? 0.5 : 0.65);
        const sunY = height * (isCelebration ? 0.68 : 0.38);
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, width * 0.55);
        sunGlow.addColorStop(0, isCelebration ? 'rgba(255, 196, 102, 0.24)' : 'rgba(226, 190, 120, 0.16)');
        sunGlow.addColorStop(0.45, 'rgba(57, 255, 136, 0.09)');
        sunGlow.addColorStop(1, 'rgba(3, 5, 4, 0)');
        ctx.fillStyle = sunGlow;
        ctx.fillRect(0, 0, width, height);

        if (isTemple) {
          // Carved temple colonnade rhythm (architectural stone pillars receding in perspective)
          const pillarCount = 6;
          for (let i = 0; i < pillarCount; i++) {
            const x = width * (0.08 + i * 0.17) + Math.sin(t * 0.15) * 6;
            const pWidth = Math.max(18, width * 0.036);
            ctx.fillStyle = 'rgba(4, 7, 5, 0.85)';
            ctx.fillRect(x, height * 0.12, pWidth, height * 0.88);
            // Subtle stepped temple capital
            ctx.fillRect(x - 10, height * 0.16, pWidth + 20, 14);
            ctx.fillRect(x - 6, height * 0.82, pWidth + 12, 18);
            // Warm sunlight grazing edge
            ctx.fillStyle = 'rgba(232, 198, 128, 0.16)';
            ctx.fillRect(x + pWidth - 2, height * 0.12, 2, height * 0.88);
          }
          // Diagonal morning sun shafts
          ctx.save();
          ctx.fillStyle = 'rgba(244, 214, 150, 0.045)';
          for (let s = 0; s < 4; s++) {
            const sx = width * (0.15 + s * 0.22);
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx + 55, 0);
            ctx.lineTo(sx - 90, height);
            ctx.lineTo(sx - 155, height);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        } else if (variant === 'streets') {
          // Traditional South Indian street at sunrise with coconut palm silhouettes
          const palmPositions = [0.14, 0.31, 0.78, 0.9];
          palmPositions.forEach((pxRatio, idx) => {
            const baseX = width * pxRatio;
            const sway = Math.sin(t * 0.7 + idx * 1.4) * 8;
            const topX = baseX + (idx % 2 === 0 ? 22 : -22) + sway;
            const topY = height * (0.28 + (idx % 2) * 0.1);
            ctx.strokeStyle = 'rgba(5, 10, 7, 0.92)';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(baseX, height);
            ctx.quadraticCurveTo(baseX + sway * 0.5, height * 0.65, topX, topY);
            ctx.stroke();

            // Fronds
            for (let f = 0; f < 6; f++) {
              const angle = (f / 6) * Math.PI * 2 + sway * 0.015;
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = 'rgba(12, 24, 17, 0.85)';
              ctx.beginPath();
              ctx.moveTo(topX, topY);
              ctx.quadraticCurveTo(
                topX + Math.cos(angle) * 45,
                topY + Math.sin(angle) * 20 - 10,
                topX + Math.cos(angle) * 85,
                topY + Math.sin(angle) * 42 + 16
              );
              ctx.stroke();
            }
          });
        } else {
          // Celebration: warm brass deepam flickering lights + subtle emerald & amber embers
          const lampCount = 7;
          for (let i = 0; i < lampCount; i++) {
            const lx = width * (0.14 + (i / (lampCount - 1)) * 0.72);
            const ly = height * (0.72 + Math.sin(i * 1.4) * 0.06);
            const flicker = 0.85 + Math.sin(t * 6.5 + i * 2.1) * 0.15;
            const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 44 * flicker);
            lg.addColorStop(0, 'rgba(255, 224, 150, 0.65)');
            lg.addColorStop(0.35, 'rgba(245, 165, 65, 0.22)');
            lg.addColorStop(0.7, 'rgba(57, 255, 136, 0.06)');
            lg.addColorStop(1, 'rgba(3, 5, 4, 0)');
            ctx.fillStyle = lg;
            ctx.beginPath();
            ctx.arc(lx, ly, 44 * flicker, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Floating warm-emerald dust embers
        motes.forEach((m, idx) => {
          const x = ((m.x + Math.sin(t * 0.3 + m.p) * 0.02 + 1) % 1) * width;
          const y = ((m.y - t * 0.022 * m.s + 10) % 1) * height;
          const warm = idx % 3 === 0;
          ctx.fillStyle = warm
            ? `rgba(255, 206, 128, ${0.14 + 0.12 * Math.sin(t * 2 + m.p)})`
            : `rgba(57, 255, 136, ${0.12 + 0.12 * Math.sin(t * 1.6 + m.p)})`;
          ctx.beginPath();
          ctx.arc(x, y, m.r * 1.15, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      aria-hidden="true"
    />
  );
}

function CinematicMediaLayer({
  src,
  poster,
  mediaType = 'video',
  fallbackVariant = 'gym',
  overlayOpacity = 0.65,
  blurPx = 4,
  greenTint = true,
  className = '',
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const showFallback = !src || hasError;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Layer 1: Atmospheric fallback canvas (always smooth, disappears when real video loads) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: showFallback || !isLoaded ? 1 : 0 }}
      >
        <AtmosphericFallbackCanvas variant={fallbackVariant} />
      </div>

      {/* Real Video or Uploaded Image when available */}
      {!showFallback && mediaType === 'video' && (
        <video
          key={src}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{
            opacity: isLoaded ? 1 : 0,
            filter: `blur(${blurPx}px) saturate(0.55) contrast(1.08)`,
            transform: 'scale(1.04)',
          }}
        />
      )}

      {!showFallback && mediaType === 'image' && (
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{
            opacity: isLoaded ? 1 : 0,
            filter: `blur(${blurPx}px) saturate(0.6) contrast(1.08)`,
            transform: 'scale(1.04)',
          }}
        />
      )}

      {/* Layer 2 & 3: Dark atmospheric overlay + subtle green color grading + vignette */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `rgba(3, 5, 4, ${overlayOpacity})`,
        }}
      />
      {greenTint && (
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(17, 107, 58, 0.22) 0%, rgba(3, 5, 4, 0) 72%)',
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, transparent 35%, rgba(3, 5, 4, 0.86) 100%)',
        }}
      />
    </div>
  );
}

// ============================================================================
// 5. SIGNATURE INTERACTIVE 3D LIQUID SCULPTURE (Three.js + Custom GLSL Shaders)
// Features: Organic simplex displacement, cursor pull, drag rotation, click ripples,
// detaching/merging satellite droplets, scroll morphing, and 2D Canvas fallback.
// ============================================================================
const LIQUID_VERTEX_SHADER = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uRippleTime;
  uniform vec3 uRippleOrigin;
  uniform float uScrollMorph;
  uniform float uPortalOpen;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vRipple;

  // Ashima 3D Simplex Noise
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float getDisplacement(vec3 p) {
    float freq = 1.25 + uScrollMorph * 0.45;
    float n1 = snoise(p * freq + vec3(uTime * 0.28, uTime * 0.21, -uTime * 0.17));
    float n2 = snoise(p * (freq * 2.1) - vec3(uTime * 0.42, -uTime * 0.31, uTime * 0.25)) * 0.38;

    // Cursor proximity organic attraction
    vec3 mouseDir = normalize(vec3(uMouse.x * 1.4, uMouse.y * 1.4, 1.0));
    float cursorInfluence = pow(max(0.0, dot(normalize(p), mouseDir)), 3.0) * 0.22;

    // Click ripple wave across sculpture
    float dist = distance(normalize(p), normalize(uRippleOrigin));
    float wave = sin(dist * 16.0 - uRippleTime * 9.0) * exp(-uRippleTime * 1.8) * exp(-dist * 1.2);
    float rippleAmp = step(0.001, uRippleTime) * step(uRippleTime, 3.5) * wave * 0.24;

    // Portal expansion effect for convergence climax
    float portal = uPortalOpen * (0.45 + 0.35 * sin(length(p.xy) * 6.0 - uTime * 4.0));

    return (n1 * 0.26 + n2 * 0.14) + cursorInfluence + rippleAmp + portal;
  }

  void main() {
    float disp = getDisplacement(position);
    vDisplacement = disp;

    float dist = distance(normalize(position), normalize(uRippleOrigin));
    vRipple = step(0.001, uRippleTime) * step(uRippleTime, 3.5) *
              abs(sin(dist * 14.0 - uRippleTime * 9.0)) * exp(-uRippleTime * 1.9);

    vec3 newPosition = position + normal * disp;

    // Perturbed normal estimation for glossy mercury reflections
    float eps = 0.04;
    vec3 tangent = normalize(cross(normal, vec3(0.0, 1.0, 0.05)));
    vec3 bitangent = normalize(cross(normal, tangent));
    vec3 p1 = position + tangent * eps;
    vec3 p2 = position + bitangent * eps;
    vec3 d1 = (p1 + normalize(p1) * getDisplacement(p1)) - newPosition;
    vec3 d2 = (p2 + normalize(p2) * getDisplacement(p2)) - newPosition;
    vec3 perturbedNormal = normalize(cross(d1, d2));

    vNormal = normalize(mat3(modelMatrix) * perturbedNormal);
    vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const LIQUID_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uIntensity;
  uniform float uPortalOpen;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vRipple;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);

    // Physically inspired Fresnel rim
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.1);

    // Dynamic orbiting studio lights responding to cursor
    vec3 L1 = normalize(vec3(2.4 + uMouse.x * 2.5, 2.2 + uMouse.y * 2.5, 2.8));
    vec3 L2 = normalize(vec3(-2.6, -1.4, 1.8));
    vec3 L3 = normalize(vec3(sin(uTime * 0.6) * 2.2, cos(uTime * 0.5) * 2.0, -2.0));

    vec3 H1 = normalize(L1 + V);
    vec3 H2 = normalize(L2 + V);

    float spec1 = pow(max(dot(N, H1), 0.0), 72.0);
    float spec2 = pow(max(dot(N, H2), 0.0), 28.0);
    float diff1 = max(dot(N, L1), 0.0);
    float rimBack = pow(max(dot(N, L3), 0.0), 3.0);

    // Chrome environmental reflection band simulation
    vec3 R = reflect(-V, N);
    float envStripe = smoothstep(0.35, 0.92, sin(R.y * 5.0 + R.x * 2.5 + uTime * 0.45) * 0.5 + 0.5);

    // Strict Black Chrome + Molten Emerald Glass Palette
    vec3 obsidianCore = vec3(0.012, 0.022, 0.016);
    vec3 deepEmerald = vec3(0.066, 0.419, 0.227);     // #116B3A
    vec3 primaryEmerald = vec3(0.223, 1.0, 0.533);   // #39FF88
    vec3 mutedEmerald = vec3(0.553, 0.788, 0.647);   // #8DC9A5

    vec3 color = obsidianCore;
    // Deep subsurface emerald veins in displacement valleys
    color += deepEmerald * (0.28 + diff1 * 0.35) * smoothstep(-0.22, 0.38, vDisplacement);
    // Flowing black-chrome reflection bands
    color += deepEmerald * envStripe * 0.28;
    // Luminous Fresnel emerald glass rim
    color += mix(deepEmerald, primaryEmerald, fresnel) * fresnel * (1.25 * uIntensity);
    // Crisp specular highlights
    color += mix(primaryEmerald, vec3(0.95, 1.0, 0.96), 0.62) * spec1 * (1.35 * uIntensity);
    color += mutedEmerald * spec2 * 0.45;
    color += primaryEmerald * rimBack * 0.26;
    // Click ripple emerald shimmer
    color += primaryEmerald * vRipple * 0.85;
    // Portal glow intensification
    color += primaryEmerald * uPortalOpen * (0.65 + fresnel * 1.1);

    gl_FragColor = vec4(color, 0.98);
  }
`;

function LiquidSculpture2DFallback({ className = '', onInteract }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ mx: 0, my: 0, ripple: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId;
    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (ms) => {
      const t = ms * 0.001;
      const st = stateRef.current;
      st.ripple *= 0.94;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5 + st.mx * 18;
      const cy = h * 0.5 + st.my * 18;
      const baseR = Math.min(w, h) * 0.31;

      // Ambient emerald halo
      const halo = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.55);
      halo.addColorStop(0, 'rgba(57, 255, 136, 0.16)');
      halo.addColorStop(0.5, 'rgba(17, 107, 58, 0.08)');
      halo.addColorStop(1, 'rgba(3, 5, 4, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Organic black-chrome liquid polygon
      ctx.save();
      ctx.beginPath();
      const pts = 90;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const n =
          Math.sin(a * 3 + t * 1.2 + st.rx) * 14 +
          Math.cos(a * 5 - t * 0.9 + st.ry) * 8 +
          Math.sin(a * 7 + t * 2.2) * st.ripple * 18;
        const r = baseR + n;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(
        cx - baseR * 0.32,
        cy - baseR * 0.32,
        baseR * 0.08,
        cx,
        cy,
        baseR * 1.15
      );
      grad.addColorStop(0, '#1D4730');
      grad.addColorStop(0.35, '#07120C');
      grad.addColorStop(0.75, '#020403');
      grad.addColorStop(0.93, '#116B3A');
      grad.addColorStop(1, '#39FF88');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(57, 255, 136, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-cursor="3d"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        stateRef.current.mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        stateRef.current.my = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      }}
      onClick={() => {
        stateRef.current.ripple = 1.0;
        if (onInteract) onInteract();
      }}
      className={`w-full h-full block cursor-grab active:cursor-grabbing ${className}`}
    />
  );
}

function LiquidSculpture3D({
  THREE,
  webglSupported,
  scrollProgress = 0,
  intensity = 1.0,
  portalOpen = 0,
  onClickRipple,
  className = '',
}) {
  const containerRef = useRef(null);
  const propsRef = useRef({ scrollProgress, intensity, portalOpen, onClickRipple });
  propsRef.current = { scrollProgress, intensity, portalOpen, onClickRipple };

  useEffect(() => {
    if (!THREE || !webglSupported || !containerRef.current) return;

    const container = containerRef.current;
    let width = container.clientWidth || 420;
    let height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRippleTime: { value: 10.0 },
      uRippleOrigin: { value: new THREE.Vector3(0, 0, 1) },
      uScrollMorph: { value: 0 },
      uIntensity: { value: 1.0 },
      uPortalOpen: { value: 0.0 },
    };

    const sculptureGroup = new THREE.Group();
    scene.add(sculptureGroup);

    const detail = window.innerWidth < 768 ? 40 : 64;
    const coreGeo = new THREE.IcosahedronGeometry(1.52, detail);
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: LIQUID_VERTEX_SHADER,
      fragmentShader: LIQUID_FRAGMENT_SHADER,
      uniforms,
      transparent: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    sculptureGroup.add(coreMesh);

    // 5 glossy satellite liquid droplets that burst outward on click and coalesce back
    const dropletGeo = new THREE.IcosahedronGeometry(0.21, 18);
    const droplets = Array.from({ length: 5 }, (_, i) => {
      const mesh = new THREE.Mesh(dropletGeo, coreMat);
      const angle = (i / 5) * Math.PI * 2;
      mesh.userData = {
        dir: new THREE.Vector3(
          Math.cos(angle),
          Math.sin(angle) * 0.85,
          (i % 2 === 0 ? 0.5 : -0.5)
        ).normalize(),
        speed: 0.9 + (i % 3) * 0.22,
        phase: i * 1.25,
      };
      mesh.scale.setScalar(0.001);
      sculptureGroup.add(mesh);
      return mesh;
    });

    // Subtle orbiting emerald micro-particles around sculpture
    const pCount = 85;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 2.0 + Math.random() * 1.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x39ff88,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const particleHalo = new THREE.Points(pGeo, pMat);
    scene.add(particleHalo);

    // Interactive state
    const targetMouse = { x: 0, y: 0 };
    const currentMouse = { x: 0, y: 0 };
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };
    let rotVel = { x: 0, y: 0.003 };
    let burstProgress = 0; // 0 = coalesced, >0 = animating burst & return
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouse.x = Math.max(-1, Math.min(1, nx));
      targetMouse.y = Math.max(-1, Math.min(1, ny));

      if (isDragging) {
        const dx = e.clientX - prevPointer.x;
        const dy = e.clientY - prevPointer.y;
        rotVel.y = dx * 0.009;
        rotVel.x = dy * 0.009;
        sculptureGroup.rotation.y += rotVel.y;
        sculptureGroup.rotation.x += rotVel.x;
        prevPointer = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerDown = (e) => {
      isDragging = true;
      prevPointer = { x: e.clientX, y: e.clientY };
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e) => {
      if (isDragging) {
        const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (moved < 8) {
          // Click/tap -> fluid ripple + satellite droplet separation
          uniforms.uRippleTime.value = 0.002;
          uniforms.uRippleOrigin.value.set(targetMouse.x, targetMouse.y, 1.0).normalize();
          burstProgress = 0.001;
          if (propsRef.current.onClickRipple) propsRef.current.onClickRipple();
        }
      }
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'pan-y';
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 420;
      height = container.clientHeight || 420;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.06;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.06;

      uniforms.uTime.value = elapsed;
      uniforms.uMouse.value.set(currentMouse.x, currentMouse.y);
      uniforms.uScrollMorph.value += (propsRef.current.scrollProgress - uniforms.uScrollMorph.value) * 0.08;
      uniforms.uIntensity.value += (propsRef.current.intensity - uniforms.uIntensity.value) * 0.08;
      uniforms.uPortalOpen.value += (propsRef.current.portalOpen - uniforms.uPortalOpen.value) * 0.06;

      if (uniforms.uRippleTime.value < 5.0) {
        uniforms.uRippleTime.value += dt * 1.15;
      }

      // Smooth inertial rotation + subtle cursor tracking
      if (!isDragging) {
        sculptureGroup.rotation.y += rotVel.y + 0.0025 + propsRef.current.portalOpen * 0.025;
        sculptureGroup.rotation.x += rotVel.x;
        rotVel.x *= 0.94;
        rotVel.y *= 0.94;
      }
      sculptureGroup.position.x += (currentMouse.x * 0.22 - sculptureGroup.position.x) * 0.05;
      sculptureGroup.position.y += (currentMouse.y * 0.22 + Math.sin(elapsed * 0.9) * 0.08 - sculptureGroup.position.y) * 0.05;

      // Droplet separation & smooth re-coalescence animation
      if (burstProgress > 0) {
        burstProgress += dt * 0.55;
        if (burstProgress >= 1.0) {
          burstProgress = 0;
          droplets.forEach((d) => d.scale.setScalar(0.001));
        } else {
          // Smooth bell curve: shoot out then organically merge back
          const curve = Math.sin(burstProgress * Math.PI);
          droplets.forEach((d) => {
            const { dir, speed, phase } = d.userData;
            const dist = 1.2 + curve * 1.45 * speed;
            const orbit = elapsed * 1.8 + phase;
            d.position.set(
              dir.x * dist + Math.cos(orbit) * 0.18 * curve,
              dir.y * dist + Math.sin(orbit) * 0.18 * curve,
              dir.z * dist
            );
            const s = Math.max(0.001, curve * 1.05);
            d.scale.setScalar(s);
          });
        }
      }

      particleHalo.rotation.y = elapsed * 0.08;
      particleHalo.rotation.x = Math.sin(elapsed * 0.15) * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      coreGeo.dispose();
      dropletGeo.dispose();
      coreMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();
    };
  }, [THREE, webglSupported]);

  if (!THREE || !webglSupported) {
    return <LiquidSculpture2DFallback className={className} onInteract={onClickRipple} />;
  }

  return (
    <div
      ref={containerRef}
      data-cursor="3d"
      className={`w-full h-full cursor-grab active:cursor-grabbing select-none ${className}`}
      aria-label="Interactive 3D black-and-emerald liquid sculpture. Drag to rotate or click to ripple."
    />
  );
}

// ============================================================================
// 6. OPENING EXPERIENCE: "THE AWAKENING"
// Complete darkness -> single green light -> expanding liquid orb -> sequential text -> hero reveal.
// ============================================================================
function OpeningAwakening({ onComplete, onEnableSound }) {
  const [stage, setStage] = useState(0); // 0: dot, 1: expand + line 1, 2: line 2, 3: expand burst, 4: done
  const canvasRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 650);
    const t2 = setTimeout(() => setStage(2), 1850); // +1.2s after first line
    const t3 = setTimeout(() => setStage(3), 3400);
    const t4 = setTimeout(() => {
      setStage(4);
      onComplete();
    }, 4350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId;
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const startTime = performance.now();
    const render = (now) => {
      const t = (now - startTime) * 0.001;
      ctx.fillStyle = '#030504';
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;

      // Radius grows from pinpoint -> floating orb -> full viewport portal
      let targetR = 4;
      if (t > 0.45 && t < 3.25) {
        const p = Math.min(1, (t - 0.45) / 1.4);
        const ease = 1 - Math.pow(1 - p, 3);
        targetR = 4 + ease * Math.min(w, h) * 0.14;
      } else if (t >= 3.25) {
        const p = Math.min(1, (t - 3.25) / 0.95);
        const ease = p * p * p;
        targetR = Math.min(w, h) * 0.14 + ease * Math.max(w, h) * 0.85;
      }

      // Soft emerald corona
      const glow = ctx.createRadialGradient(cx, cy, targetR * 0.15, cx, cy, targetR * 2.6);
      glow.addColorStop(0, 'rgba(57, 255, 136, 0.34)');
      glow.addColorStop(0.35, 'rgba(17, 107, 58, 0.14)');
      glow.addColorStop(1, 'rgba(3, 5, 4, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Flowing liquid silhouette
      ctx.beginPath();
      const segs = 72;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const wob =
          Math.sin(a * 3 + t * 2.2) * (targetR * 0.08) +
          Math.cos(a * 5 - t * 1.7) * (targetR * 0.045);
        const r = targetR + wob;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const bodyGrad = ctx.createRadialGradient(cx - targetR * 0.25, cy - targetR * 0.25, 1, cx, cy, targetR * 1.1);
      bodyGrad.addColorStop(0, '#39FF88');
      bodyGrad.addColorStop(0.28, '#0E3520');
      bodyGrad.addColorStop(0.75, '#030604');
      bodyGrad.addColorStop(1, '#39FF88');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (stage === 4) return null;

  return (
    <div
      className={`fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#030504] transition-opacity duration-1000 ${
        stage === 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="relative z-10 text-center px-6 max-w-2xl">
        <p
          className="text-xs sm:text-sm md:text-base tracking-[0.42em] uppercase text-[#F4F7F4] font-light transition-all duration-1000"
          style={{
            opacity: stage >= 1 ? 1 : 0,
            transform: stage >= 1 ? 'translateY(0)' : 'translateY(14px)',
          }}
        >
          SOME STORIES AREN&apos;T TOLD.
        </p>

        <p
          className="mt-4 text-xs sm:text-sm md:text-base tracking-[0.42em] uppercase text-[#39FF88] font-medium transition-all duration-1000"
          style={{
            opacity: stage >= 2 ? 1 : 0,
            transform: stage >= 2 ? 'translateY(0)' : 'translateY(14px)',
          }}
        >
          THEY ARE EXPERIENCED.
        </p>
      </div>

      {/* Subtle Bottom Controls */}
      <div className="fixed bottom-8 left-0 right-0 z-20 flex items-center justify-center gap-6 px-6">
        <button
          type="button"
          onClick={() => {
            onEnableSound();
          }}
          className="text-[11px] tracking-[0.25em] uppercase text-[#8DC9A5] hover:text-[#39FF88] transition-colors flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88] rounded px-2 py-1"
        >
          <Volume2 className="w-3.5 h-3.5" />
          Enable Sound
        </button>
        <span className="text-[#8DC9A5]/30">|</span>
        <button
          type="button"
          onClick={onComplete}
          className="text-[11px] tracking-[0.25em] uppercase text-[#A2AEA5] hover:text-[#F4F7F4] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88] rounded px-2 py-1"
        >
          Skip Intro →
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 7. CUSTOM DESKTOP CURSOR (Disabled automatically on touch devices)
// ============================================================================
function CustomDesktopCursor() {
  const [enabled, setEnabled] = useState(false);
  const [cursorMode, setCursorMode] = useState('default'); // default | button | video | 3d
  const [ripples, setRipples] = useState([]);
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: -100, y: -100, rx: -100, ry: -100 });

  useEffect(() => {
    const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;
    setEnabled(true);
    document.documentElement.classList.add('custom-cursor-active');

    let rafId;
    const onMove = (e) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      const target = e.target;
      if (target && target.closest) {
        if (target.closest('[data-cursor="3d"]')) setCursorMode('3d');
        else if (target.closest('[data-cursor="video"]')) setCursorMode('video');
        else if (target.closest('button, a, [data-cursor="button"]')) setCursorMode('button');
        else setCursorMode('default');
      }
    };

    const onDown = (e) => {
      const id = Date.now() + Math.random();
      setRipples((prev) => [...prev.slice(-4), { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 650);
    };

    const loop = () => {
      pos.current.rx += (pos.current.x - pos.current.rx) * 0.16;
      pos.current.ry += (pos.current.y - pos.current.ry) * 0.16;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${pos.current.rx}px, ${pos.current.ry}px, 0)`;
      }
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    rafId = requestAnimationFrame(loop);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!enabled) return null;

  const isLabeled = cursorMode === 'video' || cursorMode === '3d';
  const labelText = cursorMode === '3d' ? 'DRAG TO ROTATE' : cursorMode === 'video' ? 'EXPLORE' : '';

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {/* Click fluid ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="fixed rounded-full border border-[#39FF88]/70 animate-cursor-ripple"
          style={{
            left: r.x,
            top: r.y,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
          }}
        />
      ))}

      {/* Outer Ring / Pill */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 transition-[width,height,background-color,border-color] duration-200 flex items-center justify-center rounded-full"
        style={{
          width: isLabeled ? (cursorMode === '3d' ? 128 : 88) : cursorMode === 'button' ? 46 : 30,
          height: isLabeled ? 32 : cursorMode === 'button' ? 46 : 30,
          marginLeft: isLabeled ? (cursorMode === '3d' ? -64 : -44) : cursorMode === 'button' ? -23 : -15,
          marginTop: isLabeled ? -16 : cursorMode === 'button' ? -23 : -15,
          border: '1px solid rgba(57, 255, 136, 0.58)',
          backgroundColor: isLabeled
            ? 'rgba(6, 12, 8, 0.82)'
            : cursorMode === 'button'
            ? 'rgba(57, 255, 136, 0.1)'
            : 'transparent',
          backdropFilter: isLabeled ? 'blur(8px)' : 'none',
        }}
      >
        {isLabeled && (
          <span className="text-[9px] font-semibold tracking-[0.22em] text-[#39FF88] whitespace-nowrap">
            {labelText}
          </span>
        )}
      </div>

      {/* Inner Emerald Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-[#39FF88] transition-opacity duration-150"
        style={{
          opacity: isLabeled ? 0 : 1,
          boxShadow: '0 0 10px rgba(57, 255, 136, 0.8)',
        }}
      />
    </div>
  );
}

// ============================================================================
// 8. MAGNETIC BUTTON HELPER
// Subtle magnetic displacement on desktop hover with crisp 180ms feedback.
// ============================================================================
function MagneticButton({ children, className = '', onClick, variant = 'primary', ...props }) {
  const btnRef = useRef(null);

  const handleMove = (e) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.14;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.14;
    btnRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const handleLeave = () => {
    if (btnRef.current) {
      btnRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
  };

  const baseStyles =
    variant === 'primary'
      ? 'bg-[#39FF88] text-[#030504] font-semibold hover:bg-[#66FFA4] shadow-[0_0_28px_rgba(57,255,136,0.22)] hover:shadow-[0_0_38px_rgba(57,255,136,0.38)]'
      : 'bg-[#0A0E0B]/70 text-[#F4F7F4] border border-[rgba(151,255,181,0.22)] hover:border-[#39FF88]/70 hover:text-[#39FF88] backdrop-blur-md';

  return (
    <button
      ref={btnRef}
      type="button"
      data-cursor="button"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-full text-xs sm:text-sm tracking-[0.18em] uppercase transition-all duration-[180ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF88] ${baseStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================================================
// 9. CHAPTER ONE: INTERACTIVE 3D METALLIC WEIGHT PLATE (Three.js + Fallback)
// Machined 45LB / 20KG dark iron-chrome weight plate with orbiting emerald rim light.
// ============================================================================
function WeightPlate3D({ THREE, webglSupported }) {
  const containerRef = useRef(null);
  const [rotDisplay, setRotDisplay] = useState(0);

  useEffect(() => {
    if (!THREE || !webglSupported || !containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || 340;
    let height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.1);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Procedural brushed iron & embossed markings canvas texture
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 512;
    const tctx = texCanvas.getContext('2d');
    tctx.fillStyle = '#121614';
    tctx.fillRect(0, 0, 512, 512);
    // Concentric machined grooves
    for (let r = 30; r < 252; r += 3) {
      tctx.strokeStyle = r % 6 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.22)';
      tctx.lineWidth = 1;
      tctx.beginPath();
      tctx.arc(256, 256, r, 0, Math.PI * 2);
      tctx.stroke();
    }
    // Embossed plate typography
    tctx.fillStyle = '#39FF88';
    tctx.font = '700 28px sans-serif';
    tctx.textAlign = 'center';
    tctx.fillText('20 KG', 256, 118);
    tctx.fillText('45 LB', 256, 412);
    tctx.fillStyle = 'rgba(244,247,244,0.45)';
    tctx.font = '600 14px sans-serif';
    tctx.fillText('BUILT DIFFERENT · GURUNADH', 256, 444);

    const plateTex = new THREE.CanvasTexture(texCanvas);

    // Build Weight Plate Group
    const plateGroup = new THREE.Group();
    scene.add(plateGroup);

    // Extruded disc with 3 machined ergonomic grip holes + center barbell hole
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1.68, 0, Math.PI * 2, false);

    // Center olympic hole
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, 0.32, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    // 3 Curved grip cutouts
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2 + 0.25;
      const a1 = a0 + 1.15;
      const rIn = 0.78;
      const rOut = 1.24;
      const hole = new THREE.Path();
      hole.absarc(0, 0, rOut, a0, a1, false);
      hole.absarc(0, 0, rIn, a1, a0, true);
      hole.closePath();
      shape.holes.push(hole);
    }

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.055,
      bevelSegments: 4,
      curveSegments: 40,
    });
    extrudeGeo.center();

    const darkIronMat = new THREE.MeshStandardMaterial({
      color: 0x161d18,
      metalness: 0.88,
      roughness: 0.28,
      bumpMap: plateTex,
      bumpScale: 0.015,
    });

    const plateMesh = new THREE.Mesh(extrudeGeo, darkIronMat);
    plateGroup.add(plateMesh);

    // Outer raised chrome-dark beveled rim
    const rimGeo = new THREE.TorusGeometry(1.68, 0.14, 20, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x1e2822,
      metalness: 0.94,
      roughness: 0.2,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    plateGroup.add(rimMesh);

    // Center machined steel collar
    const collarGeo = new THREE.TorusGeometry(0.35, 0.06, 16, 40);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x8dc9a5,
      metalness: 0.96,
      roughness: 0.16,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.z = 0.14;
    plateGroup.add(collarMesh);

    const collarBack = collarMesh.clone();
    collarBack.position.z = -0.14;
    plateGroup.add(collarBack);

    // Accent green engraved ring
    const ringGeo = new THREE.TorusGeometry(1.42, 0.014, 12, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.65 });
    const ringFront = new THREE.Mesh(ringGeo, ringMat);
    ringFront.position.z = 0.185;
    plateGroup.add(ringFront);

    const ringBack = ringFront.clone();
    ringBack.position.z = -0.185;
    plateGroup.add(ringBack);

    // Dramatic low-key gym lighting + dynamic emerald light that follows rotation
    const ambient = new THREE.AmbientLight(0x1b2b21, 0.9);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xeef7f1, 1.35);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const emeraldRim = new THREE.PointLight(0x39ff88, 3.8, 12);
    emeraldRim.position.set(2.8, 1.2, 2.2);
    scene.add(emeraldRim);

    const deepGreenFill = new THREE.PointLight(0x116b3a, 2.6, 10);
    deepGreenFill.position.set(-3, -2, 2);
    scene.add(deepGreenFill);

    plateGroup.rotation.set(0.24, -0.35, 0);

    let dragging = false;
    let prev = { x: 0, y: 0 };
    let vel = { x: 0, y: 0.004 };

    const onDown = (e) => {
      dragging = true;
      prev = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      vel.y = dx * 0.012;
      vel.x = dy * 0.012;
      plateGroup.rotation.y += vel.y;
      plateGroup.rotation.x += vel.x;
      prev = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      dragging = false;
    };

    const dom = renderer.domElement;
    dom.style.touchAction = 'pan-y';
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 340;
      height = container.clientHeight || 340;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    let rafId;
    let frame = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      frame++;
      if (!dragging) {
        plateGroup.rotation.y += vel.y + 0.0045;
        plateGroup.rotation.x += vel.x;
        vel.x *= 0.94;
        vel.y *= 0.94;
      }

      // Emerald light follows the rotation dynamically
      const angle = plateGroup.rotation.y * 1.6;
      emeraldRim.position.set(
        Math.cos(angle) * 3.1,
        Math.sin(angle * 0.7) * 2.2,
        2.1 + Math.sin(angle) * 0.8
      );

      if (frame % 12 === 0) {
        setRotDisplay(Math.round(((plateGroup.rotation.y * 180) / Math.PI) % 360));
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      extrudeGeo.dispose();
      rimGeo.dispose();
      collarGeo.dispose();
      ringGeo.dispose();
      darkIronMat.dispose();
      rimMat.dispose();
      collarMat.dispose();
      ringMat.dispose();
      plateTex.dispose();
      renderer.dispose();
    };
  }, [THREE, webglSupported]);

  if (!THREE || !webglSupported) {
    // Clean interactive CSS/SVG 3D fallback
    return (
      <div
        data-cursor="3d"
        className="w-full h-full flex items-center justify-center"
      >
        <svg viewBox="0 0 220 220" className="w-64 h-64 animate-[spin_18s_linear_infinite]">
          <defs>
            <radialGradient id="plateFallback" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#26382E" />
              <stop offset="55%" stopColor="#0C130F" />
              <stop offset="100%" stopColor="#040705" />
            </radialGradient>
          </defs>
          <circle cx="110" cy="110" r="96" fill="url(#plateFallback)" stroke="#39FF88" strokeOpacity="0.45" strokeWidth="2.5" />
          <circle cx="110" cy="110" r="78" fill="none" stroke="#39FF88" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="110" cy="110" r="22" fill="#030504" stroke="#8DC9A5" strokeWidth="3" />
          <text x="110" y="56" textAnchor="middle" fill="#39FF88" fontSize="13" fontWeight="700" letterSpacing="2">20 KG</text>
          <text x="110" y="174" textAnchor="middle" fill="#39FF88" fontSize="13" fontWeight="700" letterSpacing="2">45 LB</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div
        ref={containerRef}
        data-cursor="3d"
        className="w-full h-[300px] sm:h-[360px] cursor-grab active:cursor-grabbing"
      />
      <div className="mt-1 flex items-center gap-3 text-[10px] tracking-[0.26em] uppercase text-[#8DC9A5]/70">
        <span className="w-1.5 h-1.5 rounded-full bg-[#39FF88]" />
        <span>Drag to rotate · 20KG Cast Iron · {Math.abs(rotDisplay)}°</span>
      </div>
    </div>
  );
}

// ============================================================================
// 10. CHAPTER TWO: INTERACTIVE 3D ROAD + MOTORCYCLE SHOWCASE + POV RIDE MODE
// ============================================================================
function InteractiveRoad3D({ THREE, webglSupported, scrollFraction = 0 }) {
  const containerRef = useRef(null);
  const scrollRef = useRef(scrollFraction);
  scrollRef.current = scrollFraction;

  useEffect(() => {
    if (!THREE || !webglSupported || !containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030504, 0.042);

    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 120);
    camera.position.set(0, 2.35, 6.5);
    camera.lookAt(0, 1.1, -30);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Asphalt dark highway ribbon
    const roadGeo = new THREE.PlaneGeometry(11, 130, 16, 80);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x060a08,
      roughness: 0.72,
      metalness: 0.25,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.z = -52;
    scene.add(roadMesh);

    // Glowing thin emerald centerline
    const centerLineGeo = new THREE.PlaneGeometry(0.11, 130, 1, 80);
    centerLineGeo.rotateX(-Math.PI / 2);
    const centerLineMat = new THREE.MeshBasicMaterial({
      color: 0x39ff88,
      transparent: true,
      opacity: 0.82,
    });
    const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
    centerLine.position.set(0, 0.03, -52);
    scene.add(centerLine);

    // Passing road dashes & emerald edge reflectors
    const dashes = [];
    const dashGeo = new THREE.BoxGeometry(0.14, 0.02, 2.2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.65 });
    const postGeo = new THREE.BoxGeometry(0.08, 0.55, 0.08);
    const postMat = new THREE.MeshBasicMaterial({ color: 0x116b3a });

    for (let i = 0; i < 24; i++) {
      const z = -i * 4.8;
      const dLeft = new THREE.Mesh(dashGeo, dashMat);
      dLeft.position.set(-2.6, 0.04, z);
      scene.add(dLeft);

      const dRight = new THREE.Mesh(dashGeo, dashMat);
      dRight.position.set(2.6, 0.04, z);
      scene.add(dRight);

      const pLeft = new THREE.Mesh(postGeo, postMat);
      pLeft.position.set(-5.6, 0.3, z);
      scene.add(pLeft);

      const pRight = new THREE.Mesh(postGeo, postMat);
      pRight.position.set(5.6, 0.3, z);
      scene.add(pRight);

      dashes.push({ zBase: z, dLeft, dRight, pLeft, pRight });
    }

    // Procedural mountain ridges on left & right horizons
    const ridgeGroup = new THREE.Group();
    const mMat = new THREE.MeshStandardMaterial({
      color: 0x07100b,
      roughness: 0.95,
      metalness: 0.1,
      wireframe: false,
    });
    const mWireMat = new THREE.MeshBasicMaterial({
      color: 0x116b3a,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });

    const mountains = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const h = 4 + (i % 4) * 2.8;
      const coneGeo = new THREE.ConeGeometry(7 + (i % 3) * 3, h, 6);
      const m = new THREE.Mesh(coneGeo, mMat);
      const mw = new THREE.Mesh(coneGeo, mWireMat);
      m.add(mw);
      m.position.set(side * (12 + (i % 3) * 4), h * 0.42 - 0.5, -i * 7.5);
      ridgeGroup.add(m);
      mountains.push({ mesh: m, side, offset: i % 3, geo: coneGeo });
    }
    scene.add(ridgeGroup);

    // Subtle atmospheric lighting
    const hemi = new THREE.HemisphereLight(0x39ff88, 0x030504, 0.55);
    scene.add(hemi);
    const headlight = new THREE.PointLight(0x39ff88, 2.4, 28);
    headlight.position.set(0, 1.4, 3);
    scene.add(headlight);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 800;
      height = container.clientHeight || 520;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const s = scrollRef.current;

      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // Gentle procedural highway curve changing with scroll + time
      const curveAmount = Math.sin(t * 0.32 + s * 3.8) * 1.9;
      const travel = t * 14 + s * 42;

      // Curve road vertices smoothly
      const posAttr = roadGeo.attributes.position;
      const cAttr = centerLineGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const z = posAttr.getZ(i);
        const factor = Math.pow(Math.max(0, (6 - z) / 110), 2);
        const origX = (i % 17) / 16 * 11 - 5.5;
        posAttr.setX(i, origX + curveAmount * factor * 11);
      }
      posAttr.needsUpdate = true;

      for (let i = 0; i < cAttr.count; i++) {
        const z = cAttr.getZ(i);
        const factor = Math.pow(Math.max(0, (6 - z) / 110), 2);
        const origX = i % 2 === 0 ? -0.055 : 0.055;
        cAttr.setX(i, origX + curveAmount * factor * 11);
      }
      cAttr.needsUpdate = true;

      // Advance passing lane dashes and roadside posts
      dashes.forEach((item) => {
        let z = ((item.zBase + travel) % 115) - 110;
        if (z > 6) z -= 115;
        const factor = Math.pow(Math.max(0, (6 - z) / 110), 2);
        const shiftX = curveAmount * factor * 11;
        item.dLeft.position.set(-2.6 + shiftX, 0.04, z);
        item.dRight.position.set(2.6 + shiftX, 0.04, z);
        item.pLeft.position.set(-5.6 + shiftX, 0.3, z);
        item.pRight.position.set(5.6 + shiftX, 0.3, z);
      });

      // Scroll mountains past smoothly
      mountains.forEach((mObj, idx) => {
        let z = ((-idx * 7.5 + travel * 0.65) % 120) - 114;
        if (z > 6) z -= 120;
        const factor = Math.pow(Math.max(0, (6 - z) / 110), 2);
        const shiftX = curveAmount * factor * 11;
        // Transition subtly between mountain passes (closer) and open highways (wider)
        const openness = 11 + Math.sin(s * Math.PI) * 5 + mObj.offset * 3.5;
        mObj.mesh.position.x = mObj.side * openness + shiftX;
        mObj.mesh.position.z = z;
      });

      // Subtle camera parallax (no jarring shake)
      camera.position.x = mouse.x * 0.65;
      camera.position.y = 2.35 - mouse.y * 0.25;
      camera.lookAt(curveAmount * 2.2 + mouse.x * 0.8, 1.05, -34);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      roadGeo.dispose();
      roadMat.dispose();
      centerLineGeo.dispose();
      centerLineMat.dispose();
      dashGeo.dispose();
      dashMat.dispose();
      postGeo.dispose();
      postMat.dispose();
      mMat.dispose();
      mWireMat.dispose();
      mountains.forEach((m) => m.geo.dispose());
      renderer.dispose();
    };
  }, [THREE, webglSupported]);

  if (!THREE || !webglSupported) {
    return <AtmosphericFallbackCanvas variant="motorcycle" />;
  }

  return <div ref={containerRef} className="w-full h-full" aria-hidden="true" />;
}

function FirstPersonRideModal({ open, onClose }) {
  const canvasRef = useRef(null);
  const leanRef = useRef({ x: 0, tx: 0, speed: 118 });
  const [hudSpeed, setHudSpeed] = useState(118);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId;
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      leanRef.current.tx = (cx / window.innerWidth) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });

    let frame = 0;
    const render = (ms) => {
      const t = ms * 0.001;
      frame++;
      leanRef.current.x += (leanRef.current.tx - leanRef.current.x) * 0.07;
      const lean = leanRef.current.x;

      if (frame % 15 === 0) {
        setHudSpeed(Math.round(114 + Math.sin(t * 1.4) * 8 + Math.abs(lean) * 14));
      }

      ctx.save();
      ctx.fillStyle = '#020403';
      ctx.fillRect(0, 0, w, h);

      // Subtle motorcycle banking angle
      ctx.translate(w * 0.5, h * 0.52);
      ctx.rotate(-lean * 0.075);
      ctx.translate(-w * 0.5, -h * 0.52);

      const horizonY = h * 0.46;
      const curve = Math.sin(t * 0.7) * w * 0.08 - lean * w * 0.14;
      const vpX = w * 0.5 + curve;

      // Starlit dark sky + emerald horizon glow
      const sky = ctx.createRadialGradient(vpX, horizonY, 10, vpX, horizonY, w * 0.65);
      sky.addColorStop(0, 'rgba(57, 255, 136, 0.25)');
      sky.addColorStop(0.38, 'rgba(17, 107, 58, 0.1)');
      sky.addColorStop(1, 'rgba(3, 5, 4, 0)');
      ctx.fillStyle = sky;
      ctx.fillRect(-100, -100, w + 200, h + 200);

      // Sweeping headlight beam cone onto road
      const beam = ctx.createRadialGradient(w * 0.5, h * 0.85, 20, vpX, horizonY + 30, h * 0.72);
      beam.addColorStop(0, 'rgba(244, 247, 244, 0.18)');
      beam.addColorStop(0.35, 'rgba(57, 255, 136, 0.14)');
      beam.addColorStop(1, 'rgba(3, 5, 4, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(w * 0.35, h);
      ctx.lineTo(vpX - 45, horizonY);
      ctx.lineTo(vpX + 45, horizonY);
      ctx.lineTo(w * 0.65, h);
      ctx.closePath();
      ctx.fill();

      // Road edges
      ctx.strokeStyle = 'rgba(141, 201, 165, 0.42)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(vpX, horizonY);
      ctx.lineTo(-w * 0.12, h);
      ctx.moveTo(vpX, horizonY);
      ctx.lineTo(w * 1.12, h);
      ctx.stroke();

      // High-speed rushing emerald centerline dashes & light streaks
      for (let i = 0; i < 16; i++) {
        const p = (i / 16 + t * 1.45) % 1;
        const p2 = Math.min(1, p + 0.05);
        const y1 = horizonY + Math.pow(p, 2.3) * (h - horizonY);
        const y2 = horizonY + Math.pow(p2, 2.3) * (h - horizonY);
        const x1 = vpX + (w * 0.5 - vpX) * Math.pow(p, 2.1);
        const x2 = vpX + (w * 0.5 - vpX) * Math.pow(p2, 2.1);
        ctx.strokeStyle = `rgba(57, 255, 136, ${0.15 + p * 0.85})`;
        ctx.lineWidth = 1.5 + p * 5.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Passing roadside pine/light silhouettes
        const sideOffset = 35 + Math.pow(p, 2.0) * w * 0.72;
        ctx.fillStyle = `rgba(57, 255, 136, ${p * 0.32})`;
        ctx.fillRect(vpX - sideOffset, y1 - 8 * p, 3 + p * 4, 2 + p * 2);
        ctx.fillRect(vpX + sideOffset, y1 - 8 * p, 3 + p * 4, 2 + p * 2);
      }

      ctx.restore();

      // First-person dark handlebar & windscreen silhouette at bottom
      ctx.save();
      ctx.fillStyle = '#030504';
      ctx.strokeStyle = 'rgba(57, 255, 136, 0.35)';
      ctx.lineWidth = 2;

      // Left & Right clip-on handlebars
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.88);
      ctx.lineTo(w * 0.36, h * 0.82);
      ctx.lineTo(w * 0.64, h * 0.82);
      ctx.lineTo(w * 0.92, h * 0.88);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle glowing cockpit visor arch
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.92, Math.min(w * 0.24, 210), Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = 'rgba(57, 255, 136, 0.25)';
      ctx.stroke();
      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-[#030504] flex flex-col justify-between animate-fade-in">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Top Ride HUD */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-7">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#39FF88] animate-pulse" />
          <span className="text-[11px] tracking-[0.3em] uppercase text-[#8DC9A5]">
            POV Night Ride · Move cursor or drag to lean
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A0E0B]/85 border border-[rgba(151,255,181,0.28)] text-xs tracking-[0.2em] uppercase text-[#F4F7F4] hover:border-[#39FF88] hover:text-[#39FF88] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Exit Ride View
        </button>
      </div>

      {/* Bottom Digital Motorcycle Cluster */}
      <div className="relative z-10 pb-6 sm:pb-8 flex flex-col items-center pointer-events-none">
        <div className="px-7 py-3 rounded-2xl bg-[#030504]/85 border border-[rgba(151,255,181,0.22)] backdrop-blur-md flex items-center gap-8">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#39FF88] leading-none">
              {hudSpeed}
            </div>
            <div className="text-[9px] tracking-[0.26em] uppercase text-[#A2AEA5] mt-1">KM/H</div>
          </div>
          <div className="h-7 w-px bg-[rgba(151,255,181,0.16)]" />
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-semibold text-[#F4F7F4] leading-none">5</div>
            <div className="text-[9px] tracking-[0.26em] uppercase text-[#A2AEA5] mt-1">GEAR</div>
          </div>
          <div className="h-7 w-px bg-[rgba(151,255,181,0.16)]" />
          <div className="hidden sm:block text-left">
            <div className="text-[10px] tracking-[0.22em] uppercase text-[#39FF88]">OPEN HIGHWAY</div>
            <div className="text-[11px] text-[#A2AEA5]">Zero destination required.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractiveMotorcycleCard({ onEnterPOV }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-cursor="video"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEnterPOV}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEnterPOV();
        }
      }}
      className="group relative w-full max-w-2xl mx-auto rounded-2xl bg-[#0A0E0B]/75 border border-[rgba(151,255,181,0.15)] hover:border-[#39FF88]/50 p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88]"
    >
      {/* Volumetric Headlight Beam Cone on Hover */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[62%] h-56 pointer-events-none transition-all duration-700"
        style={{
          opacity: hovered ? 1 : 0.12,
          background:
            'conic-gradient(from 255deg at 18% 50%, rgba(57,255,136,0) 0deg, rgba(57,255,136,0.28) 18deg, rgba(244,247,244,0.24) 24deg, rgba(57,255,136,0.08) 38deg, rgba(57,255,136,0) 50deg)',
          transform: `translateY(-50%) scale(${hovered ? 1.08 : 0.92})`,
        }}
      />

      {/* Sweeping Emerald Reflection Line */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-1000"
        style={{
          background:
            'linear-gradient(110deg, transparent 30%, rgba(57,255,136,0.14) 50%, transparent 70%)',
          transform: hovered ? 'translateX(45%)' : 'translateX(-115%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Stylized Sculpted Motorcycle Silhouette */}
        <div
          className="w-full max-w-md transition-transform duration-700 ease-out"
          style={{
            transform: hovered
              ? 'perspective(900px) rotateY(-8deg) rotateX(3deg) scale(1.03)'
              : 'perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)',
          }}
        >
          <svg viewBox="0 0 520 230" className="w-full h-auto drop-shadow-[0_18px_32px_rgba(0,0,0,0.9)]">
            <defs>
              <linearGradient id="bikeBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={hovered ? '#2A4A38' : '#16201A'} />
                <stop offset="48%" stopColor="#080D0A" />
                <stop offset="100%" stopColor={hovered ? '#39FF88' : '#116B3A'} />
              </linearGradient>
              <radialGradient id="headlightGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4F7F4" />
                <stop offset="45%" stopColor="#39FF88" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#39FF88" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Road reflection shadow */}
            <ellipse cx="260" cy="204" rx="195" ry="10" fill="rgba(57,255,136,0.1)" />

            {/* Rear Wheel */}
            <g transform="translate(128, 152)">
              <circle r="46" fill="#050806" stroke="#1E2B23" strokeWidth="10" />
              <circle r="34" fill="none" stroke={hovered ? '#39FF88' : '#116B3A'} strokeWidth="2" strokeOpacity="0.7" />
              <g className={hovered ? 'origin-center animate-[spin_2.2s_linear_infinite]' : ''}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <line
                    key={deg}
                    x1="0"
                    y1="0"
                    x2={Math.cos((deg * Math.PI) / 180) * 32}
                    y2={Math.sin((deg * Math.PI) / 180) * 32}
                    stroke="#8DC9A5"
                    strokeOpacity="0.38"
                    strokeWidth="1.6"
                  />
                ))}
              </g>
              <circle r="9" fill="#101713" stroke="#39FF88" strokeWidth="1.5" />
            </g>

            {/* Front Wheel */}
            <g transform="translate(382, 152)">
              <circle r="46" fill="#050806" stroke="#1E2B23" strokeWidth="10" />
              <circle r="34" fill="none" stroke={hovered ? '#39FF88' : '#116B3A'} strokeWidth="2" strokeOpacity="0.7" />
              <g className={hovered ? 'origin-center animate-[spin_2.2s_linear_infinite]' : ''}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <line
                    key={deg}
                    x1="0"
                    y1="0"
                    x2={Math.cos((deg * Math.PI) / 180) * 32}
                    y2={Math.sin((deg * Math.PI) / 180) * 32}
                    stroke="#8DC9A5"
                    strokeOpacity="0.38"
                    strokeWidth="1.6"
                  />
                ))}
              </g>
              <circle r="9" fill="#101713" stroke="#39FF88" strokeWidth="1.5" />
            </g>

            {/* Swingarm, Exhaust & Engine Block */}
            <path
              d="M128 152 L222 146 L278 152 L292 112 L212 108 Z"
              fill="#0A100C"
              stroke="rgba(151,255,181,0.22)"
              strokeWidth="1.5"
            />
            <path
              d="M112 162 L216 158 L224 148 L120 148 Z"
              fill="#141F19"
              stroke="#8DC9A5"
              strokeOpacity="0.32"
              strokeWidth="1.2"
            />

            {/* Sculpted Fuel Tank, Tail & Sport-Cruiser Fairing */}
            <path
              d="M104 94 L176 106 C206 106 232 82 276 74 C312 68 346 78 366 96 L342 126 L268 124 L214 114 L148 112 Z"
              fill="url(#bikeBody)"
              stroke={hovered ? '#39FF88' : 'rgba(151,255,181,0.32)'}
              strokeWidth="1.6"
            />

            {/* Front Forks & Handlebars */}
            <line x1="336" y1="68" x2="382" y2="152" stroke="#8DC9A5" strokeWidth="5.5" strokeLinecap="round" strokeOpacity="0.72" />
            <path d="M322 64 L344 62 L352 72" fill="none" stroke="#F4F7F4" strokeWidth="3" strokeLinecap="round" />

            {/* Windshield */}
            <path d="M342 70 Q364 56 376 78" fill="none" stroke="#39FF88" strokeWidth="1.8" strokeOpacity="0.65" />

            {/* Tail LED strip */}
            <line x1="104" y1="96" x2="116" y2="100" stroke="#39FF88" strokeWidth="3" strokeLinecap="round" />

            {/* Headlight Assembly */}
            <ellipse cx="372" cy="96" rx="8" ry="11" fill={hovered ? '#F4F7F4' : '#8DC9A5'} />
            <circle
              cx="378"
              cy="96"
              r={hovered ? 30 : 12}
              fill="url(#headlightGlow)"
              opacity={hovered ? 0.95 : 0.3}
            />
          </svg>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between w-full gap-3 pt-4 border-t border-[rgba(151,255,181,0.1)]">
          <div className="text-center sm:text-left">
            <p className="text-[11px] tracking-[0.26em] uppercase text-[#39FF88]">
              {hovered ? 'High-Beam Engaged · Ready to Launch' : 'Interactive Machine Silhouette'}
            </p>
            <p className="text-xs text-[#A2AEA5] mt-0.5">
              Click to enter first-person night riding mode
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.22em] uppercase text-[#F4F7F4] group-hover:text-[#39FF88] transition-colors">
            Launch POV Ride <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 11. CHAPTER THREE: THE MEMORY WALK (Liquid Distortion Transition Between 3 Environments)
// ============================================================================
const HERITAGE_ENVIRONMENTS = [
  {
    id: 'streets',
    num: '01',
    title: 'The Streets',
    subtitle: 'Traditional South Indian street at sunrise',
    description:
      'Early morning quiet along timber-pillared verandas, swaying coconut palms, and fresh kolam patterns catching the first light of dawn.',
    fallbackVariant: 'streets',
  },
  {
    id: 'temple',
    num: '02',
    title: 'The Heritage',
    subtitle: 'Carved stone corridors & timeless architecture',
    description:
      'Centuries-old granite colonnades where geometry, craftsmanship, and shafts of golden sunlight speak without a single word.',
    fallbackVariant: 'temple',
  },
  {
    id: 'celebration',
    num: '03',
    title: 'The Celebration',
    subtitle: 'Festive South Indian warmth & living tradition',
    description:
      'The gentle glow of brass deepam flames, festive courtyards, family warmth, and the pride of carrying one’s roots everywhere.',
    fallbackVariant: 'celebration',
  },
];

function MemoryWalkExperience({ heritageMedia }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [distorting, setDistorting] = useState(false);

  const switchEnvironment = (nextIdx) => {
    if (nextIdx === activeIndex) return;
    setDistorting(true);
    setTimeout(() => {
      setActiveIndex(nextIdx);
    }, 280);
    setTimeout(() => {
      setDistorting(false);
    }, 760);
  };

  const currentEnv = HERITAGE_ENVIRONMENTS[activeIndex];

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Subtle South Indian Geometric Stepped Architectural Hairline Frame */}
      <div className="relative rounded-2xl overflow-hidden border border-[rgba(151,255,181,0.16)] bg-[#070B08]">
        {/* Architectural Corner Accents */}
        <svg
          className="absolute top-3 left-3 w-8 h-8 text-[#39FF88]/40 z-20 pointer-events-none"
          viewBox="0 0 32 32"
          fill="none"
        >
          <path d="M1 31V1H31M7 25V7H25M13 13H19V19" stroke="currentColor" strokeWidth="1" />
        </svg>
        <svg
          className="absolute top-3 right-3 w-8 h-8 text-[#39FF88]/40 z-20 pointer-events-none rotate-90"
          viewBox="0 0 32 32"
          fill="none"
        >
          <path d="M1 31V1H31M7 25V7H25M13 13H19V19" stroke="currentColor" strokeWidth="1" />
        </svg>

        {/* Viewport Stage */}
        <div
          data-cursor="video"
          className="relative h-[360px] sm:h-[430px] md:h-[470px] w-full overflow-hidden"
        >
          {/* SVG Liquid Turbulence Filter for authentic fluid distortion transitions */}
          <svg className="hidden" aria-hidden="true">
            <defs>
              <filter id="heritageLiquidDistort">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={distorting ? '0.022 0.045' : '0.001 0.001'}
                  numOctaves="2"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale={distorting ? 46 : 0}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>

          <div
            className="absolute inset-0 transition-all duration-700"
            style={{
              filter: distorting ? 'url(#heritageLiquidDistort) brightness(0.65) blur(3px)' : 'none',
              transform: distorting ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            <CinematicMediaLayer
              src={activeIndex === 0 ? heritageMedia?.src : null}
              poster={heritageMedia?.poster}
              mediaType={heritageMedia?.mediaType || 'video'}
              fallbackVariant={currentEnv.fallbackVariant}
              overlayOpacity={0.48}
              blurPx={1.5}
              greenTint={true}
            />
          </div>

          {/* Liquid Transition Emerald Veil */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              opacity: distorting ? 0.55 : 0,
              background:
                'radial-gradient(circle at center, rgba(57,255,136,0.22) 0%, rgba(3,5,4,0.92) 72%)',
            }}
          />

          {/* Environment Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.3em] uppercase text-[#39FF88]">
                <Compass className="w-3.5 h-3.5" />
                THE MEMORY WALK · {currentEnv.num} / 03
              </span>
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#F4F7F4]/60 hidden sm:inline">
                South Indian Heritage
              </span>
            </div>

            <div className="max-w-xl">
              <p className="text-xs tracking-[0.28em] uppercase text-[#8DC9A5] mb-2">
                {currentEnv.subtitle}
              </p>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-cinzel font-semibold tracking-wide text-[#F4F7F4]">
                {currentEnv.title}
              </h3>
              <p className="mt-3 text-sm sm:text-base text-[#A2AEA5] leading-relaxed">
                {currentEnv.description}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Environment Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[rgba(151,255,181,0.12)] bg-[#060A07]">
          {HERITAGE_ENVIRONMENTS.map((env, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={env.id}
                type="button"
                data-cursor="button"
                onClick={() => switchEnvironment(idx)}
                className={`relative text-left px-6 py-4 transition-all duration-300 border-b sm:border-b-0 sm:border-r last:border-0 border-[rgba(151,255,181,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88] ${
                  isActive ? 'bg-[#101713]' : 'hover:bg-[#0C120E]'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-0 right-0 h-[2px] bg-[#39FF88]" />
                )}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] tracking-[0.28em] uppercase ${
                      isActive ? 'text-[#39FF88]' : 'text-[#A2AEA5]'
                    }`}
                  >
                    ENV {env.num}
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#39FF88]" />}
                </div>
                <div
                  className={`mt-1 text-sm font-medium tracking-wider uppercase ${
                    isActive ? 'text-[#F4F7F4]' : 'text-[#A2AEA5]'
                  }`}
                >
                  {env.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 12. SIGNATURE EXPERIENCE: THE CONVERGENCE & BIRTHDAY REVEAL
// Continuous 6-Phase Cinematic Sequence:
// Phase 1: Three 3D Worlds Collide (Weight Plate, Motorcycle Wheel, Architectural Motif)
// Phase 2: Liquid Transformation (Dissolve into 2,400 emerald particles -> unified sculpture)
// Phase 3: Interactive Moment (Cursor distort, drag, click ripple + "REVEAL THE LEGEND →")
// Phase 4: Portal Zoom + 3-World Montage + "GURUNADH." + "HAPPY BIRTHDAY GURUNADH!" + Letter
// Phase 5/6: "MAKE A WISH →" Physics-driven graceful emerald particle wave (repeatable)
// ============================================================================
function ConvergenceThreeStage({
  THREE,
  webglSupported,
  phase, // 'idle' | 'collide' | 'transform' | 'interactive' | 'portal' | 'montage' | 'reveal'
  onSculptureRipple,
}) {
  const containerRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const rippleCbRef = useRef(onSculptureRipple);
  rippleCbRef.current = onSculptureRipple;

  useEffect(() => {
    if (!THREE || !webglSupported || !containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 8.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x182b20, 0.9));
    const key = new THREE.DirectionalLight(0xf4f7f4, 1.35);
    key.position.set(4, 5, 6);
    scene.add(key);
    const greenLight1 = new THREE.PointLight(0x39ff88, 3.8, 18);
    greenLight1.position.set(-4, 2, 4);
    scene.add(greenLight1);
    const greenLight2 = new THREE.PointLight(0x116b3a, 3.2, 18);
    greenLight2.position.set(4, -2, 3);
    scene.add(greenLight2);

    const metallicDarkMat = new THREE.MeshStandardMaterial({
      color: 0x151e18,
      metalness: 0.92,
      roughness: 0.22,
    });
    const emeraldAccentMat = new THREE.MeshStandardMaterial({
      color: 0x39ff88,
      emissive: 0x116b3a,
      emissiveIntensity: 0.65,
      metalness: 0.85,
      roughness: 0.2,
    });

    // --- OBJECT 1: Metallic Gym Weight Plate (Strength) ---
    const weightGroup = new THREE.Group();
    const wShape = new THREE.Shape();
    wShape.absarc(0, 0, 0.92, 0, Math.PI * 2, false);
    const wCenter = new THREE.Path();
    wCenter.absarc(0, 0, 0.2, 0, Math.PI * 2, true);
    wShape.holes.push(wCenter);
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2 + 0.3;
      const h = new THREE.Path();
      h.absarc(0, 0, 0.68, a0, a0 + 1.0, false);
      h.absarc(0, 0, 0.44, a0 + 1.0, a0, true);
      h.closePath();
      wShape.holes.push(h);
    }
    const weightGeo = new THREE.ExtrudeGeometry(wShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    weightGeo.center();
    weightGroup.add(new THREE.Mesh(weightGeo, metallicDarkMat));
    const wRimGeo = new THREE.TorusGeometry(0.92, 0.08, 14, 42);
    weightGroup.add(new THREE.Mesh(wRimGeo, metallicDarkMat));
    const wAccentGeo = new THREE.TorusGeometry(0.78, 0.015, 10, 42);
    const wAccent = new THREE.Mesh(wAccentGeo, emeraldAccentMat);
    wAccent.position.z = 0.11;
    weightGroup.add(wAccent);
    scene.add(weightGroup);

    // --- OBJECT 2: Spoked Motorcycle Wheel (Freedom) ---
    const wheelGroup = new THREE.Group();
    const tireGeo = new THREE.TorusGeometry(0.95, 0.18, 18, 48);
    wheelGroup.add(new THREE.Mesh(tireGeo, metallicDarkMat));
    const alloyGeo = new THREE.TorusGeometry(0.75, 0.04, 12, 48);
    wheelGroup.add(new THREE.Mesh(alloyGeo, emeraldAccentMat));
    const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.24, 18);
    hubGeo.rotateX(Math.PI / 2);
    wheelGroup.add(new THREE.Mesh(hubGeo, metallicDarkMat));
    const spokeGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.48, 8);
    for (let s = 0; s < 6; s++) {
      const sp = new THREE.Mesh(spokeGeo, metallicDarkMat);
      sp.rotation.z = (s / 6) * Math.PI;
      wheelGroup.add(sp);
    }
    scene.add(wheelGroup);

    // --- OBJECT 3: South Indian Architectural Heritage Motif (Roots) ---
    const heritageGroup = new THREE.Group();
    // Layered geometric temple stepped mandapam / lotus symmetry
    const tierGeos = [
      new THREE.CylinderGeometry(0.18, 0.38, 0.22, 8),
      new THREE.CylinderGeometry(0.42, 0.64, 0.22, 8),
      new THREE.CylinderGeometry(0.68, 0.92, 0.22, 8),
    ];
    tierGeos.forEach((g, idx) => {
      const m = new THREE.Mesh(g, metallicDarkMat);
      m.position.y = 0.34 - idx * 0.28;
      heritageGroup.add(m);
    });
    const mandalaRingGeo = new THREE.TorusGeometry(0.84, 0.025, 12, 8);
    const mandalaRing = new THREE.Mesh(mandalaRingGeo, emeraldAccentMat);
    mandalaRing.rotation.x = Math.PI / 2;
    mandalaRing.position.y = -0.34;
    heritageGroup.add(mandalaRing);
    const finialGeo = new THREE.OctahedronGeometry(0.16, 0);
    const finial = new THREE.Mesh(finialGeo, emeraldAccentMat);
    finial.position.y = 0.56;
    heritageGroup.add(finial);
    scene.add(heritageGroup);

    // --- CENTRAL UNIFIED 3D LIQUID SCULPTURE ---
    const sculptureUniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRippleTime: { value: 10.0 },
      uRippleOrigin: { value: new THREE.Vector3(0, 0, 1) },
      uScrollMorph: { value: 0.25 },
      uIntensity: { value: 1.15 },
      uPortalOpen: { value: 0.0 },
    };
    const liquidGeo = new THREE.IcosahedronGeometry(1.65, window.innerWidth < 768 ? 38 : 58);
    const liquidMat = new THREE.ShaderMaterial({
      vertexShader: LIQUID_VERTEX_SHADER,
      fragmentShader: LIQUID_FRAGMENT_SHADER,
      uniforms: sculptureUniforms,
      transparent: true,
    });
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.scale.setScalar(0.001);
    scene.add(liquidMesh);

    // --- 2,400 LUMINOUS EMERALD CONVERGENCE & BIRTHDAY PARTICLES ---
    const pCount = window.innerWidth < 768 ? 1100 : 2400;
    const pPos = new Float32Array(pCount * 3);
    const pMeta = [];
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.6 + Math.random() * 5.2;
      const y = (Math.random() - 0.5) * 4.8;
      pPos[i * 3] = Math.cos(angle) * radius;
      pPos[i * 3 + 1] = y;
      pPos[i * 3 + 2] = Math.sin(angle) * radius;
      pMeta.push({
        angle,
        radius,
        y,
        speed: 0.35 + Math.random() * 0.75,
        cluster: i % 3,
      });
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x39ff88,
      size: 0.048,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Interactive state for Phase 3
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let dragging = false;
    let prev = { x: 0, y: 0 };
    let downPos = { x: 0, y: 0 };
    let rotVel = { x: 0, y: 0.004 };

    const onMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (dragging && phaseRef.current === 'interactive') {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        rotVel.y = dx * 0.01;
        rotVel.x = dy * 0.01;
        liquidMesh.rotation.y += rotVel.y;
        liquidMesh.rotation.x += rotVel.x;
        prev = { x: e.clientX, y: e.clientY };
      }
    };
    const onDown = (e) => {
      if (phaseRef.current !== 'interactive') return;
      dragging = true;
      prev = { x: e.clientX, y: e.clientY };
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e) => {
      if (dragging && phaseRef.current === 'interactive') {
        const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (dist < 8) {
          sculptureUniforms.uRippleTime.value = 0.002;
          sculptureUniforms.uRippleOrigin.value.set(mouse.tx, mouse.ty, 1.0).normalize();
          if (rippleCbRef.current) rippleCbRef.current();
        }
      }
      dragging = false;
    };

    const dom = renderer.domElement;
    dom.style.touchAction = 'pan-y';
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // Smooth phase interpolation values
    let orbitRadius = 3.2;
    let objScale = 1.0;
    let liquidScale = 0.001;
    let camZ = 8.2;
    let portalFactor = 0;

    const clock = new THREE.Clock();
    let rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const currentPhase = phaseRef.current;

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      sculptureUniforms.uTime.value = t;
      sculptureUniforms.uMouse.value.set(mouse.x, mouse.y);
      if (sculptureUniforms.uRippleTime.value < 5.0) {
        sculptureUniforms.uRippleTime.value += dt * 1.15;
      }

      // Phase targets
      let targetOrbit = 3.1;
      let targetObjScale = 1.0;
      let targetLiquidScale = 0.001;
      let targetCamZ = 8.2;
      let targetPortal = 0;
      let targetIntensity = 1.15;

      if (currentPhase === 'collide') {
        targetOrbit = 2.4;
        targetObjScale = 1.0;
        targetLiquidScale = 0.25;
        targetCamZ = 7.4;
      } else if (currentPhase === 'transform') {
        targetOrbit = 0.05;
        targetObjScale = 0.001;
        targetLiquidScale = 1.1;
        targetCamZ = 6.2;
        targetIntensity = 1.45;
      } else if (currentPhase === 'interactive') {
        targetOrbit = 0;
        targetObjScale = 0.001;
        targetLiquidScale = 1.18;
        targetCamZ = 5.4;
        targetIntensity = 1.25;
      } else if (currentPhase === 'portal') {
        targetOrbit = 0;
        targetObjScale = 0.001;
        targetLiquidScale = 1.75;
        targetCamZ = 1.8;
        targetPortal = 1.0;
        targetIntensity = 2.2;
      } else if (currentPhase === 'montage' || currentPhase === 'reveal') {
        targetOrbit = 0;
        targetObjScale = 0.001;
        targetLiquidScale = 0.001;
        targetCamZ = 7.2;
        targetPortal = 0;
      }

      orbitRadius += (targetOrbit - orbitRadius) * 0.032;
      objScale += (targetObjScale - objScale) * 0.045;
      liquidScale += (targetLiquidScale - liquidScale) * 0.04;
      camZ += (targetCamZ - camZ) * 0.035;
      portalFactor += (targetPortal - portalFactor) * 0.04;
      sculptureUniforms.uPortalOpen.value = portalFactor;
      sculptureUniforms.uIntensity.value += (targetIntensity - sculptureUniforms.uIntensity.value) * 0.05;

      // Position & rotate the 3 world objects
      const spin = t * 0.55;
      const objects = [weightGroup, wheelGroup, heritageGroup];
      objects.forEach((obj, i) => {
        const a = spin + (i / 3) * Math.PI * 2;
        obj.position.set(
          Math.cos(a) * orbitRadius,
          Math.sin(t * 0.9 + i * 2.1) * 0.45 * objScale,
          Math.sin(a) * orbitRadius * 0.72
        );
        obj.rotation.y = t * (0.7 + i * 0.15);
        obj.rotation.x = Math.sin(t * 0.5 + i) * 0.35;
        obj.scale.setScalar(Math.max(0.001, objScale));
        obj.visible = objScale > 0.02;
      });

      // Central unified liquid sculpture
      liquidMesh.scale.setScalar(Math.max(0.001, liquidScale));
      liquidMesh.visible = liquidScale > 0.02;
      if (!dragging) {
        liquidMesh.rotation.y += rotVel.y + (currentPhase === 'portal' ? 0.045 : 0.004);
        liquidMesh.rotation.x += rotVel.x;
        rotVel.x *= 0.94;
        rotVel.y *= 0.94;
      }

      // Particle choreography across phases
      const posArr = pGeo.attributes.position.array;
      for (let i = 0; i < pCount; i++) {
        const m = pMeta[i];
        if (currentPhase === 'transform') {
          // Swirl tightly inward into the emerging liquid sculpture
          m.angle += dt * (1.8 + m.speed);
          const pullR = Math.max(0.4, m.radius * 0.42);
          posArr[i * 3] += (Math.cos(m.angle) * pullR - posArr[i * 3]) * 0.06;
          posArr[i * 3 + 1] += (Math.sin(m.angle * 1.5) * 0.8 - posArr[i * 3 + 1]) * 0.06;
          posArr[i * 3 + 2] += (Math.sin(m.angle) * pullR - posArr[i * 3 + 2]) * 0.06;
        } else if (currentPhase === 'portal') {
          // Particles stream past the camera like entering an emerald starlight portal
          posArr[i * 3 + 2] += dt * (8 + m.speed * 6);
          if (posArr[i * 3 + 2] > 6) posArr[i * 3 + 2] = -8;
        } else if (currentPhase === 'reveal') {
          // Gentle upward floating birthday constellation particles
          posArr[i * 3 + 1] += dt * (0.28 + m.speed * 0.25);
          posArr[i * 3] += Math.sin(t * 0.7 + i) * 0.002;
          if (posArr[i * 3 + 1] > 4.2) posArr[i * 3 + 1] = -4.2;
        } else {
          // Ambient gentle orbital drift
          m.angle += dt * 0.14 * m.speed;
          posArr[i * 3] = Math.cos(m.angle) * m.radius;
          posArr[i * 3 + 1] = m.y + Math.sin(t * 0.6 + i) * 0.18;
          posArr[i * 3 + 2] = Math.sin(m.angle) * m.radius;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      // Smooth cinematic camera orbit
      if (currentPhase === 'collide' || currentPhase === 'transform') {
        camera.position.x = Math.sin(t * 0.35) * 1.1;
        camera.position.y = 0.4 + Math.cos(t * 0.28) * 0.3;
      } else {
        camera.position.x += (mouse.x * 0.45 - camera.position.x) * 0.04;
        camera.position.y += (mouse.y * 0.35 - camera.position.y) * 0.04;
      }
      camera.position.z = camZ;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      weightGeo.dispose();
      wRimGeo.dispose();
      wAccentGeo.dispose();
      tireGeo.dispose();
      alloyGeo.dispose();
      hubGeo.dispose();
      spokeGeo.dispose();
      tierGeos.forEach((g) => g.dispose());
      mandalaRingGeo.dispose();
      finialGeo.dispose();
      metallicDarkMat.dispose();
      emeraldAccentMat.dispose();
      liquidGeo.dispose();
      liquidMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();
    };
  }, [THREE, webglSupported]);

  if (!THREE || !webglSupported) {
    return (
      <div className="absolute inset-0">
        <LiquidSculpture2DFallback onInteract={onSculptureRipple} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-cursor={phase === 'interactive' ? '3d' : 'default'}
      className="absolute inset-0 w-full h-full"
    />
  );
}

// Elegant Physics-Driven "MAKE A WISH" Particle Wave Canvas (No childish confetti)
function WishParticleCanvas({ wishTrigger }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId;
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.age += 0.016;

        if (p.age < 0.55) {
          // Phase A: Gather smoothly toward the wish point
          p.x += (p.ox - p.x) * 0.14;
          p.y += (p.oy - p.y) * 0.14;
        } else {
          // Phase B: Graceful fluid expansion wave
          p.x += p.vx;
          p.y += p.vy - 0.18; // soft upward buoyancy
          p.vx *= 0.986;
          p.vy *= 0.986;
          p.alpha *= 0.988;
        }

        if (p.alpha < 0.015 || p.age > 6.5) {
          list.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(${p.rgb}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    if (!wishTrigger) return;
    const { x, y } = wishTrigger;
    const count = 160;
    const spawned = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const startDist = 90 + Math.random() * 190;
      const burstSpeed = 1.1 + Math.random() * 4.4;
      const palette = i % 3 === 0 ? '57, 255, 136' : i % 3 === 1 ? '141, 201, 165' : '244, 247, 244';
      return {
        x: x + Math.cos(angle) * startDist,
        y: y + Math.sin(angle) * startDist,
        ox: x,
        oy: y,
        vx: Math.cos(angle) * burstSpeed,
        vy: Math.sin(angle) * burstSpeed,
        size: 1.1 + Math.random() * 2.1,
        alpha: 0.72 + Math.random() * 0.28,
        rgb: palette,
        age: 0,
      };
    });
    particlesRef.current = [...particlesRef.current.slice(-120), ...spawned];
  }, [wishTrigger]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      aria-hidden="true"
    />
  );
}

function ConvergenceBirthdaySection({
  THREE,
  webglSupported,
  mediaState,
  onLiquidRipple,
  onWishSound,
}) {
  const sectionRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | collide | transform | interactive | portal | montage | reveal
  const [montageIdx, setMontageIdx] = useState(0);
  const [revealBeat, setRevealBeat] = useState(0); // 0..4 progressive reveal beats
  const [wishMade, setWishMade] = useState(false);
  const [wishTrigger, setWishTrigger] = useState(null);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  const startConvergence = useCallback(() => {
    clearTimers();
    setWishMade(false);
    setRevealBeat(0);
    setPhase('collide');
    timersRef.current.push(setTimeout(() => setPhase('transform'), 4600));
    timersRef.current.push(setTimeout(() => setPhase('interactive'), 8400));
  }, []);

  // Auto-trigger Phase 1 smoothly when the visitor scrolls into the Convergence stage
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && phase === 'idle') {
          startConvergence();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [phase, startConvergence]);

  useEffect(() => () => clearTimers(), []);

  const triggerBirthdayReveal = () => {
    clearTimers();
    if (onLiquidRipple) onLiquidRipple();
    setPhase('portal');

    // Portal zooms -> brief poetic 3-world montage -> Birthday Reveal choreography
    timersRef.current.push(
      setTimeout(() => {
        setPhase('montage');
        setMontageIdx(0);
      }, 1700)
    );
    timersRef.current.push(setTimeout(() => setMontageIdx(1), 2600));
    timersRef.current.push(setTimeout(() => setMontageIdx(2), 3500));
    timersRef.current.push(
      setTimeout(() => {
        setPhase('reveal');
        setRevealBeat(1); // ONE MAN. THREE PASSIONS. COUNTLESS STORIES.
      }, 4450)
    );
    timersRef.current.push(setTimeout(() => setRevealBeat(2), 6200)); // GURUNADH.
    timersRef.current.push(setTimeout(() => setRevealBeat(3), 7900)); // AND TODAY... THE STORY GETS ANOTHER CHAPTER.
    timersRef.current.push(setTimeout(() => setRevealBeat(4), 9700)); // HAPPY BIRTHDAY GURUNADH! + Letter + Make a Wish
  };

  const handleMakeWish = (e) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    const cx = rect ? e.clientX - rect.left : window.innerWidth * 0.5;
    const cy = rect ? e.clientY - rect.top : window.innerHeight * 0.5;
    setWishMade(true);
    setWishTrigger({ x: cx, y: cy, id: Date.now() });
    if (onWishSound) onWishSound();
  };

  // Build montage slides: prioritize uploaded personal photos/videos of Gurunadh if available
  const montageSlides = useMemo(() => {
    if (mediaState.personalGallery && mediaState.personalGallery.length > 0) {
      return [0, 1, 2].map((i) => {
        const item = mediaState.personalGallery[i % mediaState.personalGallery.length];
        return {
          src: item.src,
          mediaType: item.mediaType,
          fallbackVariant: ['gym', 'motorcycle', 'heritage'][i],
          caption: ['THE STRENGTH', 'THE FREEDOM', 'THE ROOTS'][i],
        };
      });
    }
    return [
      { ...mediaState.videos.gym, fallbackVariant: 'gym', caption: 'THE STRENGTH' },
      { ...mediaState.videos.motorcycle, fallbackVariant: 'motorcycle', caption: 'THE FREEDOM' },
      { ...mediaState.videos.heritage, fallbackVariant: 'heritage', caption: 'THE ROOTS' },
    ];
  }, [mediaState]);

  return (
    <section
      id="convergence"
      ref={sectionRef}
      className="relative min-h-screen w-full bg-[#030504] flex flex-col items-center justify-center overflow-hidden py-24 px-5 sm:px-8"
    >
      {/* Unified 3D Convergence & Birthday Particle Stage */}
      <ConvergenceThreeStage
        THREE={THREE}
        webglSupported={webglSupported}
        phase={phase}
        onSculptureRipple={onLiquidRipple}
      />

      {/* Graceful Wish Physics Particle Layer */}
      <WishParticleCanvas wishTrigger={wishTrigger} />

      {/* Phase 4 Brief 3-World Atmospheric Montage */}
      {phase === 'montage' && (
        <div className="absolute inset-0 z-10 animate-fade-in">
          <CinematicMediaLayer
            src={montageSlides[montageIdx]?.src}
            poster={montageSlides[montageIdx]?.poster}
            mediaType={montageSlides[montageIdx]?.mediaType || 'video'}
            fallbackVariant={montageSlides[montageIdx]?.fallbackVariant || 'gym'}
            overlayOpacity={0.58}
            blurPx={2}
          />
          <div className="relative z-10 h-full flex items-center justify-center">
            <span className="text-xs sm:text-sm tracking-[0.45em] uppercase text-[#39FF88]">
              {montageSlides[montageIdx]?.caption}
            </span>
          </div>
        </div>
      )}

      {/* Subtle Darkening Backdrop when Wish is triggered */}
      <div
        className="absolute inset-0 z-10 bg-[#020403] pointer-events-none transition-opacity duration-1000"
        style={{ opacity: wishMade ? 0.58 : 0 }}
      />

      {/* Discreet Top Sequence Controls */}
      <div className="absolute top-24 left-0 right-0 z-30 flex items-center justify-center gap-3 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#060C08]/75 border border-[rgba(151,255,181,0.14)] backdrop-blur-md text-[10px] tracking-[0.26em] uppercase text-[#8DC9A5]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#39FF88]" />
          <span>
            {phase === 'collide' && 'Phase I · Three Worlds Collide'}
            {phase === 'transform' && 'Phase II · Liquid Convergence'}
            {phase === 'interactive' && 'Phase III · Touch The Sculpture'}
            {phase === 'portal' && 'Phase IV · Opening Portal'}
            {phase === 'montage' && 'Phase IV · Three Worlds, One Journey'}
            {phase === 'reveal' && 'Chapter Finale · Birthday Reveal'}
            {phase === 'idle' && 'The Convergence'}
          </span>
          {(phase === 'interactive' || phase === 'reveal') && (
            <button
              type="button"
              onClick={startConvergence}
              className="ml-2 pl-2 border-l border-[rgba(151,255,181,0.2)] text-[#A2AEA5] hover:text-[#39FF88] transition-colors inline-flex items-center gap-1"
              title="Replay Convergence"
            >
              <RotateCcw className="w-3 h-3" />
              Replay
            </button>
          )}
        </div>
      </div>

      {/* FOREGROUND CHOREOGRAPHY OVERLAYS */}
      <div className="relative z-30 w-full max-w-4xl mx-auto text-center pointer-events-none">
        {/* PHASE 1: THREE WORLDS COLLIDE */}
        {phase === 'collide' && (
          <div className="mt-[46vh] animate-fade-in">
            <p className="text-[11px] tracking-[0.38em] uppercase text-[#39FF88]">
              STRENGTH · FREEDOM · ROOTS
            </p>
            <h2 className="mt-3 text-2xl sm:text-4xl font-syne font-bold tracking-tight text-[#F4F7F4]">
              THREE WORLDS. ONE PERSON.
            </h2>
          </div>
        )}

        {/* PHASE 2: LIQUID TRANSFORMATION */}
        {phase === 'transform' && (
          <div className="mt-[46vh] animate-fade-in">
            <p className="text-xs sm:text-sm tracking-[0.38em] uppercase text-[#8DC9A5]">
              THREE PASSIONS MERGING INTO ONE FORM...
            </p>
          </div>
        )}

        {/* PHASE 3: INTERACTIVE SCULPTURE MOMENT */}
        {phase === 'interactive' && (
          <div className="flex flex-col items-center justify-between min-h-[68vh] py-4">
            <div className="animate-fade-in">
              <p className="text-xs sm:text-sm tracking-[0.36em] uppercase text-[#A2AEA5]">
                EVERY PASSION TELLS A STORY.
              </p>
              <p className="mt-2 text-sm sm:text-lg tracking-[0.32em] uppercase text-[#F4F7F4] font-medium">
                TOGETHER, THEY DEFINE A LEGEND.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 pointer-events-auto">
              <p className="text-[10px] tracking-[0.26em] uppercase text-[#8DC9A5]/75">
                Move cursor · Drag to rotate · Click to ripple
              </p>
              <MagneticButton onClick={triggerBirthdayReveal} variant="primary">
                REVEAL THE LEGEND <ArrowRight className="w-4 h-4" />
              </MagneticButton>
            </div>
          </div>
        )}

        {/* PHASE 4: PORTAL OPENING */}
        {phase === 'portal' && (
          <div className="animate-fade-in">
            <p className="text-xs sm:text-sm tracking-[0.44em] uppercase text-[#39FF88]">
              ENTERING THE NEXT CHAPTER
            </p>
          </div>
        )}

        {/* PHASE 4 & 6: THE BIRTHDAY REVEAL */}
        {phase === 'reveal' && (
          <div className="w-full py-10 pointer-events-auto">
            {/* Beat 1: ONE MAN. THREE PASSIONS. COUNTLESS STORIES. */}
            {revealBeat === 1 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm sm:text-lg tracking-[0.42em] uppercase text-[#A2AEA5]">ONE MAN.</p>
                <p className="text-sm sm:text-lg tracking-[0.42em] uppercase text-[#39FF88]">THREE PASSIONS.</p>
                <p className="text-sm sm:text-lg tracking-[0.42em] uppercase text-[#F4F7F4]">COUNTLESS STORIES.</p>
              </div>
            )}

            {/* Beat 2: GURUNADH. */}
            {revealBeat === 2 && (
              <div className="animate-liquid-text">
                <p className="text-xs tracking-[0.42em] uppercase text-[#8DC9A5] mb-3">
                  THREE PASSIONS. ONE LEGEND.
                </p>
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-syne font-extrabold tracking-tight emerald-metallic-text">
                  GURUNADH.
                </h2>
              </div>
            )}

            {/* Beat 3: AND TODAY... THE STORY GETS ANOTHER CHAPTER. */}
            {revealBeat === 3 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm sm:text-lg tracking-[0.4em] uppercase text-[#8DC9A5]">
                  AND TODAY...
                </p>
                <p className="text-lg sm:text-2xl tracking-[0.3em] uppercase text-[#F4F7F4] font-light">
                  THE STORY GETS ANOTHER CHAPTER.
                </p>
              </div>
            )}

            {/* Beat 4: FULL BIRTHDAY CELEBRATION & WISH INTERACTION */}
            {revealBeat >= 4 && (
              <div className="animate-liquid-text max-w-3xl mx-auto">
                {/* Floating Geometric Birthday Emblem */}
                <div className="mx-auto mb-6 w-14 h-14 rounded-full border border-[#39FF88]/35 bg-[#0A0E0B]/80 flex items-center justify-center shadow-[0_0_32px_rgba(57,255,136,0.2)]">
                  <Sparkles className="w-6 h-6 text-[#39FF88]" />
                </div>

                <p className="text-[11px] sm:text-xs tracking-[0.42em] uppercase text-[#39FF88] mb-3">
                  SAI GURUNADH KOPPURAVURI
                </p>

                <h2 className="text-4xl sm:text-6xl md:text-7xl font-syne font-extrabold leading-[1.02] tracking-tight emerald-metallic-text">
                  HAPPY BIRTHDAY
                  <br />
                  GURUNADH!
                </h2>

                {/* Heartfelt Birthday Message */}
                <div className="mt-8 sm:mt-10 p-6 sm:p-10 rounded-2xl bg-[#0A0E0B]/75 border border-[rgba(151,255,181,0.14)] backdrop-blur-xl text-left sm:text-center space-y-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                  <p className="text-sm sm:text-base md:text-lg text-[#F4F7F4]/92 leading-relaxed font-light">
                    Here&apos;s to the strength that keeps you moving, the roads that keep you exploring,
                    and the roots that keep you grounded.
                  </p>
                  <p className="text-sm sm:text-base md:text-lg text-[#A2AEA5] leading-relaxed font-light">
                    May this new chapter bring unforgettable adventures, meaningful moments, great
                    achievements, and countless reasons to smile.
                  </p>
                  <p className="text-sm sm:text-base md:text-lg text-[#A2AEA5] leading-relaxed font-light">
                    Keep chasing what excites you, stay true to who you are, and never stop enjoying
                    the journey.
                  </p>
                  <p className="text-sm sm:text-base md:text-lg text-[#F4F7F4] leading-relaxed font-normal">
                    Wishing you an amazing birthday and an even more incredible year ahead.
                  </p>

                  <div className="pt-5 border-t border-[rgba(151,255,181,0.12)]">
                    <p className="text-[11px] tracking-[0.34em] uppercase text-[#8DC9A5]">
                      WITH WARM WISHES,
                    </p>
                    <p className="mt-1 text-sm sm:text-base tracking-[0.28em] uppercase text-[#39FF88] font-semibold">
                      Team INTL & Saurabh ✦
                    </p>
                  </div>
                </div>

                {/* Wish Reveal Message */}
                {wishMade && (
                  <div className="mt-8 py-6 px-6 rounded-2xl border border-[#39FF88]/30 bg-[#060C08]/85 backdrop-blur-lg animate-fade-in">
                    <p className="text-lg sm:text-2xl font-syne font-bold tracking-[0.14em] uppercase text-[#39FF88]">
                      THE BEST IS YET TO COME.
                    </p>
                    <p className="mt-2.5 text-xs sm:text-sm tracking-[0.22em] uppercase text-[#F4F7F4]/90 leading-relaxed">
                      MAY THE ROAD AHEAD BE AS EXTRAORDINARY AS THE JOURNEY SO FAR.
                    </p>
                    <p className="mt-4 text-xs tracking-[0.36em] uppercase text-[#8DC9A5]">
                      HAPPY BIRTHDAY, GURUNADH.
                    </p>
                  </div>
                )}

                {/* Repeatable Make a Wish CTA */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <MagneticButton onClick={handleMakeWish} variant="primary">
                    {wishMade ? 'MAKE ANOTHER WISH' : 'MAKE A WISH'} <ArrowRight className="w-4 h-4" />
                  </MagneticButton>
                  <MagneticButton onClick={startConvergence} variant="secondary">
                    <RotateCcw className="w-3.5 h-3.5" /> Replay Convergence
                  </MagneticButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// 13. LIVE MEDIA STUDIO DRAWER (Drop/Upload Real Photos or Videos Without Editing Code)
// ============================================================================
function MediaStudioDrawer({ open, onClose, mediaState, setMediaState }) {
  if (!open) return null;

  const handleChapterFile = (chapterKey, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaState((prev) => ({
      ...prev,
      videos: {
        ...prev.videos,
        [chapterKey]: {
          ...prev.videos[chapterKey],
          src: url,
          mediaType,
          customName: file.name,
        },
      },
    }));
  };

  const handlePersonalGalleryFiles = (files) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      src: URL.createObjectURL(file),
      mediaType: file.type.startsWith('image/') ? 'image' : 'video',
    }));
    setMediaState((prev) => ({
      ...prev,
      personalGallery: [...prev.personalGallery, ...newItems],
    }));
  };

  const removeGalleryItem = (id) => {
    setMediaState((prev) => ({
      ...prev,
      personalGallery: prev.personalGallery.filter((item) => item.id !== id),
    }));
  };

  const resetAll = () => {
    setMediaState({
      videos: {
        gym: { ...PERSONAL_MEDIA_CONFIG.videos.gym, mediaType: 'video' },
        motorcycle: { ...PERSONAL_MEDIA_CONFIG.videos.motorcycle, mediaType: 'video' },
        heritage: { ...PERSONAL_MEDIA_CONFIG.videos.heritage, mediaType: 'video' },
      },
      personalGallery: [],
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-[#030504]/75 backdrop-blur-sm">
      <div
        className="w-full max-w-md h-full bg-[#0A0E0B]/95 border-l border-[rgba(151,255,181,0.16)] backdrop-blur-2xl p-6 sm:p-7 overflow-y-auto flex flex-col justify-between"
        role="dialog"
        aria-label="Personalize Media Studio"
      >
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-[rgba(151,255,181,0.12)]">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#39FF88]">MEDIA STUDIO</p>
              <h3 className="text-lg font-syne font-bold text-[#F4F7F4] mt-0.5">
                Personalize Gurunadh&apos;s Experience
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-[#A2AEA5] hover:text-[#39FF88] hover:bg-[#101713] transition-colors"
              aria-label="Close Media Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-4 text-xs text-[#A2AEA5] leading-relaxed">
            Upload local videos or photos below to preview Gurunadh&apos;s real footage live in your browser
            (100% private, client-side). For permanent deployment, place files in{' '}
            <code className="text-[#8DC9A5]">/public/media/</code> matching{' '}
            <code className="text-[#8DC9A5]">PERSONAL_MEDIA_CONFIG</code>.
          </p>

          {/* Chapter Media Overrides */}
          <div className="mt-6 space-y-4">
            <h4 className="text-[11px] tracking-[0.26em] uppercase text-[#8DC9A5]">
              Chapter Backgrounds
            </h4>
            {(['gym', 'motorcycle', 'heritage']).map((key) => {
              const item = mediaState.videos[key];
              return (
                <div
                  key={key}
                  className="p-4 rounded-xl bg-[#101713]/85 border border-[rgba(151,255,181,0.12)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-[#F4F7F4]">{item.label}</p>
                      <p className="text-[11px] text-[#A2AEA5] mt-0.5 truncate max-w-[230px]">
                        {item.customName ? `Loaded: ${item.customName}` : item.src}
                      </p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0E0B] border border-[rgba(151,255,181,0.2)] text-[11px] text-[#39FF88] hover:border-[#39FF88] transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Replace
                      <input
                        type="file"
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={(e) => handleChapterFile(key, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Personal Birthday Montage Uploads */}
          <div className="mt-7">
            <h4 className="text-[11px] tracking-[0.26em] uppercase text-[#8DC9A5] mb-3">
              Personal Photos &amp; Clips (Birthday Reveal Montage)
            </h4>
            <label className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-[rgba(151,255,181,0.28)] bg-[#060B08] hover:border-[#39FF88] transition-colors cursor-pointer text-center">
              <div className="flex items-center gap-2 text-[#39FF88]">
                <ImageIcon className="w-4 h-4" />
                <Film className="w-4 h-4" />
              </div>
              <span className="mt-2 text-xs text-[#F4F7F4]">
                Click to add Gurunadh&apos;s personal photos or videos
              </span>
              <span className="mt-1 text-[10px] text-[#A2AEA5]">
                Displayed during Phase IV Birthday Reveal montage
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handlePersonalGalleryFiles(e.target.files)}
              />
            </label>

            {mediaState.personalGallery.length > 0 && (
              <div className="mt-3 space-y-2">
                {mediaState.personalGallery.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#101713] border border-[rgba(151,255,181,0.12)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Check className="w-3.5 h-3.5 text-[#39FF88] shrink-0" />
                      <span className="text-xs text-[#F4F7F4] truncate">{g.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(g.id)}
                      className="text-[#A2AEA5] hover:text-red-400 p-1"
                      aria-label={`Remove ${g.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-[rgba(151,255,181,0.12)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-[#A2AEA5] hover:text-[#F4F7F4] transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-[#39FF88] text-[#030504] text-xs font-semibold tracking-[0.18em] uppercase hover:bg-[#66FFA4] transition-colors"
          >
            Apply &amp; Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 14. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const { THREE, webglSupported } = useThreeJS();
  const audioRef = useRef(null);

  const [introComplete, setIntroComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeChapter, setActiveChapter] = useState('hero');
  const [scrollY, setScrollY] = useState(0);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [heroSceneIdx, setHeroSceneIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [povRideOpen, setPovRideOpen] = useState(false);
  const [mediaDrawerOpen, setMediaDrawerOpen] = useState(false);
  const [strengthProgress, setStrengthProgress] = useState(0);
  const [freedomProgress, setFreedomProgress] = useState(0);

  const [mediaState, setMediaState] = useState(() => ({
    videos: {
      gym: { ...PERSONAL_MEDIA_CONFIG.videos.gym, mediaType: 'video' },
      motorcycle: { ...PERSONAL_MEDIA_CONFIG.videos.motorcycle, mediaType: 'video' },
      heritage: { ...PERSONAL_MEDIA_CONFIG.videos.heritage, mediaType: 'video' },
    },
    personalGallery: [...PERSONAL_MEDIA_CONFIG.personalGallery],
  }));

  // Initialize procedural audio engine instance
  useEffect(() => {
    audioRef.current = new CinematicAudioEngine();
    return () => {
      if (audioRef.current) audioRef.current.dispose();
    };
  }, []);

  // Crossfade chapter audio smoothly whenever activeChapter changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setChapter(activeChapter);
    }
  }, [activeChapter]);

  const toggleSound = useCallback(async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (audioRef.current) {
      await audioRef.current.setEnabled(next);
    }
  }, [soundEnabled]);

  const enableSoundExplicitly = useCallback(async () => {
    if (!soundEnabled) {
      setSoundEnabled(true);
      if (audioRef.current) {
        await audioRef.current.setEnabled(true);
      }
    }
  }, [soundEnabled]);

  const triggerLiquidSound = useCallback(() => {
    if (audioRef.current) audioRef.current.playLiquidRipple();
  }, []);

  const triggerWishSound = useCallback(() => {
    if (audioRef.current) audioRef.current.playWishChime();
  }, []);

  // Cycle Hero 3-scene background montage every 6 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setHeroSceneIdx((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Scroll tracking: active chapter, kinetic typography progress, road progression
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollY(y);
      setScrollRatio(Math.min(1, Math.max(0, y / docHeight)));

      const vh = window.innerHeight;
      let current = 'hero';
      CHAPTERS.forEach((ch) => {
        const el = document.getElementById(ch.id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= vh * 0.45) {
          current = ch.id;
        }
        if (ch.id === 'strength') {
          const p = (vh * 0.88 - rect.top) / (rect.height * 0.72);
          setStrengthProgress(Math.min(1, Math.max(0, p)));
        }
        if (ch.id === 'freedom') {
          const p = (vh - rect.top) / (rect.height + vh);
          setFreedomProgress(Math.min(1, Math.max(0, p)));
        }
      });
      setActiveChapter(current);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const heroScenes = [
    { ...mediaState.videos.gym, fallbackVariant: 'gym' },
    { ...mediaState.videos.motorcycle, fallbackVariant: 'motorcycle' },
    { ...mediaState.videos.heritage, fallbackVariant: 'heritage' },
  ];

  const strengthWord = 'STRENGTH'.split('');

  return (
    <div className="min-h-screen bg-[#030504] text-[#F4F7F4] font-inter selection:bg-[#39FF88] selection:text-[#030504] overflow-x-hidden">
      {/* Global Typography, Custom Scrollbar, Film Grain & Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');

        html {
          scroll-behavior: smooth;
          background-color: #030504;
        }
        body {
          background-color: #030504;
          color: #F4F7F4;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow-x: hidden;
        }
        .font-syne { font-family: 'Syne', 'Space Grotesk', sans-serif; }
        .font-cinzel { font-family: 'Cinzel', Georgia, serif; }
        .font-space { font-family: 'Space Grotesk', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }

        /* Slim 5px Emerald Scrollbar */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #030504; }
        ::-webkit-scrollbar-thumb { background: #39FF88; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #8DC9A5; }

        /* Hide default desktop cursor when custom cursor is active */
        @media (pointer: fine) {
          .custom-cursor-active, .custom-cursor-active * {
            cursor: none !important;
          }
        }

        /* Emerald Metallic Reflection Text */
        .emerald-metallic-text {
          background: linear-gradient(120deg, #F4F7F4 12%, #8DC9A5 42%, #39FF88 55%, #F4F7F4 78%, #116B3A 100%);
          background-size: 220% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmerEmerald 7s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        @keyframes shimmerEmerald {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeInUp 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes liquidTextReveal {
          0% { opacity: 0; filter: blur(12px); letter-spacing: 0.14em; transform: scale(0.96); }
          100% { opacity: 1; filter: blur(0px); letter-spacing: normal; transform: scale(1); }
        }
        .animate-liquid-text {
          animation: liquidTextReveal 1.15s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes cursorRipple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(5.2); opacity: 0; }
        }
        .animate-cursor-ripple {
          animation: cursorRipple 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes gymSweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .strength-letter-fill {
          background: linear-gradient(135deg, #0D2015 0%, #39FF88 26%, #0B1911 52%, #8DC9A5 76%, #08120C 100%);
          background-size: 260% 260%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-stroke: 1px rgba(151, 255, 181, 0.25);
          animation: gymSweep 8s ease-in-out infinite;
        }

        /* Subtle Low-Opacity Film Grain */
        .film-grain-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
          opacity: 0.035;
        }
      `}</style>

      {/* Global Low-Opacity Film Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[70] film-grain-overlay" aria-hidden="true" />

      {/* Custom Desktop Cursor */}
      <CustomDesktopCursor />

      {/* Opening Cinematic Experience: THE AWAKENING */}
      {!introComplete && (
        <OpeningAwakening
          onComplete={() => setIntroComplete(true)}
          onEnableSound={enableSoundExplicitly}
        />
      )}

      {/* ==================================================================== */}
      {/* FLOATING MINIMAL NAVIGATION BAR                                      */}
      {/* ==================================================================== */}
      <header
        className="fixed top-4 left-4 right-4 z-50 transition-all duration-500"
        style={{
          opacity: introComplete ? 1 : 0,
          transform: introComplete ? 'translateY(0)' : 'translateY(-16px)',
        }}
      >
        <nav
          aria-label="Primary Navigation"
          className="max-w-6xl mx-auto h-16 px-5 sm:px-7 rounded-[14px] flex items-center justify-between border border-[rgba(151,255,181,0.12)] transition-colors duration-300"
          style={{
            backgroundColor: scrollY > 40 ? 'rgba(6, 12, 8, 0.82)' : 'rgba(6, 12, 8, 0.68)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          {/* Brand Mark */}
          <button
            type="button"
            onClick={() => scrollToSection('hero')}
            className="text-xl font-syne font-extrabold tracking-tight text-[#F4F7F4] hover:text-[#39FF88] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88] rounded px-1"
          >
            G<span className="text-[#39FF88]">.</span>
          </button>

          {/* Desktop Chapter Links */}
          <div className="hidden md:flex items-center gap-7">
            {CHAPTERS.filter((c) => c.navLabel).map((ch) => {
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToSection(ch.id)}
                  className={`relative py-2 text-[11px] tracking-[0.22em] uppercase transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88] rounded ${
                    isActive ? 'text-[#39FF88] font-medium' : 'text-[#F4F7F4]/78 hover:text-[#F4F7F4]'
                  }`}
                >
                  {ch.navLabel}
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#39FF88] rounded-full transition-transform duration-300 origin-left"
                    style={{ transform: isActive ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </button>
              );
            })}
          </div>

          {/* Sound Toggle + Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundEnabled}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-[10px] tracking-[0.22em] uppercase transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88] ${
                soundEnabled
                  ? 'border-[#39FF88]/60 bg-[#116B3A]/25 text-[#39FF88]'
                  : 'border-[rgba(151,255,181,0.16)] bg-[#0A0E0B]/70 text-[#A2AEA5] hover:text-[#F4F7F4]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-[#F4F7F4] hover:text-[#39FF88] border border-[rgba(151,255,181,0.12)]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Compact Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 max-w-6xl mx-auto rounded-[14px] bg-[#060C08]/95 border border-[rgba(151,255,181,0.16)] backdrop-blur-xl p-4 space-y-1 animate-fade-in">
            {CHAPTERS.filter((c) => c.navLabel).map((ch) => {
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToSection(ch.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs tracking-[0.24em] uppercase transition-colors ${
                    isActive
                      ? 'bg-[#101713] text-[#39FF88]'
                      : 'text-[#F4F7F4]/80 hover:bg-[#0A0E0B]'
                  }`}
                >
                  <span>{ch.navLabel}</span>
                  <span className="text-[10px] text-[#8DC9A5]/70">{ch.code}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ==================================================================== */}
      {/* DESKTOP RIGHT-EDGE VERTICAL CHAPTER PROGRESS INDICATOR               */}
      {/* ==================================================================== */}
      <aside
        aria-label="Chapter Progress"
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-5"
      >
        <div className="relative flex flex-col items-end gap-4 pr-3">
          {/* Vertical Track */}
          <div className="absolute right-0 top-1 bottom-1 w-[2px] bg-[rgba(151,255,181,0.14)] rounded-full overflow-hidden">
            <div
              className="w-full bg-[#39FF88] transition-all duration-200"
              style={{ height: `${Math.max(8, scrollRatio * 100)}%` }}
            />
          </div>

          {CHAPTERS.map((ch) => {
            const isActive = activeChapter === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => scrollToSection(ch.id)}
                className="group flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88] rounded"
              >
                <span
                  className={`text-[9px] tracking-[0.26em] uppercase transition-all duration-300 ${
                    isActive
                      ? 'opacity-100 text-[#39FF88] translate-x-0'
                      : 'opacity-0 group-hover:opacity-80 text-[#A2AEA5] translate-x-1 group-hover:translate-x-0'
                  }`}
                >
                  {ch.label}
                </span>
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-[#39FF88] scale-125 shadow-[0_0_10px_#39FF88]'
                      : 'bg-[#8DC9A5]/35 group-hover:bg-[#8DC9A5]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* MAIN HERO SECTION                                                    */}
      {/* ==================================================================== */}
      <main>
        <section
          id="hero"
          className="relative min-h-screen w-full flex flex-col justify-between pt-28 pb-10 px-5 sm:px-8 lg:px-14 overflow-hidden"
        >
          {/* 3-Scene Slow-Crossfading Cinematic Montage Backdrop */}
          <div className="absolute inset-0 pointer-events-none">
            {heroScenes.map((sceneItem, idx) => (
              <div
                key={sceneItem.fallbackVariant}
                className="absolute inset-0 transition-opacity duration-[1200ms]"
                style={{ opacity: heroSceneIdx === idx ? 1 : 0 }}
              >
                <CinematicMediaLayer
                  src={sceneItem.src}
                  poster={sceneItem.poster}
                  mediaType={sceneItem.mediaType || 'video'}
                  fallbackVariant={sceneItem.fallbackVariant}
                  overlayOpacity={0.65}
                  blurPx={5}
                  greenTint={true}
                />
              </div>
            ))}
          </div>

          {/* Hero Composition: Desktop Left Typography + Right 3D Liquid Sculpture */}
          <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-6">
            {/* Left Column: Monumental Typography */}
            <div className="lg:col-span-7 text-center lg:text-left order-1">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0A0E0B]/70 border border-[rgba(151,255,181,0.15)] backdrop-blur-md mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#39FF88] animate-pulse" />
                <span className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[#8DC9A5]">
                  {PERSONAL_MEDIA_CONFIG.tagline}
                </span>
              </div>

              <h1 className="text-5xl sm:text-7xl md:text-8xl xl:text-[6.2rem] font-syne font-extrabold tracking-tight leading-[0.94] text-[#F4F7F4]">
                GURUNADH<span className="text-[#39FF88]">.</span>
              </h1>

              <p className="mt-4 text-lg sm:text-2xl md:text-3xl font-space font-medium tracking-[0.22em] uppercase text-[#8DC9A5]">
                BEYOND THE ORDINARY.
              </p>

              <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-sm sm:text-base md:text-lg text-[#A2AEA5] font-light leading-relaxed">
                Strength in his spirit. Freedom in his journey. Tradition in his soul.
              </p>

              {/* Hero CTAs */}
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <MagneticButton onClick={() => scrollToSection('strength')} variant="primary">
                  ENTER HIS WORLD <ArrowRight className="w-4 h-4" />
                </MagneticButton>
                <MagneticButton onClick={() => scrollToSection('convergence')} variant="secondary">
                  EXPLORE THE JOURNEY
                </MagneticButton>
              </div>
            </div>

            {/* Right Column: Signature Interactive 3D Liquid Sculpture */}
            <div className="lg:col-span-5 order-2 flex flex-col items-center justify-center">
              <div className="relative w-[300px] h-[300px] sm:w-[390px] sm:h-[390px] lg:w-[460px] lg:h-[460px]">
                {/* Soft Emerald Atmospheric Halo */}
                <div
                  className="absolute inset-8 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(57,255,136,0.16) 0%, rgba(17,107,58,0.06) 45%, transparent 72%)',
                  }}
                />
                <LiquidSculpture3D
                  THREE={THREE}
                  webglSupported={webglSupported}
                  scrollProgress={scrollRatio}
                  onClickRipple={triggerLiquidSound}
                />
              </div>
              <span className="text-[10px] tracking-[0.28em] uppercase text-[#8DC9A5]/65 mt-1">
                Interactive Fluid · Drag to Rotate · Click to Ripple
              </span>
            </div>
          </div>

          {/* Hero Bottom Bar & Scroll Indicator */}
          <div className="relative z-10 max-w-7xl w-full mx-auto pt-8 flex flex-col items-center gap-4">
            <p className="text-[10px] sm:text-xs tracking-[0.38em] uppercase text-[#A2AEA5] text-center">
              AN EXPERIENCE CREATED FOR YOUR BIRTHDAY
            </p>
            <button
              type="button"
              onClick={() => scrollToSection('strength')}
              aria-label="Scroll to Chapter One"
              className="group flex flex-col items-center gap-2 text-[#39FF88]/80 hover:text-[#39FF88] transition-colors"
            >
              <div className="w-px h-10 bg-gradient-to-b from-[#39FF88] to-transparent group-hover:h-12 transition-all duration-300" />
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            </button>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* CHAPTER ONE: THE STRENGTH ("BUILT DIFFERENT.")                       */}
        {/* ==================================================================== */}
        <section
          id="strength"
          className="relative min-h-screen w-full py-28 sm:py-36 px-5 sm:px-8 lg:px-14 overflow-hidden bg-[#030504]"
        >
          {/* Dark Gym Silhouette Backdrop */}
          <CinematicMediaLayer
            src={mediaState.videos.gym.src}
            poster={mediaState.videos.gym.poster}
            mediaType={mediaState.videos.gym.mediaType}
            fallbackVariant="gym"
            overlayOpacity={0.68}
            blurPx={3}
            greenTint={true}
          />

          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Chapter Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-xs tracking-[0.36em] uppercase text-[#39FF88] mb-3">
                  CHAPTER 01 · THE STRENGTH
                </p>
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-syne font-extrabold tracking-tight text-[#F4F7F4]">
                  BUILT DIFFERENT.
                </h2>
                <p className="mt-4 text-base sm:text-lg text-[#A2AEA5] max-w-xl font-light">
                  Every rep. Every challenge. Every step forward.
                </p>
              </div>
              <div className="hidden md:block text-right">
                <span className="text-[11px] tracking-[0.3em] uppercase text-[#8DC9A5]/70">
                  DISCIPLINE OVER NOISE
                </span>
              </div>
            </div>

            {/* Kinetic Scroll-Triggered Typography: Enormous "STRENGTH" */}
            <div
              data-cursor="video"
              className="my-14 sm:my-20 py-6 sm:py-10 border-y border-[rgba(151,255,181,0.12)] overflow-hidden"
            >
              <div
                className="flex items-center justify-between select-none"
                aria-label="STRENGTH"
              >
                {strengthWord.map((letter, idx) => {
                  const threshold = idx / strengthWord.length;
                  const localP = Math.min(1, Math.max(0, (strengthProgress * 1.35 - threshold * 0.7) / 0.35));
                  return (
                    <span
                      key={`${letter}-${idx}`}
                      className="text-5xl sm:text-7xl md:text-8xl lg:text-[7.5rem] xl:text-[8.8rem] font-syne font-extrabold leading-none strength-letter-fill transition-all duration-300"
                      style={{
                        opacity: 0.14 + localP * 0.86,
                        transform: `translateY(${(1 - localP) * 26}px) scale(${0.94 + localP * 0.06})`,
                      }}
                    >
                      {letter}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Interactive 3D Weight Plate + Editorial Discipline Narrative */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 rounded-2xl bg-[#0A0E0B]/70 border border-[rgba(151,255,181,0.12)] backdrop-blur-xl p-6 sm:p-8">
                <WeightPlate3D THREE={THREE} webglSupported={webglSupported} />
              </div>

              <div className="lg:col-span-6 space-y-6 lg:pl-6">
                <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#39FF88]">
                  <span className="w-6 h-px bg-[#39FF88]" />
                  THE MINDSET
                </div>
                <blockquote className="text-2xl sm:text-3xl md:text-4xl font-syne font-bold leading-snug text-[#F4F7F4]">
                  &ldquo;Some people wait for motivation. Others build discipline.&rdquo;
                </blockquote>
                <p className="text-sm sm:text-base text-[#A2AEA5] leading-relaxed font-light">
                  True strength isn&apos;t loud. It is forged in early mornings, heavy iron, quiet consistency,
                  and the refusal to settle for ordinary limits.
                </p>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[rgba(151,255,181,0.12)]">
                  <div>
                    <p className="text-xl sm:text-2xl font-space font-bold text-[#39FF88]">01</p>
                    <p className="text-[10px] tracking-[0.22em] uppercase text-[#A2AEA5] mt-1">Focus</p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-space font-bold text-[#F4F7F4]">02</p>
                    <p className="text-[10px] tracking-[0.22em] uppercase text-[#A2AEA5] mt-1">Grit</p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-space font-bold text-[#8DC9A5]">03</p>
                    <p className="text-[10px] tracking-[0.22em] uppercase text-[#A2AEA5] mt-1">Resilience</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organic Dark-Emerald Fluid Wave Divider into Chapter Two */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none leading-none">
            <svg viewBox="0 0 1440 110" preserveAspectRatio="none" className="w-full h-16 sm:h-24">
              <path
                d="M0,44 C320,108 620,6 960,64 C1180,102 1340,48 1440,32 L1440,110 L0,110 Z"
                fill="#030504"
              />
              <path
                d="M0,44 C320,108 620,6 960,64 C1180,102 1340,48 1440,32"
                fill="none"
                stroke="#39FF88"
                strokeOpacity="0.28"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* CHAPTER TWO: THE FREEDOM ("BORN TO RIDE.")                           */}
        {/* ==================================================================== */}
        <section
          id="freedom"
          className="relative min-h-screen w-full py-28 sm:py-36 px-5 sm:px-8 lg:px-14 overflow-hidden bg-[#030504]"
        >
          {/* Layer 1: Optional User Motorcycle Video Layer */}
          <CinematicMediaLayer
            src={mediaState.videos.motorcycle.src}
            poster={mediaState.videos.motorcycle.poster}
            mediaType={mediaState.videos.motorcycle.mediaType}
            fallbackVariant="motorcycle"
            overlayOpacity={0.76}
            blurPx={3}
          />

          {/* Layer 2: Interactive 3D Infinite Highway ("THE ROAD") */}
          <div className="absolute inset-0 opacity-90 pointer-events-none">
            <InteractiveRoad3D
              THREE={THREE}
              webglSupported={webglSupported}
              scrollFraction={freedomProgress}
            />
          </div>

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(3,5,4,0.88) 0%, rgba(3,5,4,0.22) 45%, rgba(3,5,4,0.92) 100%)',
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto flex flex-col justify-between min-h-[82vh] gap-12">
            {/* Chapter Heading */}
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-xs tracking-[0.36em] uppercase text-[#39FF88] mb-3">
                CHAPTER 02 · THE FREEDOM
              </p>
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-syne font-extrabold tracking-tight text-[#F4F7F4]">
                BORN TO RIDE.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#A2AEA5] font-light leading-relaxed">
                Some journeys are measured in kilometers. The best ones are measured in memories.
              </p>
            </div>

            {/* Interactive Motorcycle Silhouette (Hover -> Headlight Ignition, Click -> POV Ride Mode) */}
            <InteractiveMotorcycleCard onEnterPOV={() => setPovRideOpen(true)} />

            {/* Chapter Message */}
            <div className="text-center max-w-2xl mx-auto pt-4">
              <p className="text-xl sm:text-2xl md:text-3xl font-syne font-semibold text-[#F4F7F4] leading-snug">
                &ldquo;Not every road needs a destination. Sometimes, the ride is everything.&rdquo;
              </p>
              <p className="mt-3 text-[11px] tracking-[0.3em] uppercase text-[#8DC9A5]/75">
                Scroll to curve the highway · Click the machine for POV mode
              </p>
            </div>
          </div>
        </section>

        {/* POV First-Person Motorcycle Ride Overlay */}
        <FirstPersonRideModal open={povRideOpen} onClose={() => setPovRideOpen(false)} />

        {/* ==================================================================== */}
        {/* CHAPTER THREE: THE ROOTS ("ROOTED IN TRADITION.")                    */}
        {/* ==================================================================== */}
        <section
          id="roots"
          className="relative min-h-screen w-full py-28 sm:py-36 px-5 sm:px-8 lg:px-14 overflow-hidden bg-[#050806]"
        >
          {/* Subtle South Indian Architectural Geometric Background Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(151,255,181,0.5) 1px, transparent 0)',
              backgroundSize: '36px 36px',
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Chapter Heading */}
            <div className="text-center max-w-3xl mx-auto mb-14">
              <p className="text-xs tracking-[0.36em] uppercase text-[#39FF88] mb-3">
                CHAPTER 03 · THE ROOTS
              </p>
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-cinzel font-semibold tracking-wide text-[#F4F7F4]">
                ROOTED IN TRADITION.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#A2AEA5] font-light leading-relaxed">
                Where every street holds a story, and every tradition carries a legacy.
              </p>
            </div>

            {/* Interactive Experience: THE MEMORY WALK */}
            <MemoryWalkExperience heritageMedia={mediaState.videos.heritage} />

            {/* Chapter Message */}
            <div className="mt-14 text-center max-w-2xl mx-auto">
              <div className="w-12 h-px bg-[#39FF88]/50 mx-auto mb-6" />
              <p className="text-xl sm:text-2xl md:text-3xl font-cinzel text-[#F4F7F4] leading-snug">
                &ldquo;No matter how far the journey goes, the roots remain.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SIGNATURE EXPERIENCE: THE CONVERGENCE & BIRTHDAY REVEAL              */}
        {/* ==================================================================== */}
        <ConvergenceBirthdaySection
          THREE={THREE}
          webglSupported={webglSupported}
          mediaState={mediaState}
          onLiquidRipple={triggerLiquidSound}
          onWishSound={triggerWishSound}
        />
      </main>

      {/* ==================================================================== */}
      {/* LUXURY MINIMAL FOOTER + DISCREET PERSONALIZE MEDIA BUTTON            */}
      {/* ==================================================================== */}
      <footer className="relative z-20 bg-[#030504] border-t border-[rgba(151,255,181,0.12)] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-sm font-syne font-bold tracking-[0.2em] uppercase text-[#F4F7F4]">
              GURUNADH <span className="text-[#39FF88]">|</span> BEYOND THE ORDINARY
            </p>
            <p className="text-xs text-[#A2AEA5] mt-1">
              Crafted exclusively for {PERSONAL_MEDIA_CONFIG.honoreeFullName}.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMediaDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A0E0B] border border-[rgba(151,255,181,0.18)] text-[11px] tracking-[0.2em] uppercase text-[#8DC9A5] hover:border-[#39FF88] hover:text-[#39FF88] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF88]"
            >
              <Sliders className="w-3.5 h-3.5" />
              Personalize Media
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('hero')}
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.22em] uppercase text-[#A2AEA5] hover:text-[#F4F7F4] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Back to Top
            </button>
          </div>
        </div>
      </footer>

      {/* Live Personal Media Studio Drawer */}
      <MediaStudioDrawer
        open={mediaDrawerOpen}
        onClose={() => setMediaDrawerOpen(false)}
        mediaState={mediaState}
        setMediaState={setMediaState}
      />
    </div>
  );
}
