import type { WebGLRenderer } from "three";

/** True when the visitor asked for less motion; scenes then render one still frame. */
export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** WebGL is available and worth using (not in forced colours / data saver). */
export function webglAvailable() {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

/** Pointer position in -1..1 relative to the viewport, eased toward the target each frame. */
export function pointer() {
  const target = { x: 0, y: 0 };
  const value = { x: 0, y: 0 };
  const move = (e: PointerEvent) => {
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
  };
  addEventListener("pointermove", move, { passive: true });
  return {
    value,
    step(ease = 0.05) {
      value.x += (target.x - value.x) * ease;
      value.y += (target.y - value.y) * ease;
      return value;
    },
    dispose: () => removeEventListener("pointermove", move),
  };
}

/**
 * Runs `frame` on every animation frame while the canvas is on screen, keeps
 * the renderer sized to the canvas, and renders a single frame when motion is
 * reduced. Returns a cleanup function.
 */
export function run(
  renderer: WebGLRenderer,
  resize: (width: number, height: number) => void,
  frame: (time: number) => void,
) {
  const canvas = renderer.domElement;
  const still = reducedMotion();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  const fit = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    resize(w, h);
    if (still) frame(0);
  };
  const sizes = new ResizeObserver(fit);
  sizes.observe(canvas);
  fit();

  let raf = 0;
  const loop = (t: number) => {
    frame(t);
    raf = requestAnimationFrame(loop);
  };
  const seen = new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(raf);
    if (entry.isIntersecting && !still) raf = requestAnimationFrame(loop);
  });
  seen.observe(canvas);

  return () => {
    cancelAnimationFrame(raf);
    sizes.disconnect();
    seen.disconnect();
    renderer.dispose();
  };
}

export const aurora = ["#34d399", "#22d3ee", "#3b82f6"] as const;
