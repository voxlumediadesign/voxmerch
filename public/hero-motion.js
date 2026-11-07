import {
  Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer,
} from './three.module.min.js';

export function mountHeroMotion(stage) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.domElement.className = 'hero-motion';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.prepend(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(43, 1, 0.1, 80);
  camera.position.set(0, 6.5, 10);
  camera.lookAt(0, 0, -1.5);
  const geometry = new PlaneGeometry(42, 38, 80, 72);
  geometry.rotateX(-Math.PI / 2);
  const pointer = new Vector2();
  const uniforms = { time: { value: 0 }, pointer: { value: new Vector2() } };
  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: `
      uniform float time;
      uniform vec2 pointer;
      varying vec2 gridPosition;
      void main() {
        vec3 p = position;
        gridPosition = p.xz;
        float distanceFromPointer = length(p.xz - pointer * vec2(8.0, 4.0));
        p.y += sin(p.x * 0.41 + p.z * 0.24 + time) * 0.52;
        p.y += cos(p.z * 0.48 - time * 0.7) * 0.28;
        p.y += 0.6 * exp(-0.09 * distanceFromPointer * distanceFromPointer);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float time;
      varying vec2 gridPosition;
      void main() {
        vec2 coordinate = gridPosition * 0.8;
        vec2 edge = abs(fract(coordinate - 0.5) - 0.5) / max(fwidth(coordinate), 0.001);
        float line = 1.0 - min(min(edge.x, edge.y), 1.0);
        float fade = 1.0 - smoothstep(4.0, 17.0, length(gridPosition));
        float scan = pow(0.5 + 0.5 * sin(gridPosition.x * 0.25 - gridPosition.y * 0.5 + time), 18.0);
        vec3 color = mix(vec3(0.37, 0.65, 1.0), vec3(0.88, 0.62, 0.19), scan * 0.7);
        gl_FragColor = vec4(color, line * fade * (0.29 + scan * 0.33));
      }`,
  });
  scene.add(new Mesh(geometry, material));

  const resize = new ResizeObserver(() => {
    const { clientWidth, clientHeight } = stage;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  });
  resize.observe(stage);

  let last = 0;
  function draw(now) {
    if (last) uniforms.time.value += Math.min((now - last) / 1000, 0.05) * 0.65;
    last = now;
    uniforms.pointer.value.lerp(pointer, 0.055);
    renderer.render(scene, camera);
  }
  const visibility = new IntersectionObserver(([entry]) => {
    last = 0;
    renderer.setAnimationLoop(entry.isIntersecting ? draw : null);
  });
  visibility.observe(stage);
  function move(event) {
    const rect = stage.getBoundingClientRect();
    pointer.set(2 * (event.clientX - rect.left) / rect.width - 1, 2 * (event.clientY - rect.top) / rect.height - 1);
  }
  function reset() { pointer.set(0, 0); }
  stage.addEventListener('pointermove', move, { passive: true });
  stage.addEventListener('pointerleave', reset);

  return () => {
    visibility.disconnect();
    resize.disconnect();
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerleave', reset);
    renderer.setAnimationLoop(null);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
