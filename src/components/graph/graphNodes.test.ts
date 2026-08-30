import { describe, expect, test } from 'vitest';
import { graphNodes, graphEdges } from './graphNodes';

describe('graph data', () => {
  test('every node has a full-layout base coord and drift params', () => {
    for (const n of graphNodes) {
      expect(n.base.x).toBeGreaterThan(0);
      expect(n.base.x).toBeLessThan(100);
      expect(n.base.y).toBeGreaterThan(0);
      expect(n.base.y).toBeLessThan(100);
      expect(n.drift.ax).toBeGreaterThan(0);
      expect(n.drift.ay).toBeGreaterThan(0);
    }
  });

  test('base positions are not mirror-symmetric (no X-in-a-box)', () => {
    const xs = graphNodes.map((n) => n.base.x).sort((a, b) => a - b);
    const ys = graphNodes.map((n) => n.base.y).sort((a, b) => a - b);
    // reject a layout where the four points form two mirrored pairs
    expect(Math.abs(xs[0] + xs[3] - (xs[1] + xs[2]))).toBeGreaterThan(4);
    expect(Math.abs(ys[0] + ys[3] - (ys[1] + ys[2]))).toBeGreaterThan(4);
  });

  test('edges reference real node ids; 4 ring + 2 diagonal', () => {
    const ids = new Set(graphNodes.map((n) => n.id));
    for (const e of graphEdges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
    expect(graphEdges.filter((e) => e.kind === 'ring')).toHaveLength(4);
    expect(graphEdges.filter((e) => e.kind === 'diagonal')).toHaveLength(2);
  });

  test('ring forms a closed loop touching every node', () => {
    const ring = graphEdges.filter((e) => e.kind === 'ring');
    const degree = new Map<string, number>();
    for (const e of ring) {
      degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
      degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
    }
    expect([...degree.values()]).toEqual([2, 2, 2, 2]);
    expect(degree.size).toBe(4);
  });
});
