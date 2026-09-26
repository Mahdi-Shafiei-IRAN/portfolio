/* Drifting starfield behind the inner resume pages — vanilla port of
 * ThreeStarfield.jsx from DineshS36/portfolio (Apache-2.0, commit 35c3989). */
import * as THREE from 'three';

const STAR_VERT = `
  uniform float uTime;
  uniform float uSpeed;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
      vColor = aColor;
      float z = position.z + uTime * uSpeed;
      z = mod(z + 1000.0, 2000.0) - 1000.0;
      vec3 newPos = vec3(position.x, position.y, z);
      vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
      gl_PointSize = aSize * (800.0 / -mvPosition.z);
      vAlpha = 0.3 + 0.7 * sin(uTime * 1.5 + position.x * 100.0 + position.y * 50.0);
      gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAG = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = (0.5 - dist) * 2.0 * vAlpha;
      gl_FragColor = vec4(vColor, alpha);
  }
`;

const canvas = document.getElementById('three-starfield-canvas');

function start() {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (e) {
        console.warn('WebGL unavailable — starfield disabled.', e);
        return;
    }
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.0005);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 1000;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const starCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const palette = [
        new THREE.Color(0xffffff), new THREE.Color(0xccccff),
        new THREE.Color(0xeebbff), new THREE.Color(0xffffff),
    ];
    for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 4000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
        const color = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        sizes[i] = Math.random() * 2.5 + 0.5;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const uniforms = { uTime: { value: 0 }, uSpeed: { value: 100.0 } };
    const material = new THREE.ShaderMaterial({
        uniforms, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(geometry, material));

    const initTime = performance.now();
    let frameId;
    const tick = () => {
        frameId = requestAnimationFrame(tick);
        if (document.hidden) return;
        const t = (performance.now() - initTime) * 0.001;
        uniforms.uTime.value = t;
        camera.position.x = Math.sin(t * 0.2) * 50;
        camera.position.y = Math.cos(t * 0.15) * 30;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
    };
    tick();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(frameId); }, false);
    canvas.addEventListener('webglcontextrestored', () => { handleResize(); tick(); }, false);
}

if (canvas) start();
