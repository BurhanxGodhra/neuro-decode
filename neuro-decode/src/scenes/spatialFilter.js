import * as THREE from 'three';
import { renderer, camera, createComposer } from '../core/renderer.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

let scene, composer, animId, lines, labelRenderer;
const clock = new THREE.Clock();

const INPUT_NAMES = ['Fz', 'Cz', 'Pz', 'C3', 'C4', 'O1', 'O2'];
const OUTPUT_NAMES = ['CSP1', 'CSP2', 'CSP3', 'CSP4', 'CSP5', 'CSP6'];
const LEFT_X = -1.9;
const RIGHT_X = 1.9;

function nodePositions(count, x) {
  const spacing = 0.5;
  const totalHeight = (count - 1) * spacing;
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(new THREE.Vector3(x, totalHeight / 2 - i * spacing, 0));
  }
  return positions;
}

function warmColor(v) {
  const stops = [
    { t: 0.0, c: [8, 5, 4] },
    { t: 0.35, c: [160, 60, 8] },
    { t: 0.7, c: [255, 150, 30] },
    { t: 1.0, c: [255, 235, 190] },
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i].t && v <= stops[i + 1].t) {
      const lt = (v - stops[i].t) / (stops[i + 1].t - stops[i].t);
      const a = stops[i].c, b = stops[i + 1].c;
      return [
        (a[0] + (b[0] - a[0]) * lt) / 255,
        (a[1] + (b[1] - a[1]) * lt) / 255,
        (a[2] + (b[2] - a[2]) * lt) / 255,
      ];
    }
  }
  return [1, 1, 1];
}

function buildConnections(leftPos, rightPos) {
  const pairs = [];
  leftPos.forEach((lp, li) => rightPos.forEach((rp, ri) => pairs.push({ lp, rp, li, ri })));

  const positions = new Float32Array(pairs.length * 2 * 3);
  const colors = new Float32Array(pairs.length * 2 * 3);
  const phases = new Float32Array(pairs.length);

  pairs.forEach((p, i) => {
    positions.set([p.lp.x, p.lp.y, p.lp.z, p.rp.x, p.rp.y, p.rp.z], i * 6);
    phases[i] = Math.random() * Math.PI * 2;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.85,
  });

  const seg = new THREE.LineSegments(geo, mat);
  seg.userData.pairs = pairs;
  seg.userData.phases = phases;
  return seg;
}

function buildNodes(positions, names) {
  const group = new THREE.Group();
  positions.forEach((pos, i) => {
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 20),
      new THREE.MeshBasicMaterial({ color: 0xffcf8a })
    );
    glow.position.copy(pos);
    group.add(glow);

    const label = document.createElement('div');
    label.textContent = names[i];
    label.style.cssText = 'color:#9a8a7a;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:1px;pointer-events:none;';
    const labelObj = new CSS2DObject(label);
    const offset = pos.x < 0 ? -0.22 : 0.22;
    labelObj.position.set(pos.x + offset, pos.y, pos.z);
    group.add(labelObj);
  });
  return group;
}

function addLighting() {
  scene.add(new THREE.AmbientLight(0x2a2018, 2.0));
}

export const spatialFilterScene = {
  async init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.02);
    addLighting();

    const leftPos = nodePositions(INPUT_NAMES.length, LEFT_X);
    const rightPos = nodePositions(OUTPUT_NAMES.length, RIGHT_X);

    lines = buildConnections(leftPos, rightPos);
    scene.add(lines);

    scene.add(buildNodes(leftPos, INPUT_NAMES));
    scene.add(buildNodes(rightPos, OUTPUT_NAMES));

    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    composer = createComposer(scene, { strength: 0.9, radius: 0.55, threshold: 0.15 });

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById('app').appendChild(labelRenderer.domElement);

    const hud = document.getElementById('hud-root');
    hud.innerHTML = `
      <div class="hud" style="top:24px;right:24px;width:240px;">
        <div class="hud-label">Spatial Filter</div>
        <div class="hud-value">CSP · Weighted Projection</div>
      </div>
    `;
  },

  animate() {
    const loop = () => {
      animId = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();

      const colorAttr = lines.geometry.attributes.color;
      const pairs = lines.userData.pairs;
      const phases = lines.userData.phases;

      for (let i = 0; i < pairs.length; i++) {
        const w = Math.sin(t * 1.4 + phases[i]) * 0.5 + 0.5;
        const v = Math.pow(w, 2.2); // bias toward darker, occasional bright flares
        const [r, g, b] = warmColor(v);
        colorAttr.setXYZ(i * 2, r, g, b);
        colorAttr.setXYZ(i * 2 + 1, r, g, b);
      }
      colorAttr.needsUpdate = true;

      composer.render();
      labelRenderer.render(scene, camera);
    };
    loop();
  },

  dispose() {
    cancelAnimationFrame(animId);
    labelRenderer?.domElement.remove();
    document.getElementById('hud-root').innerHTML = '';
    scene?.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  },
};