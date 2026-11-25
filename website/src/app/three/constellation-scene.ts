import * as THREE from "three";
import { aurora, pointer, run } from "./stage";

/** Soft round glow used for nodes and the agent. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,0.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Tool name rendered as a sprite in Geist Mono. */
function label(text: string) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  const font = "500 44px 'Geist Mono', ui-monospace, monospace";
  g.font = font;
  c.width = Math.ceil(g.measureText(text).width) + 48;
  c.height = 72;
  g.font = font;
  g.fillStyle = "rgba(13,19,24,0.85)";
  g.strokeStyle = "rgba(36,49,58,1)";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(2, 2, c.width - 4, c.height - 4, 16);
  g.fill();
  g.stroke();
  g.fillStyle = "#cffafe";
  g.textBaseline = "middle";
  g.fillText(text, 24, c.height / 2 + 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.scale.set(c.width / 260, c.height / 260, 1);
  return sprite;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

/**
 * A web page (centre) with its WebMCP tools orbiting around it. An agent,
 * a bright point of light, travels from the page to a tool and back; the tool
 * flashes when it is called. Names are this website's own tools.
 */
export function constellationScene(canvas: HTMLCanvasElement, tools: string[]) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const glow = glowTexture();
  const world = new THREE.Group();
  scene.add(world);

  // The page: a tilted card with a few content bars.
  const page = new THREE.Group();
  page.rotation.set(-0.55, 0, 0);
  world.add(page);
  const card = roundedRect(2.4, 1.6, 0.12);
  page.add(
    new THREE.Mesh(
      new THREE.ShapeGeometry(card, 12),
      new THREE.MeshBasicMaterial({ color: "#0d1318", transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    ),
  );
  page.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(card.getPoints(12)),
      new THREE.LineBasicMaterial({ color: "#2dd4bf", transparent: true, opacity: 0.8 }),
    ),
  );
  const bars: [number, number, number, string][] = [
    [-0.55, 0.5, 0.9, "#24313a"],
    [-0.35, 0.25, 1.3, "#1b2731"],
    [-0.45, 0.05, 1.1, "#1b2731"],
    [0.6, -0.4, 0.7, "#2dd4bf"],
  ];
  for (const [x, y, w, color] of bars) {
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.1),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    bar.position.set(x, y, 0.01);
    page.add(bar);
  }

  // Tools on tilted orbits.
  const colors = aurora.map((c) => new THREE.Color(c));
  const nodes = tools.map((name, i) => {
    const group = new THREE.Group();
    const color = colors[i % colors.length];
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 20, 12),
      new THREE.MeshBasicMaterial({ color: "#f2f6f8" }),
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glow, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    halo.scale.setScalar(0.6);
    const tag = label(name);
    tag.position.y = 0.28;
    group.add(core, halo, tag);
    world.add(group);
    const link = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending }),
    );
    world.add(link);
    return {
      group,
      halo,
      link,
      flash: 0,
      radius: 1.7 + (i / Math.max(1, tools.length - 1)) * 1.0,
      height: -0.75 + (i / Math.max(1, tools.length - 1)) * 1.5,
      speed: 0.05 + (i % 3) * 0.015,
      phase: (i / tools.length) * Math.PI * 2,
    };
  });

  // The agent.
  const agent = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glow, color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  agent.scale.setScalar(0.45);
  world.add(agent);
  const trail = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(new Array(24).fill(0).map(() => new THREE.Vector3())),
    new THREE.LineBasicMaterial({ color: "#67e8f9", transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }),
  );
  world.add(trail);
  const history: THREE.Vector3[] = [];

  let target = 0;
  let leg = 0; // 0: page → tool, 1: tool → page
  let legStart = 0;
  const legTime = 1100;
  const origin = new THREE.Vector3(0, 0, 0);
  const mouse = pointer();

  const dispose = run(
    renderer,
    (w, h) => {
      camera.aspect = w / h;
      camera.position.set(0, 1.3, w < 640 ? 6.8 : 5.2);
      camera.lookAt(0, -0.1, 0);
      camera.updateProjectionMatrix();
    },
    (t) => {
      const s = t / 1000;
      const m = mouse.step();
      world.rotation.y = m.x * 0.35;
      world.rotation.x = m.y * 0.12;
      page.position.y = Math.sin(s * 0.9) * 0.05;

      for (const n of nodes) {
        const a = n.phase + s * n.speed * Math.PI;
        n.group.position.set(Math.cos(a) * n.radius, n.height + Math.sin(s + n.phase) * 0.08, Math.sin(a) * n.radius * 0.6);
        n.flash = Math.max(0, n.flash - 0.02);
        n.halo.scale.setScalar(0.6 + n.flash * 0.9);
        const pos = n.link.geometry.attributes["position"] as THREE.BufferAttribute;
        pos.setXYZ(1, n.group.position.x, n.group.position.y, n.group.position.z);
        pos.needsUpdate = true;
        (n.link.material as THREE.LineBasicMaterial).opacity = 0.14 + n.flash * 0.7;
      }

      // Agent hops page → tool → page → next tool.
      let k = (t - legStart) / legTime;
      if (k >= 1) {
        if (leg === 0) nodes[target].flash = 1;
        leg = 1 - leg;
        if (leg === 0) target = (target + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length;
        legStart = t;
        k = 0;
      }
      const tool = nodes[target].group.position;
      const [from, to] = leg === 0 ? [origin, tool] : [tool, origin];
      const control = from.clone().add(to).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.9, 0));
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      agent.position.copy(new THREE.QuadraticBezierCurve3(from, control, to).getPoint(e));
      history.unshift(agent.position.clone());
      history.length = Math.min(history.length, 24);
      const tp = trail.geometry.attributes["position"] as THREE.BufferAttribute;
      for (let i = 0; i < 24; i++) {
        const p = history[Math.min(i, history.length - 1)];
        tp.setXYZ(i, p.x, p.y, p.z);
      }
      tp.needsUpdate = true;

      renderer.render(scene, camera);
    },
  );
  return () => {
    mouse.dispose();
    glow.dispose();
    dispose();
  };
}
