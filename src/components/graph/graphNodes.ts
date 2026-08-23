export interface GraphNode {
  id: string;
  label: string;
  href: string; // real page this node routes to — required for the accessible fallback
  terminalLines: string[];
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
  },
  {
    id: 'hackathons',
    label: 'Hackathons',
    href: '/events',
    terminalLines: [
      '$ connect --node hackathons',
      '> MontyHacks — our flagship',
      '> one-day hackathon.',
    ],
  },
  {
    id: 'talks',
    label: 'Guest Talks',
    href: '/events',
    terminalLines: [
      '$ connect --node guest_talks',
      '> Speakers from universities',
      '> and industry.',
    ],
  },
  {
    id: 'showcase',
    label: 'Showcase',
    href: '/showcase',
    terminalLines: [
      '$ connect --node showcase',
      '> Projects from MontyHacks',
      '> and beyond.',
    ],
  },
];
