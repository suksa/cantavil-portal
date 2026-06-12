'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
}

// === Cantavil wordmark sample points (mirrors LogoParticles). ===
type LogoPoint = { x: number; y: number; marker: number };

function buildLogoPoints(): LogoPoint[] {
  const out: LogoPoint[] = [];
  const push = (x: number, y: number, m = 0) => out.push({ x, y: -y, marker: m });

  const idLeft = 0.5;
  const idRight = 41;
  const fillRect = (x0: number, x1: number, y0: number, y1: number, density: number, marker: number) => {
    const cols = Math.max(2, Math.round((x1 - x0) * density));
    const rows = Math.max(2, Math.round((y1 - y0) * density));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = x0 + ((i + 0.5) / cols) * (x1 - x0);
        const y = y0 + ((j + 0.5) / rows) * (y1 - y0);
        push(x + (Math.random() - 0.5) * 0.25, y + (Math.random() - 0.5) * 0.25, marker);
      }
    }
  };
  fillRect(idLeft, idRight, 0, 10.13, 1.0, 1);
  fillRect(idLeft, idRight, 20.27, 25.34, 1.0, 1);
  fillRect(idLeft, idRight, 35.47, 50.67, 1.0, 1);

  const traceLine = (x0: number, y0: number, x1: number, y1: number, segs: number) => {
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0);
    }
  };
  const traceArc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, segs: number) => {
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const a = a0 + (a1 - a0) * t;
      push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 0);
    }
  };
  const top = 12.66;
  const bottom = 38;
  const h = bottom - top;
  // C
  traceArc(75, top + h / 2, 9, h / 2, Math.PI * 0.25, Math.PI * 1.75, 36);
  // A
  traceLine(90, bottom, 100, top, 24);
  traceLine(100, top, 110, bottom, 24);
  traceLine(94.5, top + h * 0.65, 105.5, top + h * 0.65, 12);
  // N
  traceLine(120, bottom, 120, top, 26);
  traceLine(120, top, 140, bottom, 30);
  traceLine(140, bottom, 140, top, 26);
  // T
  traceLine(149, top, 170, top, 22);
  traceLine(159.5, top, 159.5, bottom, 26);
  // A
  traceLine(176, bottom, 188, top, 24);
  traceLine(188, top, 200, bottom, 24);
  traceLine(180, top + h * 0.7, 196, top + h * 0.7, 16);
  // V
  traceLine(205, top, 215.5, bottom, 26);
  traceLine(215.5, bottom, 226, top, 26);
  // I
  traceLine(235, top, 235, bottom, 26);
  // L
  traceLine(245, top, 245, bottom, 26);
  traceLine(245, bottom, 262, bottom, 22);

  return out;
}

// === Sample character pixels out of zudy.png. ===
// Skip the top white strip / red dot above the artwork and the teal stage so
// only the lion's silhouette + details end up as targets.
type ImgPoint = { x: number; y: number; r: number; g: number; b: number };

async function samplePixels(src: string, targetW: number): Promise<ImgPoint[]> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();

  const aspect = img.naturalHeight / img.naturalWidth;
  const W = targetW;
  const H = Math.round(W * aspect);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const TOP_SKIP = 0.16; // crop the white/red header band off zudy.png
  const yStart = Math.floor(H * TOP_SKIP);

  const out: ImgPoint[] = [];
  for (let y = yStart; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 32) continue;
      // Teal stage + darker drop-shadow under the lion. Narrow enough on the
      // b<=g side that the bright blue tear streaks (b noticeably > g) survive.
      const isTealHue =
        g > r + 30 &&
        b > r + 30 &&
        b <= g + 18 &&
        Math.abs(g - b) < 35 &&
        r < 115;
      if (isTealHue) continue;

      // The crying face is the whole point of the lion morph, so the tear
      // streaks, mouth, and outlines get both color remapping AND extra
      // weight so they cluster densely enough to actually read.
      const isTear = b > 140 && b > g + 16 && r < 200;
      const isDark = r < 40 && g < 40 && b < 40;
      const isMouthAccent = r > 180 && g < 110 && b < 130;

      let sample: ImgPoint;
      let weight: number;
      if (isTear) {
        // Bright cyan-blue so the tears stand out from the warm body.
        sample = { x, y, r: 90, g: 200, b: 255 };
        weight = 10;
      } else if (isDark) {
        // Black outline → warm amber, glows against the dark page background.
        sample = { x, y, r: 140, g: 86, b: 38 };
        weight = 3;
      } else if (isMouthAccent) {
        sample = { x, y, r, g, b };
        weight = 5;
      } else {
        sample = { x, y, r, g, b };
        weight = 1;
      }

      for (let k = 0; k < weight; k++) out.push(sample);
    }
  }
  return out;
}

