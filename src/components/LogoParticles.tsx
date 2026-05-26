'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
  intensity?: number;
}

// Hand-traced sample points along the CANTAVIL wordmark + ID badge in logo_white.svg.
// SVG viewBox: 0 0 262.67 50.67. We sample as (x, y, marker) where marker=1 marks the red ID
// block (so its particles are tinted red and slightly larger). Each strand of points is also
// given a layer index so they form into distinct z-planes for a real 3D look.
function buildSamplePoints(): Array<{ x: number; y: number; m: number; layer: number }> {
  const pts: Array<{ x: number; y: number; m: number; layer: number }> = [];
  const push = (x: number, y: number, m = 0, layer = 0) => pts.push({ x, y, m, layer });

  // === Red ID mark (left block) ===
  const idLeft = 0.5;
  const idRight = 41;

  const fillRect = (x0: number, x1: number, y0: number, y1: number, density: number, layer = 0) => {
    const cols = Math.max(2, Math.round((x1 - x0) * density));
    const rows = Math.max(2, Math.round((y1 - y0) * density));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = x0 + ((i + 0.5) / cols) * (x1 - x0);
        const y = y0 + ((j + 0.5) / rows) * (y1 - y0);
        push(x + (Math.random() - 0.5) * 0.18, y + (Math.random() - 0.5) * 0.18, 1, layer);
      }
    }
  };

  // higher density (was 1.0 → 1.7) so the bars feel solid
  fillRect(idLeft, idRight, 0, 10.13, 1.7, 0); // top bar
  fillRect(idLeft, idRight, 20.27, 25.34, 1.7, 0); // middle (thin) bar
  fillRect(idLeft, idRight, 35.47, 50.67, 1.7, 0); // bottom bar

  // === CANTAVIL wordmark — every letter is a thicker stroke than before ===
  const traceLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    segs: number,
    layer = 0,
    thickness = 0.55,
  ) => {
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      // 3 parallel rows per stroke so each glyph has weight
      for (let k = -1; k <= 1; k++) {
        push(x + nx * thickness * k, y + ny * thickness * k, 0, layer);
      }
    }
  };

  const traceArc = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    a0: number,
    a1: number,
    segs: number,
    layer = 0,
    thickness = 0.55,
  ) => {
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const a = a0 + (a1 - a0) * t;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      for (let k = -1; k <= 1; k++) {
        push(cx + cos * (rx + thickness * k), cy + sin * (ry + thickness * k), 0, layer);
      }
    }
  };

  const top = 12.66;
  const bottom = 38;
  const h = bottom - top;
  const segs = 36; // denser than before (was 24..30)

  // Letters live on alternating z-layers so they stack into 3D space
  // C
  traceArc(75, top + h / 2, 9, h / 2, Math.PI * 0.27, Math.PI * 1.73, 48, 0);
  // A
  traceLine(90, bottom, 100, top, segs, 1);
  traceLine(100, top, 110, bottom, segs, 1);
  traceLine(94.5, top + h * 0.65, 105.5, top + h * 0.65, 16, 1);
  // N
  traceLine(120, bottom, 120, top, segs, 2);
  traceLine(120, top, 140, bottom, segs + 4, 2);
  traceLine(140, bottom, 140, top, segs, 2);
  // T
  traceLine(149, top, 170, top, 28, 3);
  traceLine(159.5, top, 159.5, bottom, segs, 3);
  // A
  traceLine(176, bottom, 188, top, segs, 4);
  traceLine(188, top, 200, bottom, segs, 4);
  traceLine(180, top + h * 0.7, 196, top + h * 0.7, 20, 4);
  // V
  traceLine(205, top, 215.5, bottom, segs, 5);
  traceLine(215.5, bottom, 226, top, segs, 5);
  // I
  traceLine(235, top, 235, bottom, segs, 6);
  // L
  traceLine(245, top, 245, bottom, segs, 7);
  traceLine(245, bottom, 262, bottom, 28, 7);

  return pts;
}

