import * as THREE from 'three';
import { renderer, camera, createComposer } from '../core/renderer.js';
import { createFresnelMaterial } from '../shaders/fresnel.js';
import { createScalpGridMaterial } from '../shaders/scalpGrid.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

let scene, composer, head, electrodeGroup, animId;
let labelRenderer;
const clock = new THREE.Clock();

function buildHead() {
  const geo = new THREE.SphereGeometry(1.05, 64, 64);
  geo.scale(0.82, 1.0, 0.92); // cranial proportions — wider than deep, slightly tall

  const solid = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x1c2733,
      roughness: 0.85,
      metalness: 0.05,
    })
  );

  const rim = new THREE.Mesh(geo.clone(), createFresnelMaterial(0x3ddbd9, 0.9));
  rim.scale.setScalar(1.015);

  const grid = new THREE.Mesh(geo.clone(), createScalpGridMaterial());
  grid.scale.setScalar(1.002);

  const group = new THREE.Group();
  group.add(solid, rim, grid);
  return group;
}

function buildElectrodes() {
  // approximate 10-20 layout, angles in radians: (azimuth around Y, elevation from equator)
  const positions = [
    { name: 'Fz', az: 0, el: 0.55 },
    { name: 'Cz', az: 0, el: 1.35 },
    { name: 'Pz', az: Math.PI, el: 0.55 },
    { name: 'C3', az: -Math.PI / 2, el: 0.85 },
    { name: 'C4', az: Math.PI / 2, el: 0.85 },
    { name: 'O1', az: Math.PI + 0.3, el: 0.15 },
    { name: 'O2', az: Math.PI - 0.3, el: 0.15 },
  ];

  const group = new THREE.Group();
  const radius = 1.06;

  positions.forEach((p) => {
    const phi = Math.PI / 2 - p.el; // polar angle from top
    const pos = new THREE.Vector3().setFromSphericalCoords(radius, phi, p.az);
    pos.multiply(new THREE.Vector3(0.82, 1.0, 0.92)); // match head scale

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 24),
      new THREE.MeshBasicMaterial({ color: 0x3ddbd9 }) // same as accent, not near-white
    );
    disc.position.copy(pos);
    disc.lookAt(pos.clone().multiplyScalar(2));
    disc.userData.name = p.name;
    group.add(disc);
    const label = document.createElement('div');
    label.textContent = p.name;
    label.style.cssText = 'color:#7d8590;font-family:JetBrains Mono,monospace;font-size:9px;letter-spacing:1px;pointer-events:none;';
    const labelObj = new CSS2DObject(label);
    labelObj.position.copy(pos).multiplyScalar(1.08);
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(0.065, 24),
      new THREE.MeshBasicMaterial({ color: 0x3ddbd9, transparent: true, opacity: 0.12 })
    );
    halo.position.copy(pos).multiplyScalar(0.998);
    halo.lookAt(pos.clone().multiplyScalar(2));
    group.add(halo);
    labelObj.userData.facingDir = pos.clone().normalize();
    group.add(labelObj);
    disc.userData.facingDir = pos.clone().normalize();
  });
  return group;
}

function addLighting() {
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 5);
  const fill = new THREE.DirectionalLight(0x4a5568, 1.2);
  fill.position.set(-3, 1, 2);
  const ambient = new THREE.AmbientLight(0x2a3340, 1.8);
  scene.add(key, fill, ambient);
}

export const acquisitionScene = {
  async init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.04);

    addLighting();
    head = buildHead();
    scene.add(head);

    electrodeGroup = buildElectrodes();
    scene.add(electrodeGroup);

    camera.position.set(0, 0.25, 5.8);
    camera.lookAt(0, 0.1, 0);

    composer = createComposer(scene);
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById('app').appendChild(labelRenderer.domElement);
  },

  animate() {
    const loop = () => {
      animId = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      head.rotation.y = Math.sin(t * 0.15) * 0.25 + t * 0.05;
      electrodeGroup.rotation.y = head.rotation.y;
      composer.render();
      labelRenderer.render(scene, camera);
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      electrodeGroup.children.forEach((child) => {
        if (!child.userData.facingDir) return;
        const worldDir = child.userData.facingDir.clone().applyQuaternion(head.quaternion);
        const facing = worldDir.dot(camDir.clone().negate());
        const visible = facing > 0.15;
        child.visible = visible;
        if (child.isCSS2DObject) child.element.style.opacity = visible ? '1' : '0';
      });
    };
    loop();
  },

  dispose() {
    labelRenderer?.domElement.remove();
    cancelAnimationFrame(animId);
    scene?.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  },
};
