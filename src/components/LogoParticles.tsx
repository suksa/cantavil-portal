'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
  intensity?: number;
}

// Hand-traced sample points along the CANTAVIL wordmark + ID badge in logo_white.svg.
// SVG viewBox: 0 0 262.67 50.67. We sample as (x, y, marker) where marker=1 marks the red ID
// block. Single-stroke letters (no extra thickness rows) — keeps the wordmark elegant.
function buildSamplePoints(): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  const push = (x: number, y: number, r = 0) => points.push([x, -y, r]); // flip y for screen

  // === Red ID mark on the left ===
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

  // === CANTAVIL wordmark (single stroke per letter) ===
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

  return points;
}

export default function LogoParticles({ className = '', intensity = 1 }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const samples = buildSamplePoints();
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const [x, y] of samples) {
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const SCALE = 0.048; // smaller scale + farther camera = no clipping

    const N = samples.length;
    const targets = new Float32Array(N * 3);
    const markers = new Float32Array(N);
    const phases = new Float32Array(N);
    const startPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const [x, y, m] = samples[i];
      targets[i * 3 + 0] = (x - cx) * SCALE;
      targets[i * 3 + 1] = (y - cy) * SCALE;
      targets[i * 3 + 2] = 0;
      markers[i] = m;
      phases[i] = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 6 + Math.random() * 4;
      startPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      startPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      startPos[i * 3 + 2] = r * Math.cos(phi);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 12); // farther back so the logo fits on every viewport

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
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorBrand: { value: new THREE.Color('#f12a37') },
      uColorWhite: { value: new THREE.Color('#ffffff') },
    };

    // Dual-pass: a soft outer glow + crisp core. Same geometry rendered twice.
    const makeMat = (sizeMul: number, alphaMul: number, sharpness: number) =>
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
          uniform float uPixelRatio;
          varying float vMarker;
          varying float vAlpha;

          float easeOutExpo(float x) { return x >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x); }

          void main() {
            float t = clamp(uForm, 0.0, 1.0);
            float ease = easeOutExpo(t);
            vec3 pos = mix(aStart, aTarget, ease);

            float idle = clamp((uForm - 1.0) * 0.6, 0.0, 1.0);
            float wob = sin(uTime * 1.2 + aPhase) * 0.08;
            pos.y += wob * idle * uIntensity;
            pos.z += cos(uTime * 0.8 + aPhase * 1.5) * 0.12 * idle * uIntensity;
            pos.x += sin(uTime * 0.6 + aPhase * 0.7) * 0.05 * idle * uIntensity;

            // Gentle Y-only rotation — same feel as the original first cut.
            float ang = sin(uTime * 0.18) * 0.12 * idle;
            float c = cos(ang), s = sin(ang);
            pos = vec3(c*pos.x + s*pos.z, pos.y, -s*pos.x + c*pos.z);

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;

            float size = (mix(2.4, 1.7, t) + (aMarker > 0.5 ? 0.6 : 0.0)) * ${sizeMul.toFixed(3)};
            size *= uPixelRatio;
            gl_PointSize = size * (5.0 / -mv.z);

            vMarker = aMarker;
            vAlpha = mix(0.35, 0.92, ease) * ${alphaMul.toFixed(3)};
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
            vec3 col = mix(uColorWhite, uColorBrand, vMarker);
            gl_FragColor = vec4(col, glow * vAlpha);
          }
        `,
      });

    const glowMat = makeMat(2.2, 0.35, 1.4); // soft halo
    const coreMat = makeMat(1.0, 1.0, 1.8); // crisp center
    const glowPoints = new THREE.Points(geometry, glowMat);
    const corePoints = new THREE.Points(geometry, coreMat);
    scene.add(glowPoints);
    scene.add(corePoints);

    // Subtle backdrop disc
    const haloGeom = new THREE.CircleGeometry(7, 64);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#f12a37') }, uOpacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity;
        void main(){
          float d = length(vUv - 0.5) * 2.0;
          float a = pow(1.0 - clamp(d, 0.0, 1.0), 2.2) * uOpacity * 0.45;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.z = -1.5;
    scene.add(halo);

    // Make the canvas behave like a normal block child of the mount div.
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = () => {
      const r = mount.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      // updateStyle=true so the canvas's CSS width/height also stay synced —
      // without it the DPR-scaled intrinsic size leaks into layout and the
      // canvas renders at 2x the parent box (logo ends up offset & clipped).
      renderer.setSize(w, h, true);
      camera.aspect = w / h;
      camera.fov = w < 480 ? 70 : w < 900 ? 58 : 50;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const elapsed = (now - start) / 1000;
      uniforms.uTime.value = elapsed;

      const form = reduced ? 1.05 : Math.min(elapsed / 1.6, 1.6);
      uniforms.uForm.value = form;

      haloMat.uniforms.uOpacity.value = THREE.MathUtils.clamp((elapsed - 0.6) / 1.2, 0, 1);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
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
  }, [intensity]);

  return <div ref={mountRef} className={className} aria-label="Cantavil 3D logo" role="img" />;
}