export default function LogoParticles({ className = '', intensity = 1 }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const samples = buildSamplePoints();
    // Re-center
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const s of samples) {
      if (s.x < xMin) xMin = s.x;
      if (s.x > xMax) xMax = s.x;
      if (s.y < yMin) yMin = s.y;
      if (s.y > yMax) yMax = s.y;
    }
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const SCALE = 0.062;
    const Z_LAYER_GAP = 0.085; // a small per-letter z-offset = depth

    const N = samples.length;
    const targets = new Float32Array(N * 3);
    const markers = new Float32Array(N);
    const phases = new Float32Array(N);
    const startPos = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {
      const s = samples[i];
      const x = (s.x - cx) * SCALE;
      const y = -(s.y - cy) * SCALE; // flip y for screen
      // alternating z layers (negative + positive) so letters stack front-to-back
      const z = (s.layer % 2 === 0 ? 1 : -1) * (s.layer * 0.5) * Z_LAYER_GAP + (Math.random() - 0.5) * 0.03;
      targets[i * 3 + 0] = x;
      targets[i * 3 + 1] = y;
      targets[i * 3 + 2] = z;
      markers[i] = s.m;
      phases[i] = Math.random() * Math.PI * 2;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 7 + Math.random() * 6;
      startPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      startPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      startPos[i * 3 + 2] = r * Math.cos(phi);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9); // a touch closer (was 10)

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(startPos.slice(), 3));
    geometry.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geometry.setAttribute('aStart', new THREE.BufferAttribute(startPos, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aMarker', new THREE.BufferAttribute(markers, 1));

    const uniforms = {
      uTime: { value: 0 },
      uForm: { value: 0 },
      uIntensity: { value: intensity },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorBrand: { value: new THREE.Color('#ff3a48') },
      uColorWhite: { value: new THREE.Color('#ffffff') },
    };

    // Two-pass render via points: a soft glow pass + a crisper core pass
    const makeMat = (sizeMul: number, intensityMul: number, sharpness: number) =>
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute vec3 aTarget;
          attribute vec3 aStart;
          attribute float aPhase;
          attribute float aMarker;
          uniform float uTime;
          uniform float uForm;
          uniform float uIntensity;
          uniform vec2 uMouse;
          uniform float uPixelRatio;
          varying float vMarker;
          varying float vAlpha;
          varying float vDepth;

          float easeOutExpo(float x) { return x >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x); }

          void main() {
            float t = clamp(uForm, 0.0, 1.0);
            float ease = easeOutExpo(t);
            vec3 pos = mix(aStart, aTarget, ease);

            // Idle: each particle bobs around its target. After the snap we keep some life.
            float idle = clamp((uForm - 1.0) * 0.5, 0.0, 1.2);
            float wob = sin(uTime * 1.4 + aPhase) * 0.10;
            pos.y += wob * idle * uIntensity;
            pos.z += cos(uTime * 0.9 + aPhase * 1.5) * 0.18 * idle * uIntensity;
            pos.x += sin(uTime * 0.7 + aPhase * 0.7) * 0.07 * idle * uIntensity;

            // Mouse parallax
            pos.xy += uMouse * 0.9 * idle;

            // Continuous 3D rotation — bigger amplitude than before for clear 3D feel
            float angY = sin(uTime * 0.32) * 0.42 + uMouse.x * 0.35;
            float angX = sin(uTime * 0.22) * 0.18 + uMouse.y * 0.18;
            // rotate around Y
            float cy = cos(angY), sy = sin(angY);
            pos = vec3(cy * pos.x + sy * pos.z, pos.y, -sy * pos.x + cy * pos.z);
            // rotate around X
            float cx = cos(angX), sx = sin(angX);
            pos = vec3(pos.x, cx * pos.y - sx * pos.z, sx * pos.y + cx * pos.z);

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;

            // BIG size — was 2.4 base, now 5.5 base. ID mark is even chunkier.
            float baseSize = mix(3.0, 5.5, t) + (aMarker > 0.5 ? 1.6 : 0.0);
            baseSize *= ${sizeMul.toFixed(3)};
            baseSize *= uPixelRatio;
            gl_PointSize = baseSize * (6.5 / -mv.z);

            vMarker = aMarker;
            vAlpha = mix(0.35, 1.0, ease) * ${intensityMul.toFixed(3)};
            vDepth = -mv.z; // for fog-like falloff if we want
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          uniform vec3 uColorBrand;
          uniform vec3 uColorWhite;
          varying float vMarker;
          varying float vAlpha;
          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float d = length(uv);
            if (d > 0.5) discard;
            float core = smoothstep(0.5, 0.0, d);
            float glow = pow(core, ${sharpness.toFixed(2)});
            vec3 col = mix(uColorWhite, uColorBrand, vMarker * 0.85);
            gl_FragColor = vec4(col, glow * vAlpha);
          }
        `,
      });

    // Glow pass (big, soft, low alpha) — gives the 3D halo
    const glowMat = makeMat(2.6, 0.45, 1.4);
    // Core pass (smaller, sharper, brighter) — gives crispness
    const coreMat = makeMat(1.0, 0.95, 2.2);

    const glowPoints = new THREE.Points(geometry, glowMat);
    const corePoints = new THREE.Points(geometry, coreMat);
    scene.add(glowPoints);
    scene.add(corePoints);

    // Backdrop halo disc
    const haloGeom = new THREE.CircleGeometry(8, 64);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#ff3a48') }, uOpacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity;
        void main(){
          float d = length(vUv - 0.5) * 2.0;
          float a = pow(1.0 - clamp(d, 0.0, 1.0), 2.5) * uOpacity * 0.55;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.z = -2.2;
    scene.add(halo);

    // Resize
    const resize = () => {
      const r = mount.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Wider FoV on mobile so the logo still fills the frame
      camera.fov = w < 480 ? 62 : w < 1024 ? 50 : 45;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Mouse
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = -((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove);

    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const elapsed = (now - start) / 1000;
      uniforms.uTime.value = elapsed;

      const form = reduced ? 1.4 : Math.min(elapsed / 1.7, 2.0);
      uniforms.uForm.value = form;

      haloMat.uniforms.uOpacity.value = THREE.MathUtils.clamp((elapsed - 0.5) / 1.3, 0, 1);

      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      (uniforms.uMouse.value as THREE.Vector2).set(mouse.x, mouse.y);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      geometry.dispose();
      glowMat.dispose();
      coreMat.dispose();
      haloGeom.dispose();
      haloMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [intensity]);

  return <div ref={mountRef} className={className} aria-label="Cantavil 3D logo" role="img" />;
}
