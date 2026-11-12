/**
 * Physics for the v2 hero graph. Framework-free (no Vue, no DOM) so it can be
 * unit-tested directly — HeroGraph.vue owns the DOM side and calls in here.
 *
 * Built on d3-force, but d3's own timer is never started: the simulation is
 * created with `.stop()` and stepped from HeroGraph's existing rAF loop via
 * `tick(dtMs)`, so there is exactly one animation loop and v1's
 * pause-when-hidden / pause-when-off-screen logic keeps working unchanged.
 *
 * Coordinates here are PIXELS (the hero box is wide and short, so percentages
 * would make one unit of x a different distance from one unit of y — physics
 * needs equal units on both axes). HeroGraph converts back to percentages.
 *
 * See docs/superpowers/specs/2026-10-16-hero-graph-v2-force-graph-design.md §3.
 */
import {
  forceCollide,
  forceLink,
  forceSimulation,
  type ForceLink,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { GraphEdge, GraphNode } from './graphNodes';

/**
 * Every tunable in one place. Mutable on purpose: the dev-only tuning panel
 * (`?graph-tune`) edits a reactive copy and calls `applyParams()`.
 */
export interface ForceParams {
  /** Pull toward each node's (drifting) home, per 60 Hz step. */
  anchorStrength: number;
  /** Edge spring stiffness for ring / diagonal edges. */
  ringLinkStrength: number;
  diagonalLinkStrength: number;
  /** Fraction of velocity lost each step (d3's velocityDecay). Higher = more damping. */
  velocityDecay: number;
  /** Max release speed for a throw, px per ms. */
  throwSpeedCap: number;
  /** Extra space kept between label pills, px. */
  collisionPadding: number;
  /** Push back into the box when a node strays past its edge inset. */
  boundsStrength: number;
}

export const FORCE_PARAMS: ForceParams = {
  anchorStrength: 0.06,
  ringLinkStrength: 0.5,
  diagonalLinkStrength: 0.15,
  velocityDecay: 0.35,
  throwSpeedCap: 1.5,
  collisionPadding: 8,
  boundsStrength: 0.3,
};

/** Physics runs at a fixed 60 Hz step so it feels the same on 60/120/144 Hz screens. */
const STEP_MS = 1000 / 60;
/** Never run more than this many catch-up steps in one frame (avoids a spiral after a hitch). */
const MAX_STEPS_PER_FRAME = 4;
/** Cap on a single frame's dt, so a long pause (tab hidden) doesn't lurch the drift clock. */
const MAX_FRAME_MS = 100;
/** Used until the real label sizes are measured (and in tests, where nothing has layout). */
const DEFAULT_NODE_SIZE = { w: 110, h: 36 };

interface SimNode extends SimulationNodeDatum {
  id: string;
  /** Home position in px (authored `base` percentage × box size). */
  homeX: number;
  homeY: number;
  /** Half the measured label pill size, used for bounds. */
  halfW: number;
  halfH: number;
  /** Collision radius, capped so it never fights the authored resting layout. */
  radius: number;
  drift: GraphNode['drift'];
  base: GraphNode['base'];
  // d3 fills these in, but declare them as always-present for simpler maths below.
  x: number;
  y: number;
  vx: number;
  vy: number;
}

type SimLink = SimulationLinkDatum<SimNode> & { kind: GraphEdge['kind'] };

export interface ForceGraph {
  /** Advance the simulation by a frame's worth of time (ms). */
  tick(dtMs: number): void;
  /** The hero box changed size: move homes, scale current positions to match. */
  resize(width: number, height: number): void;
  /** Real rendered label sizes, keyed by node id (px). */
  setNodeSizes(sizes: Record<string, { w: number; h: number }>): void;
  /** Pin a node under the pointer. (x, y) is the pointer position in px. */
  dragStart(id: string, x: number, y: number): void;
  dragMove(x: number, y: number): void;
  /** Release with the pointer's velocity in px/ms (capped to `throwSpeedCap`). */
  dragEnd(vx: number, vy: number): void;
  /** Current node centres in px, keyed by id. */
  positions(): Record<string, { x: number; y: number }>;
  /** Re-read `params` after the tuning panel changes link/collision values. */
  applyParams(): void;
}

export function createForceGraph(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
  width: number,
  height: number,
  params: ForceParams = FORCE_PARAMS,
): ForceGraph {
  let boxW = width;
  let boxH = height;
  /** Drift clock (ms). Advances by capped frame time, never by wall time. */
  let clock = 0;
  /** Leftover time not yet consumed by a fixed step. */
  let accumulator = 0;

  let dragged: SimNode | null = null;
  /** Pointer-to-node-centre offset, so grabbing a pill's edge doesn't snap its centre to the pointer. */
  let dragOffset = { x: 0, y: 0 };

  const nodes: SimNode[] = graphNodes.map((n) => ({
    id: n.id,
    homeX: 0,
    homeY: 0,
    halfW: DEFAULT_NODE_SIZE.w / 2,
    halfH: DEFAULT_NODE_SIZE.h / 2,
    radius: 0,
    drift: n.drift,
    base: n.base,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const links: SimLink[] = graphEdges.map((e) => ({ source: e.from, target: e.to, kind: e.kind }));

  /** Where a node's anchor sits right now: home plus v1's authored sine drift. */
  function anchorTarget(n: SimNode) {
    const { ax, ay, fx, fy, px, py } = n.drift;
    // Drift amplitudes are authored in percentage points of the box, as in v1.
    return {
      x: n.homeX + Math.sin(clock * fx + px) * ((ax / 100) * boxW),
      y: n.homeY + Math.cos(clock * fy + py) * ((ay / 100) * boxH),
    };
  }

  /** Custom force: spring each node toward its drifting anchor. (d3's forceX caches targets, so it can't drift.) */
  function anchorForce() {
    for (const n of nodes) {
      const t = anchorTarget(n);
      n.vx += (t.x - n.x) * params.anchorStrength;
      n.vy += (t.y - n.y) * params.anchorStrength;
    }
  }

  /** Custom force: soft push back inside the box, inset by each pill's half-size. */
  function boundsForce() {
    for (const n of nodes) {
      const minX = n.halfW;
      const maxX = boxW - n.halfW;
      const minY = n.halfH;
      const maxY = boxH - n.halfH;
      if (n.x < minX) n.vx += (minX - n.x) * params.boundsStrength;
      else if (n.x > maxX) n.vx += (maxX - n.x) * params.boundsStrength;
      if (n.y < minY) n.vy += (minY - n.y) * params.boundsStrength;
      else if (n.y > maxY) n.vy += (maxY - n.y) * params.boundsStrength;
    }
  }

  /**
   * Resting distance between two nodes' homes — the edge springs' natural length.
   * Every edge rests at exactly its home distance: d3 springs push as well as
   * pull, so a "slack" (longer) rest length would shove nodes off their homes.
   */
  function homeDistance(l: SimLink) {
    const a = l.source as SimNode;
    const b = l.target as SimNode;
    return Math.hypot(a.homeX - b.homeX, a.homeY - b.homeY);
  }

  const linkForce: ForceLink<SimNode, SimLink> = forceLink<SimNode, SimLink>(links).id((n) => n.id);
  const collideForce = forceCollide<SimNode>((n) => n.radius);

  const simulation = forceSimulation<SimNode>(nodes)
    .stop() // we step it ourselves from HeroGraph's rAF loop
    // Alpha is held at 1 forever: d3's "cooling" would freeze the graph once it
    // settles, but the hero needs to keep drifting. Stability comes from
    // velocityDecay (damping) instead.
    .alpha(1)
    .alphaDecay(0)
    .force('anchor', anchorForce)
    .force('link', linkForce)
    .force('collide', collideForce)
    .force('bounds', boundsForce);

  /**
   * Collision radius per node: half the pill width plus padding, but never more
   * than half the distance to its nearest neighbour's home — otherwise collision
   * would push apart nodes that are supposed to rest close together.
   */
  function updateRadii() {
    for (const n of nodes) {
      let nearest = Infinity;
      for (const m of nodes) {
        if (m === n) continue;
        nearest = Math.min(nearest, Math.hypot(n.homeX - m.homeX, n.homeY - m.homeY));
      }
      n.radius = Math.min(n.halfW + params.collisionPadding / 2, nearest / 2);
    }
    collideForce.radius((n) => n.radius);
  }

  function applyParams() {
    simulation.velocityDecay(params.velocityDecay);
    linkForce
      .distance(homeDistance)
      .strength((l) =>
        l.kind === 'diagonal' ? params.diagonalLinkStrength : params.ringLinkStrength,
      );
    updateRadii();
  }

  function setHomes() {
    for (const n of nodes) {
      n.homeX = (n.base.x / 100) * boxW;
      n.homeY = (n.base.y / 100) * boxH;
    }
  }

  // Initial layout: everyone starts exactly on their anchor, at rest.
  setHomes();
  for (const n of nodes) {
    const t = anchorTarget(n);
    n.x = t.x;
    n.y = t.y;
  }
  applyParams();

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  return {
    tick(dtMs) {
      const dt = Math.min(Math.max(dtMs, 0), MAX_FRAME_MS);
      clock += dt;
      accumulator += dt;
      let steps = 0;
      while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        simulation.tick();
        accumulator -= STEP_MS;
        steps++;
      }
      // Drop any backlog we refused to simulate rather than carrying it forward.
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
      // Hard backstop behind the soft bounds force: a centre never leaves the box.
      for (const n of nodes) {
        n.x = clamp(n.x, 0, boxW);
        n.y = clamp(n.y, 0, boxH);
      }
    },

    resize(w, h) {
      if (w <= 0 || h <= 0) return;
      const sx = w / boxW;
      const sy = h / boxH;
      boxW = w;
      boxH = h;
      for (const n of nodes) {
        n.x *= sx;
        n.y *= sy;
      }
      setHomes();
      applyParams(); // link rest lengths and radii depend on homes
    },

    setNodeSizes(sizes) {
      for (const n of nodes) {
        const s = sizes[n.id];
        // Zero sizes mean "no layout yet" (happy-dom, or before fonts load) — keep the default.
        if (s && s.w > 0 && s.h > 0) {
          n.halfW = s.w / 2;
          n.halfH = s.h / 2;
        }
      }
      updateRadii();
    },

    dragStart(id, x, y) {
      const n = byId.get(id);
      if (!n) return;
      dragged = n;
      dragOffset = { x: n.x - x, y: n.y - y };
      n.fx = n.x;
      n.fy = n.y;
    },

    dragMove(x, y) {
      if (!dragged) return;
      // Keep the pinned node inside the box even if the pointer leaves it.
      dragged.fx = clamp(x + dragOffset.x, dragged.halfW, boxW - dragged.halfW);
      dragged.fy = clamp(y + dragOffset.y, dragged.halfH, boxH - dragged.halfH);
      // Move it now, not on the next step, so it stays glued to the pointer.
      dragged.x = dragged.fx;
      dragged.y = dragged.fy;
    },

    dragEnd(vx, vy) {
      if (!dragged) return;
      // Cap the throw so a hard flick can't tunnel through other nodes or the bounds.
      const speed = Math.hypot(vx, vy);
      const scale = speed > params.throwSpeedCap ? params.throwSpeedCap / speed : 1;
      // d3 velocities are per step, not per ms.
      dragged.vx = vx * scale * STEP_MS;
      dragged.vy = vy * scale * STEP_MS;
      dragged.fx = null;
      dragged.fy = null;
      dragged = null;
    },

    positions() {
      return Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    },

    applyParams,
  };
}