export default function MorphingParticles({ className = '' }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      // --- Logo dataset ---
      const logoSamples = buildLogoPoints();
      let xMin = Infinity;
      let xMax = -Infinity;
      let yMin = Infinity;
      let yMax = -Infinity;
      for (const p of logoSamples) {
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
        if (p.y < yMin) yMin = p.y;
        if (p.y > yMax) yMax = p.y;
      }
      const logoCx = (xMin + xMax) / 2;
      const logoCy = (yMin + yMax) / 2;
      const LOGO_SCALE = 0.048;

      // --- Ryan dataset (from /zudy.png) ---
      // High resolution + detail-weighted sampling keeps tear streaks,
      // eyes, and the mouth visible instead of getting averaged away.
      let ryanPixels: ImgPoint[] = [];
      try {
        ryanPixels = await samplePixels('/zudy.png', 460);
      } catch {
        ryanPixels = [];
      }
      if (disposed) return;

      // Fall back to a tiny circle so the morph still has a B-shape even if
      // the image can't be sampled for any reason.
      if (ryanPixels.length < 32) {
        for (let i = 0; i < 800; i++) {
          const a = (i / 800) * Math.PI * 2;
          const rr = 60 + (Math.random() - 0.5) * 6;
          ryanPixels.push({
            x: 100 + Math.cos(a) * rr,
            y: 100 + Math.sin(a) * rr,
            r: 240,
            g: 168,
            b: 64,
          });
        }
      }

      let rxMin = Infinity;
      let rxMax = -Infinity;
      let ryMin = Infinity;
      let ryMax = -Infinity;
      for (const p of ryanPixels) {
        if (p.x < rxMin) rxMin = p.x;
        if (p.x > rxMax) rxMax = p.x;
        if (p.y < ryMin) ryMin = p.y;
        if (p.y > ryMax) ryMax = p.y;
      }
      const ryanCx = (rxMin + rxMax) / 2;
      const ryanCy = (ryMin + ryMax) / 2;
      const ryanSpan = Math.max(rxMax - rxMin, ryMax - ryMin, 1);
      // Wordmark is ~12.6 units wide × 1.8 tall. Make the lion fill more of
      // the frame (~9.4 units tall) so its face details — eyes, mouth, tear
      // streaks — render at a size the eye can actually resolve.
      const RYAN_SCALE = 9.4 / ryanSpan;

      // --- Build paired attribute arrays. ---
      // Cap at 11000 — enough particles for the lion's detail (eyes, mouth,
      // tear streaks) to read distinctly, still safe on integrated GPUs.
      const N = Math.min(11000, Math.max(logoSamples.length, ryanPixels.length));

      // Stratified sampling: shuffle the lion pixels once and walk them
      // round-robin so every pixel gets at least one particle. Random
      // with-replacement leaves the tear streaks and mouth duplicated
      // a few times while the body gets oversampled — and detail drops.
      const ryanShuffled = ryanPixels.slice();
      for (let i = ryanShuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = ryanShuffled[i];
        ryanShuffled[i] = ryanShuffled[j];
        ryanShuffled[j] = tmp;
      }

      const targetA = new Float32Array(N * 3);
      const targetB = new Float32Array(N * 3);
      const colorA = new Float32Array(N * 3);
      const colorB = new Float32Array(N * 3);
      const startPos = new Float32Array(N * 3);
      const phases = new Float32Array(N);

      const cWhite = new THREE.Color('#ffffff');
      const cBrand = new THREE.Color('#f12a37');

      for (let i = 0; i < N; i++) {
        const lp = logoSamples[i % logoSamples.length];
        const rp = ryanShuffled[i % ryanShuffled.length];

        targetA[i * 3 + 0] = (lp.x - logoCx) * LOGO_SCALE;
        targetA[i * 3 + 1] = (lp.y - logoCy) * LOGO_SCALE;
        targetA[i * 3 + 2] = 0;

        // Image y is downward in pixel space — flip it for screen coords.
        targetB[i * 3 + 0] = (rp.x - ryanCx) * RYAN_SCALE;
        targetB[i * 3 + 1] = -(rp.y - ryanCy) * RYAN_SCALE;
        targetB[i * 3 + 2] = 0;

        const lc = lp.marker > 0.5 ? cBrand : cWhite;
        colorA[i * 3 + 0] = lc.r;
        colorA[i * 3 + 1] = lc.g;
        colorA[i * 3 + 2] = lc.b;

        colorB[i * 3 + 0] = rp.r / 255;
        colorB[i * 3 + 1] = rp.g / 255;
        colorB[i * 3 + 2] = rp.b / 255;

        phases[i] = Math.random() * Math.PI * 2;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 6 + Math.random() * 4;
        startPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        startPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        startPos[i * 3 + 2] = r * Math.cos(phi);
      }

      // --- Three.js plumbing. ---
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.set(0, 0, 12);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(startPos.slice(), 3));
      geometry.setAttribute('aStart', new THREE.BufferAttribute(startPos, 3));
      geometry.setAttribute('aTargetA', new THREE.BufferAttribute(targetA, 3));
      geometry.setAttribute('aTargetB', new THREE.BufferAttribute(targetB, 3));
      geometry.setAttribute('aColorA', new THREE.BufferAttribute(colorA, 3));
      geometry.setAttribute('aColorB', new THREE.BufferAttribute(colorB, 3));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

      const uniforms = {
        uTime: { value: 0 },
        uForm: { value: 0 },
        uMorph: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      };

      const makeMat = (sizeMul: number, alphaMul: number, sharpness: number) =>
        new THREE.ShaderMaterial({
          uniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader: /* glsl */ `
            attribute vec3 aStart;
            attribute vec3 aTargetA;
            attribute vec3 aTargetB;
            attribute vec3 aColorA;
            attribute vec3 aColorB;
            attribute float aPhase;
            uniform float uTime;
            uniform float uForm;
            uniform float uMorph;
            uniform float uPixelRatio;
            varying vec3 vColor;
            varying float vAlpha;

            float easeOutExpo(float x) { return x >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x); }
            float easeInOut(float x) { return x < 0.5 ? 2.0*x*x : 1.0 - pow(-2.0*x + 2.0, 2.0) / 2.0; }

            void main() {
              float t = clamp(uForm, 0.0, 1.0);
              float ease = easeOutExpo(t);

              // Per-particle stagger keeps the morph from snapping all at once.
              float m = clamp(uMorph, 0.0, 1.0);
              float jitter = (sin(aPhase) * 0.5 + 0.5) * 0.18;
              float mLocal = clamp((m - jitter) / max(1.0 - jitter, 0.01), 0.0, 1.0);
              float mE = easeInOut(mLocal);

              vec3 target = mix(aTargetA, aTargetB, mE);
              vec3 pos = mix(aStart, target, ease);

              float idle = clamp((uForm - 1.0) * 0.6, 0.0, 1.0);
              float wob = sin(uTime * 1.2 + aPhase) * 0.06;
              pos.y += wob * idle;
              pos.z += cos(uTime * 0.8 + aPhase * 1.5) * 0.10 * idle;
              pos.x += sin(uTime * 0.6 + aPhase * 0.7) * 0.04 * idle;

              float ang = sin(uTime * 0.18) * 0.10 * idle;
              float c = cos(ang), s = sin(ang);
              pos = vec3(c*pos.x + s*pos.z, pos.y, -s*pos.x + c*pos.z);

              vec4 mv = modelViewMatrix * vec4(pos, 1.0);
              gl_Position = projectionMatrix * mv;

              // Shrink particles toward the lion shape just enough that the
              // small details (eyes, mouth, tear streaks) read as separate
              // points instead of bleeding into a warm blob.
              float morphSize = mix(1.0, 0.78, mE);
              float size = mix(2.4, 1.7, t) * morphSize * ${sizeMul.toFixed(3)};
              size *= uPixelRatio;
              gl_PointSize = size * (5.0 / -mv.z);

              // Lift the lion palette so warm midtones pop on additive blending.
              vec3 colB = aColorB + vec3(0.20);
              vColor = mix(aColorA, colB, mE);
              // Boost the lion alpha a touch to compensate for the smaller dots.
              float morphAlpha = mix(1.0, 1.18, mE);
              vAlpha = mix(0.35, 0.92, ease) * ${alphaMul.toFixed(3)} * morphAlpha;
            }
          `,
          fragmentShader: /* glsl */ `
            precision highp float;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
              vec2 uv = gl_PointCoord - vec2(0.5);
              float d = length(uv);
              if (d > 0.5) discard;
              float core = smoothstep(0.5, 0.0, d);
              float glow = pow(core, ${sharpness.toFixed(2)});
              gl_FragColor = vec4(vColor, glow * vAlpha);
            }
          `,
        });

      const glowMat = makeMat(2.2, 0.35, 1.4);
      const coreMat = makeMat(1.0, 1.0, 1.8);
      scene.add(new THREE.Points(geometry, glowMat));
      scene.add(new THREE.Points(geometry, coreMat));

      // Subtle backdrop disc, same idea as LogoParticles but a touch dimmer.
      const haloGeom = new THREE.CircleGeometry(7, 64);
      const haloMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color('#f12a37') },
          uOpacity: { value: 0 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity;
          void main(){
            float d = length(vUv - 0.5) * 2.0;
            float a = pow(1.0 - clamp(d, 0.0, 1.0), 2.2) * uOpacity * 0.30;
            gl_FragColor = vec4(uColor, a);
          }`,
      });
      const halo = new THREE.Mesh(haloGeom, haloMat);
      halo.position.z = -1.5;
      scene.add(halo);

      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      const resize = () => {
        const r = mount.getBoundingClientRect();
        const w = Math.max(1, r.width);
        const h = Math.max(1, r.height);
        renderer.setSize(w, h, true);
        camera.aspect = w / h;
        camera.fov = w < 480 ? 70 : w < 900 ? 58 : 50;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      resize();

      const start = performance.now();
      // Each shape holds for HOLD seconds, with a FADE cross-fade in between.
      // HOLD + FADE = 3 means one shape change every 3 seconds.
      const HOLD = 2.3;
      const FADE = 0.7;
      const PERIOD = (HOLD + FADE) * 2;

      const tick = () => {
        if (disposed) return;
        const now = performance.now();
        const elapsed = (now - start) / 1000;
        uniforms.uTime.value = elapsed;
        const form = reduced ? 1.05 : Math.min(elapsed / 1.6, 1.6);
        uniforms.uForm.value = form;

        if (!reduced) {
          const cyc = elapsed % PERIOD;
          let m: number;
          if (cyc < HOLD) m = 0;
          else if (cyc < HOLD + FADE) m = (cyc - HOLD) / FADE;
          else if (cyc < HOLD + FADE + HOLD) m = 1;
          else m = 1 - (cyc - (HOLD + FADE + HOLD)) / FADE;
          uniforms.uMorph.value = m;
        }

        haloMat.uniforms.uOpacity.value = THREE.MathUtils.clamp((elapsed - 0.6) / 1.2, 0, 1);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        geometry.dispose();
        glowMat.dispose();
        coreMat.dispose();
        haloGeom.dispose();
        haloMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={mountRef} className={className} aria-label="Cantavil farewell particles" role="img" />;
}
