import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { pointer, reducedMotion, run } from "./stage";

/** The braces from brand/symbol.svg (64×64 viewBox). */
const braces =
  "M25 16c-4.5 0-6.5 2.2-6.5 6.5v4c0 3.3-1.8 5.5-5.5 5.5 3.7 0 5.5 2.2 5.5 5.5v4c0 4.3 2 6.5 6.5 6.5M39 16c4.5 0 6.5 2.2 6.5 6.5v4c0 3.3 1.8 5.5 5.5 5.5-3.7 0-5.5 2.2-5.5 5.5v4c0 4.3-2 6.5-6.5 6.5";

/**
 * The {•} mark in 3D: the braces become rounded tubes along the logo's own
 * path, the pupil a glowing sphere. Aurora-coloured lights give green, cyan
 * and blue reflections. It floats and turns toward the pointer.
 */
export function logoScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 500);
  camera.position.z = 118;

  const mark = new THREE.Group();
  scene.add(mark);
  // Aurora gradient across the mark (green left → cyan → blue right) as vertex colours.
  const stops = ["#34d399", "#22d3ee", "#3b82f6"].map((c) => new THREE.Color(c));
  const tint = (geometry: THREE.BufferGeometry, offsetX = 0) => {
    const pos = geometry.attributes["position"];
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp((pos.getX(i) + offsetX + 20) / 40, 0, 1) * 2;
      c.copy(stops[t < 1 ? 0 : 1]).lerp(stops[t < 1 ? 1 : 2], t < 1 ? t : t - 1);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  };
  const glass = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: "#ffffff",
    metalness: 0.15,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.7,
    iridescenceIOR: 1.4,
  });
  const radius = 2.9;
  const { paths } = new SVGLoader().parse(`<svg><path d="${braces}"/></svg>`);
  for (const sub of paths[0].subPaths) {
    const points = sub
      .getSpacedPoints(120)
      .map((p) => new THREE.Vector3(p.x - 32, 32 - p.y, 0));
    const curve = new THREE.CatmullRomCurve3(points);
    mark.add(new THREE.Mesh(tint(new THREE.TubeGeometry(curve, 240, radius, 24)), glass));
    for (const end of [points[0], points.at(-1)!]) {
      const cap = new THREE.Mesh(tint(new THREE.SphereGeometry(radius, 24, 16), end.x), glass);
      cap.position.copy(end);
      mark.add(cap);
    }
  }
  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 48, 32),
    new THREE.MeshPhysicalMaterial({
      color: "#f2f6f8",
      emissive: "#2dd4bf",
      emissiveIntensity: 0.55,
      roughness: 0.25,
      clearcoat: 1,
    }),
  );
  mark.add(pupil);

  // Aurora lighting: green from the left, cyan from above, blue from the right.
  for (const [color, x, y, z] of [
    ["#34d399", -60, -10, 40],
    ["#22d3ee", 0, 60, 50],
    ["#3b82f6", 60, -20, 40],
  ] as const) {
    const light = new THREE.PointLight(color, 6000, 0, 2);
    light.position.set(x, y, z);
    scene.add(light);
  }
  scene.add(new THREE.AmbientLight("#ffffff", 0.25));

  const mouse = pointer();
  const still = reducedMotion();
  const dispose = run(
    renderer,
    (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    (t) => {
      const m = mouse.step(0.06);
      const s = t / 1000;
      mark.rotation.y = (still ? -0.35 : Math.sin(s * 0.6) * 0.35) + m.x * 0.6;
      mark.rotation.x = (still ? 0.12 : Math.sin(s * 0.45) * 0.12) + m.y * 0.4;
      mark.position.y = still ? 0 : Math.sin(s * 1.1) * 1.6;
      pupil.scale.setScalar(1 + (still ? 0 : Math.sin(s * 2.2) * 0.05));
      renderer.render(scene, camera);
    },
  );
  return () => {
    mouse.dispose();
    pmrem.dispose();
    dispose();
  };
}
