import * as THREE from "three";
import { pointer, run } from "./stage";

const auroraGlsl = /* glsl */ `
  vec3 aurora(float t) {
    vec3 g = vec3(0.204, 0.827, 0.600);
    vec3 c = vec3(0.133, 0.827, 0.933);
    vec3 b = vec3(0.231, 0.510, 0.965);
    return t < 0.5 ? mix(g, c, t * 2.0) : mix(c, b, t * 2.0 - 1.0);
  }`;

/** Unit vectors spread evenly over a sphere. */
function fibonacci(count: number) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const t = i * Math.PI * (3 - Math.sqrt(5));
    out.set([Math.cos(t) * r, y, Math.sin(t) * r], i * 3);
  }
  return out;
}

/**
 * Dotted globe rising behind the hero: aurora-tinted points (brighter on the
 * near side), an atmosphere rim, pulsing tool nodes and arcs that draw
 * themselves between nodes. Tilts slightly toward the pointer.
 */
export function globeScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  // Depth range covers the sphere once it is scaled to pixels.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
  const globe = new THREE.Group();
  scene.add(globe);
  const time = { value: 0 };
  const dpr = Math.min(devicePixelRatio || 1, 1.75);

  // Dots.
  const dots = new THREE.BufferGeometry();
  dots.setAttribute("position", new THREE.BufferAttribute(fibonacci(4200), 3));
  globe.add(
    new THREE.Points(
      dots,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { size: { value: 3.4 * dpr } },
        vertexShader: /* glsl */ `
          uniform float size;
          varying float facing;
          varying float sx;
          void main() {
            facing = normalize(normalMatrix * position).z;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            sx = gl_Position.x / gl_Position.w;
            gl_PointSize = size * (0.55 + 0.6 * max(facing, 0.0));
          }`,
        fragmentShader: /* glsl */ `
          ${auroraGlsl}
          varying float facing;
          varying float sx;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.05, d) * (0.08 + 1.0 * smoothstep(-0.2, 0.9, facing));
            gl_FragColor = vec4(aurora(clamp(sx * 0.5 + 0.5, 0.0, 1.0)), a);
          }`,
      }),
    ),
  );

  // Atmosphere: a back-facing shell lit at the silhouette.
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.16, 96, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {},
        vertexShader: /* glsl */ `
          varying vec3 n;
          varying float sx;
          void main() {
            n = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            sx = gl_Position.x / gl_Position.w;
          }`,
        fragmentShader: /* glsl */ `
          ${auroraGlsl}
          varying vec3 n;
          varying float sx;
          void main() {
            float rim = pow(max(0.0, 1.0 + n.z), 3.0);
            gl_FragColor = vec4(aurora(clamp(sx * 0.5 + 0.5, 0.0, 1.0)), rim * 0.75);
          }`,
      }),
    ),
  );
  const shell = scene.children.at(-1) as THREE.Mesh;

  // Tool nodes that pulse.
  const all = fibonacci(4200);
  const nodePositions: THREE.Vector3[] = [];
  for (let i = 0; i < 4200; i += 61)
    nodePositions.push(new THREE.Vector3(all[i * 3], all[i * 3 + 1], all[i * 3 + 2]).multiplyScalar(1.005));
  const nodes = new THREE.BufferGeometry().setFromPoints(nodePositions);
  nodes.setAttribute(
    "phase",
    new THREE.BufferAttribute(Float32Array.from(nodePositions, () => Math.random() * 6.28), 1),
  );
  globe.add(
    new THREE.Points(
      nodes,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time, size: { value: 9 * dpr } },
        vertexShader: /* glsl */ `
          uniform float time;
          uniform float size;
          attribute float phase;
          varying float facing;
          varying float pulse;
          void main() {
            facing = normalize(normalMatrix * position).z;
            pulse = 0.5 + 0.5 * sin(time * 2.4 + phase);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (0.7 + 0.6 * pulse) * step(0.1, facing);
          }`,
        fragmentShader: /* glsl */ `
          varying float facing;
          varying float pulse;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float core = smoothstep(0.16, 0.08, d);
            float halo = smoothstep(0.5, 0.0, d) * 0.45 * pulse;
            vec3 color = mix(vec3(0.133, 0.827, 0.933), vec3(0.95, 0.97, 0.98), core);
            gl_FragColor = vec4(color, (core + halo) * facing);
          }`,
      }),
    ),
  );

  // Arcs between front-facing nodes.
  type Arc = { line: THREE.Line; born: number };
  const arcs: Arc[] = [];
  const segments = 64;
  const world = new THREE.Vector3();
  const facingCamera = (v: THREE.Vector3) =>
    world.copy(v).applyMatrix4(globe.matrixWorld).sub(globe.position).z > 0.25 * globe.scale.x;
  function spawn(now: number) {
    const a = nodePositions[Math.floor(Math.random() * nodePositions.length)];
    const b = nodePositions[Math.floor(Math.random() * nodePositions.length)];
    if (a === b || a.distanceTo(b) > 1.2 || !facingCamera(a) || !facingCamera(b)) return;
    const mid = a.clone().add(b).normalize().multiplyScalar(1 + a.distanceTo(b) * 0.45);
    const points = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(segments);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: Math.random() < 0.5 ? "#6ee7b7" : "#67e8f9",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    globe.add(line);
    arcs.push({ line, born: now });
  }

  let width = 1;
  let height = 1;
  const mouse = pointer();
  const dispose = run(
    renderer,
    (w, h) => {
      width = w;
      height = h;
      Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
      camera.updateProjectionMatrix();
      const radius = w * 0.42;
      globe.scale.setScalar(radius);
      shell.scale.setScalar(radius);
      // Leave room above the sphere for the atmosphere (as in the 2D version).
      const y = h / 2 - (radius * 1.14 + 8);
      globe.position.y = y;
      shell.position.y = y;
    },
    (t) => {
      time.value = t / 1000;
      const m = mouse.step();
      globe.rotation.set(0.32 + m.y * 0.06, t * 0.00006 + m.x * 0.3, 0);
      globe.updateMatrixWorld();
      if (t && arcs.length < 7 && Math.random() < 0.06) spawn(t);
      for (let i = arcs.length - 1; i >= 0; i--) {
        const { line, born } = arcs[i];
        const life = (t - born) / 2800;
        if (life >= 1) {
          globe.remove(line);
          line.geometry.dispose();
          (line.material as THREE.Material).dispose();
          arcs.splice(i, 1);
          continue;
        }
        line.geometry.setDrawRange(0, Math.ceil(Math.min(1, life * 2.5) * (segments + 1)));
        (line.material as THREE.LineBasicMaterial).opacity = life < 0.6 ? 0.9 : 0.9 * (1 - (life - 0.6) / 0.4);
      }
      renderer.render(scene, camera);
    },
  );
  void width;
  void height;
  return () => {
    mouse.dispose();
    dispose();
  };
}
