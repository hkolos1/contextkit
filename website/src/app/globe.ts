import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  viewChild,
} from "@angular/core";
import { webglAvailable } from "./three/stage";

/**
 * Rotating dotted sphere rising like a horizon behind the hero, coloured like
 * an aurora (green → cyan → blue). Some dots are "tools" that pulse, and
 * arcs connect them the way an agent hops between tools.
 * Canvas 2D, ~2.4k points; pauses off-screen and is static for reduced motion.
 */
@Component({
  selector: "tp-globe",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="block h-full w-full"></canvas>`,
  host: { "aria-hidden": "true", class: "pointer-events-none block" },
})
export class Globe {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.choose());
  }

  /** three.js globe when WebGL is available (loaded lazily); 2D canvas otherwise. */
  private choose() {
    const canvas = this.canvas().nativeElement;
    if (!webglAvailable()) return this.start();
    import("./three/globe-scene")
      .then(({ globeScene }) => this.destroyRef.onDestroy(globeScene(canvas)))
      .catch(() => this.start());
  }

  private start() {
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Fibonacci sphere: evenly spread unit vectors.
    const count = 2400;
    const points: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const r = Math.sqrt(1 - y * y);
      const t = i * Math.PI * (3 - Math.sqrt(5));
      points.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    const nodes = points.filter((_, i) => i % 37 === 0);
    type Arc = { a: number; b: number; born: number };
    let arcs: Arc[] = [];

    let width = 0;
    let height = 0;
    let radius = 0;
    let cx = 0;
    let cy = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = width * 0.42;
      cx = width / 2;
      // Leave room above the sphere for the atmosphere rim (1.12 × radius).
      cy = radius * 1.14 + 8;
    };

    // Aurora colour across the sphere: green (left) → cyan → blue (right).
    const stops = [
      [52, 211, 153],
      [34, 211, 238],
      [59, 130, 246],
    ];
    const aurora = (x: number) => {
      const t = Math.min(1, Math.max(0, (x + 1) / 2)) * 2;
      const [a, b] = t < 1 ? [stops[0], stops[1]] : [stops[1], stops[2]];
      const f = t < 1 ? t : t - 1;
      return a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(",");
    };

    const tilt = 0.32;
    const project = ([x, y, z]: [number, number, number], angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rx = x * cos + z * sin;
      const rz = -x * sin + z * cos;
      const ty = y * Math.cos(tilt) - rz * Math.sin(tilt);
      const tz = y * Math.sin(tilt) + rz * Math.cos(tilt);
      return { x: cx + rx * radius, y: cy - ty * radius, z: tz };
    };

    const draw = (time: number) => {
      const angle = time * 0.00006;
      ctx.clearRect(0, 0, width, height);

      // Atmosphere rim.
      const rim = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.12);
      rim.addColorStop(0, "rgba(34,211,238,0)");
      rim.addColorStop(0.45, "rgba(45,212,191,0.28)");
      rim.addColorStop(1, "rgba(59,130,246,0)");
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.12, 0, Math.PI * 2);
      ctx.fill();

      for (const p of points) {
        const q = project(p, angle);
        if (q.z < 0) continue;
        const size = 1.1 + q.z * 1.4;
        ctx.fillStyle = `rgba(${aurora((q.x - cx) / radius)},${0.16 + q.z * 0.7})`;
        ctx.fillRect(q.x - size / 2, q.y - size / 2, size, size);
      }

      // Tool nodes pulse on the visible side.
      for (const [i, n] of nodes.entries()) {
        const q = project(n, angle);
        if (q.z < 0.15) continue;
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.003 + i);
        ctx.fillStyle = `rgba(34,211,238,${0.28 * pulse * q.z})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4 + pulse * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(242,246,248,${0.5 + 0.5 * q.z})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Arcs between front-facing nodes, drawn in then faded out.
      const life = 2600;
      arcs = arcs.filter((a) => time - a.born < life);
      if (!still && arcs.length < 5 && Math.random() < 0.04) {
        const a = Math.floor(Math.random() * nodes.length);
        const b = Math.floor(Math.random() * nodes.length);
        if (a !== b) arcs.push({ a, b, born: time });
      }
      for (const arc of arcs) {
        const p = project(nodes[arc.a], angle);
        const q = project(nodes[arc.b], angle);
        if (p.z < 0.2 || q.z < 0.2) continue;
        const t = (time - arc.born) / life;
        const grow = Math.min(1, t * 2.5);
        const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        const lift = Math.hypot(q.x - p.x, q.y - p.y) * 0.35;
        const dx = mx - cx;
        const dy = my - cy;
        const len = Math.hypot(dx, dy) || 1;
        const kx = mx + (dx / len) * lift;
        const ky = my + (dy / len) * lift;
        ctx.strokeStyle = `rgba(110,231,183,${0.75 * fade})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        // Partial quadratic curve up to `grow` (de Casteljau).
        const ax = p.x + (kx - p.x) * grow;
        const ay = p.y + (ky - p.y) * grow;
        const bx = kx + (q.x - kx) * grow;
        const by = ky + (q.y - ky) * grow;
        ctx.quadraticCurveTo(ax, ay, ax + (bx - ax) * grow, ay + (by - ay) * grow);
        ctx.stroke();
      }
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (still) draw(0);
    });
    observer.observe(canvas);

    let frame = 0;
    let visible = true;
    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !still) frame = requestAnimationFrame(loop);
    });
    if (still) draw(0);
    else io.observe(canvas);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
    });
  }
}
