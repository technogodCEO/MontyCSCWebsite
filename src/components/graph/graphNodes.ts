export interface GraphNode {
  id: string;
  label: string;
  href: string; // real page this node routes to — required for the accessible fallback
  terminalLines: string[];
  /**
   * Resting position for the full (non-ambient) hero, as a percentage of the
   * hero container. Deliberately irregular — a symmetric layout makes the mesh
   * edges read as a literal X-in-a-box rather than a graph.
   */
  base: { x: number; y: number };
  /**
   * Per-node ambient drift. Position at time t (ms) is
   *   x = base.x + sin(t * fx + px) * ax
   *   y = base.y + cos(t * fy + py) * ay
   * Amplitudes are in percentage points (~1–2); frequencies are small so a full
   * cycle takes ~15–20s. Phases are offset per node so they don't drift in unison.
   */
  drift: { ax: number; ay: number; fx: number; fy: number; px: number; py: number };
  /** Resting position for the compact NavBar cluster (percentage of that small box). */
  ambientBase: { x: number; y: number };
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: 'ring' | 'diagonal';
}

export const graphNodes: GraphNode[] = [
  {
    id: 'workshops',
    label: 'Workshops',
    href: '/activities',
    terminalLines: [
      '$ connect --node workshops',
      '> Weekly sessions on Python, ML,',
      '> and CS fundamentals.',
      '> No experience required.',
    ],
    base: { x: 24, y: 44 },
    drift: { ax: 1.6, ay: 1.3, fx: 0.00042, fy: 0.00051, px: 0, py: 1.7 },
    ambientBase: { x: 12, y: 52 },
  },
  {
    id: 'hackathons',
    label: 'Hackathons',
    href: '/events',
    terminalLines: ['$ connect --node hackathons', '> MontyHacks — our flagship', '> one-day hackathon.'],
    base: { x: 82, y: 18 },
    drift: { ax: 1.3, ay: 1.8, fx: 0.00037, fy: 0.00046, px: 2.1, py: 0.6 },
    ambientBase: { x: 38, y: 28 },
  },
  {
    id: 'talks',
    label: 'Guest Talks',
    href: '/events',
    terminalLines: ['$ connect --node guest_talks', '> Speakers from universities', '> and industry.'],
    base: { x: 16, y: 66 },
    drift: { ax: 1.8, ay: 1.1, fx: 0.00048, fy: 0.00033, px: 1.2, py: 3.0 },
    ambientBase: { x: 62, y: 62 },
  },
  {
    id: 'showcase',
    label: 'Showcase',
    href: '/showcase',
    terminalLines: ['$ connect --node showcase', '> Projects from MontyHacks', '> and beyond.'],
    base: { x: 61, y: 52 },
    drift: { ax: 1.1, ay: 1.6, fx: 0.0004, fy: 0.00058, px: 3.4, py: 2.2 },
    ambientBase: { x: 87, y: 46 },
  },
];

// Near-mesh: the four flagship categories all connect. Ring is the visible
// perimeter (workshops → hackathons → showcase → talks → workshops); the two
// diagonals are rendered fainter so the shape doesn't collapse into a box.
export const graphEdges: GraphEdge[] = [
  { from: 'workshops', to: 'hackathons', kind: 'ring' },
  { from: 'hackathons', to: 'showcase', kind: 'ring' },
  { from: 'showcase', to: 'talks', kind: 'ring' },
  { from: 'talks', to: 'workshops', kind: 'ring' },
  { from: 'workshops', to: 'showcase', kind: 'diagonal' },
  { from: 'hackathons', to: 'talks', kind: 'diagonal' },
];
