import * as THREE from 'three';

export function createScalpGridMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x3ddbd9) },
      uLineWidth: { value: 0.025 },
      uDensity: { value: 12.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uLineWidth;
      uniform float uDensity;
      varying vec2 vUv;

      float gridLine(float coord) {
        float g = abs(fract(coord * uDensity) - 0.5);
        return smoothstep(0.0, uLineWidth, g);
      }

      void main() {
        float lat = 1.0 - gridLine(vUv.y);
        float lon = 1.0 - gridLine(vUv.x);
        float line = max(lat, lon);
        if (line < 0.05) discard;
        gl_FragColor = vec4(uColor, line * 0.11);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}