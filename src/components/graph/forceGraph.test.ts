import { describe, expect, test } from 'vitest';
import { createForceGraph, FORCE_PARAMS } from './forceGraph';
import { graphEdges, graphNodes } from './graphNodes';

// A typical desktop hero box (max-w-5xl wide, 420px tall).
const W = 1000;
const H = 420;
const FRAME = 1000 / 60;

/** Fresh graph with drift switched off, so "home" is a fixed point we can assert against. */
function makeStillGraph(w = W, h = H) {
  const still = graphNodes.map((n) => ({ ...n, drift: { ...n.drift, ax: 0, ay: 0 } }));
  return createForceGraph(still, graphEdges, w, h, { ...FORCE_PARAMS });
}

function run(graph: ReturnType<typeof createForceGraph>, ms: number) {
  for (let t = 0; t < ms; t += FRAME) graph.tick(FRAME);
}

function home(id: string, w = W, h = H) {
  const n = graphNodes.find((g) => g.id === id)!;
  return { x: (n.base.x / 100) * w, y: (n.base.y / 100) * h };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('forceGraph', () => {
  test('starts at home and stays there at rest (no jitter)', () => {
    const g = makeStillGraph();
    run(g, 10_000);
    for (const n of graphNodes) {
      expect(distance(g.positions()[n.id], home(n.id))).toBeLessThan(0.5);
    }
  });

  test('a dragged node follows the pointer exactly', () => {
    const g = makeStillGraph();
    const start = home('showcase');
    g.dragStart('showcase', start.x, start.y);
    g.dragMove(start.x + 80, start.y - 40);
    run(g, 200);
    const p = g.positions().showcase;
    expect(p.x).toBeCloseTo(start.x + 80, 5);
    expect(p.y).toBeCloseTo(start.y - 40, 5);
  });

  test('dragging one node pulls its neighbours along the edges', () => {
    const g = makeStillGraph();
    const start = home('showcase');
    g.dragStart('showcase', start.x, start.y);
    g.dragMove(start.x + 150, start.y);
    run(g, 500);
    // hackathons and talks share ring edges with showcase
    expect(distance(g.positions().hackathons, home('hackathons'))).toBeGreaterThan(2);
    expect(distance(g.positions().talks, home('talks'))).toBeGreaterThan(2);
  });

  test('after release every node springs back home within ~2s', () => {
    const g = makeStillGraph();
    const start = home('workshops');
    g.dragStart('workshops', start.x, start.y);
    g.dragMove(start.x + 200, start.y - 100);
    run(g, 500);
    g.dragEnd(0, 0);
    run(g, 2000);
    for (const n of graphNodes) {
      expect(distance(g.positions()[n.id], home(n.id))).toBeLessThan(3);
    }
  });

  test('a hard throw never leaves the box', () => {
    const g = makeStillGraph();
    const start = home('hackathons');
    g.dragStart('hackathons', start.x, start.y);
    g.dragMove(W - 60, 20);
    g.dragEnd(50, -50); // absurd speed: capped by throwSpeedCap
    for (let t = 0; t < 3000; t += FRAME) {
      g.tick(FRAME);
      for (const p of Object.values(g.positions())) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(W);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(H);
      }
    }
  });

  test('throw speed is capped', () => {
    const g = makeStillGraph();
    const start = home('talks');
    g.dragStart('talks', start.x, start.y);
    g.dragEnd(100, 0);
    const before = g.positions().talks.x;
    g.tick(FRAME); // one step
    const moved = g.positions().talks.x - before;
    // One step can move at most cap × step (plus a little from the other forces).
    expect(moved).toBeLessThan(FORCE_PARAMS.throwSpeedCap * FRAME + 5);
  });

  test('dragging past the box edge pins the node inside it', () => {
    const g = makeStillGraph();
    const start = home('talks');
    g.dragStart('talks', start.x, start.y);
    g.dragMove(-500, H + 500);
    const p = g.positions().talks;
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(H);
  });

  test('resize moves homes to the new box', () => {
    const g = makeStillGraph();
    g.resize(700, 420);
    run(g, 3000);
    for (const n of graphNodes) {
      expect(distance(g.positions()[n.id], home(n.id, 700, 420))).toBeLessThan(1);
    }
  });

  test('with drift on, nodes move a little but stay near home', () => {
    const g = createForceGraph(graphNodes, graphEdges, W, H, { ...FORCE_PARAMS });
    const seen = new Set<string>();
    for (let t = 0; t < 8000; t += FRAME) {
      g.tick(FRAME);
      for (const n of graphNodes) {
        const d = distance(g.positions()[n.id], home(n.id));
        // v1 drift is ~1–2% of the box; allow a generous margin for spring lag
        expect(d).toBeLessThan(40);
        if (d > 1) seen.add(n.id);
      }
    }
    expect(seen.size).toBe(graphNodes.length);
  });

  test('a long frame (e.g. after the tab was hidden) does not lurch', () => {
    const g = createForceGraph(graphNodes, graphEdges, W, H, { ...FORCE_PARAMS });
    run(g, 1000);
    const before = g.positions();
    g.tick(60_000);
    const after = g.positions();
    for (const n of graphNodes) {
      expect(distance(before[n.id], after[n.id])).toBeLessThan(10);
    }
  });
});
