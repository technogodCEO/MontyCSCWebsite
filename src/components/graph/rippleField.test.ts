import { describe, expect, test } from 'vitest';
import { createRippleField, GLYPHS, MAX_RIPPLES, RIPPLE_PARAMS } from './rippleField';

const FRAME = 1000 / 60;

function makeField(cols = 60, rows = 20, seed = 42) {
  return createRippleField({ cols, rows, seed, params: { ...RIPPLE_PARAMS } });
}

/** Step until no ripple is running (with a safety limit). Returns every StepResult. */
function runOut(field: ReturnType<typeof createRippleField>) {
  const results = [];
  for (let i = 0; i < 600 && field.isActive(); i++) results.push(field.step(FRAME));
  return results;
}

function allGlyphs(field: ReturnType<typeof createRippleField>) {
  return Array.from({ length: field.cols * field.rows }, (_, i) => field.glyphAt(i)).join('');
}

describe('rippleField', () => {
  test('same seed gives the same glyphs; all glyphs are hex', () => {
    expect(allGlyphs(makeField())).toBe(allGlyphs(makeField()));
    expect(allGlyphs(makeField(60, 20, 1))).not.toBe(allGlyphs(makeField(60, 20, 2)));
    for (const g of allGlyphs(makeField())) expect(GLYPHS).toContain(g);
  });

  test('with no ripples, step does no work', () => {
    const f = makeField();
    expect(f.step(FRAME)).toEqual({ dirty: [], rolled: [] });
    expect(f.isActive()).toBe(false);
  });

  test('a ripple brightens cells near its wavefront, not far away', () => {
    const f = makeField();
    f.addRipple(240, 160, 1);
    for (let i = 0; i < 6; i++) f.step(FRAME); // radius ≈ 60px
    const near = f.intensityAt(Math.floor(160 / 16) * f.cols + Math.floor(300 / 8)); // ~60px right of origin
    const far = f.intensityAt(0); // top-left corner, ~290px away
    expect(near).toBeGreaterThan(0.2);
    expect(far).toBe(0);
  });

  test('the wavefront re-rolls each cell at most once per ripple', () => {
    const f = makeField();
    f.addRipple(240, 160, 1);
    const counts = new Map<number, number>();
    for (const r of runOut(f)) for (const i of r.rolled) counts.set(i, (counts.get(i) ?? 0) + 1);
    expect(counts.size).toBeGreaterThan(100);
    expect(Math.max(...counts.values())).toBe(1);
  });

  test('the field returns exactly to rest when the ripple finishes', () => {
    const f = makeField();
    f.addRipple(240, 160, 1);
    runOut(f);
    expect(f.isActive()).toBe(false);
    for (let i = 0; i < f.cols * f.rows; i++) expect(f.intensityAt(i)).toBe(0);
    expect(f.step(FRAME).dirty).toHaveLength(0);
  });

  test(`at most ${MAX_RIPPLES} ripples run at once`, () => {
    const f = makeField();
    // Five ripples in different places; only the last three should survive.
    for (let k = 0; k < 5; k++) f.addRipple(40 + k * 80, 160, 1);
    f.step(FRAME);
    // Cells next to the first two origins never light up.
    const cellAt = (x: number, y: number) => Math.floor(y / 16) * f.cols + Math.floor(x / 8);
    for (let i = 0; i < 4; i++) f.step(FRAME);
    expect(f.intensityAt(cellAt(40, 160 - 40))).toBe(0);
  });

  test('a weaker ripple dies sooner than a strong one', () => {
    const weak = makeField();
    const strong = makeField();
    weak.addRipple(240, 160, 0.3);
    strong.addRipple(240, 160, 1);
    expect(runOut(weak).length).toBeLessThan(runOut(strong).length);
  });

  test('a single ripple finishes in under ~1.5s at full strength', () => {
    const f = makeField();
    f.addRipple(240, 160, 1);
    expect(runOut(f).length * FRAME).toBeLessThan(1500);
  });

  test('resize keeps glyphs where the grids overlap', () => {
    const f = makeField(10, 5);
    const before = Array.from({ length: 50 }, (_, i) => f.glyphAt(i));
    f.resize(20, 3);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 10; col++) {
        expect(f.glyphAt(row * 20 + col)).toBe(before[row * 10 + col]);
      }
    }
    expect(f.cols * f.rows).toBe(60);
  });

  test('strength 0 adds nothing', () => {
    const f = makeField();
    f.addRipple(100, 100, 0);
    expect(f.isActive()).toBe(false);
  });
});
