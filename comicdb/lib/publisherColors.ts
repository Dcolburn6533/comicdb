const PALETTE = [
  { bg: '#e23636', text: '#ffffff' },
  { bg: '#1d4ed8', text: '#ffffff' },
  { bg: '#d97706', text: '#000000' },
  { bg: '#16a34a', text: '#ffffff' },
  { bg: '#7c3aed', text: '#ffffff' },
  { bg: '#ea580c', text: '#ffffff' },
  { bg: '#0891b2', text: '#ffffff' },
  { bg: '#db2777', text: '#ffffff' },
  { bg: '#ca8a04', text: '#000000' },
  { bg: '#0f766e', text: '#ffffff' },
];

const KNOWN: Record<string, { bg: string; text: string }> = {
  'Marvel':              { bg: '#e23636', text: '#ffffff' },
  'DC Comics':           { bg: '#1d4ed8', text: '#ffffff' },
  'DC':                  { bg: '#1d4ed8', text: '#ffffff' },
  'Image':               { bg: '#16a34a', text: '#ffffff' },
  'Image Comics':        { bg: '#16a34a', text: '#ffffff' },
  'Dark Horse':          { bg: '#1e293b', text: '#ffffff' },
  'Dark Horse Comics':   { bg: '#1e293b', text: '#ffffff' },
  'IDW':                 { bg: '#7c3aed', text: '#ffffff' },
  'IDW Publishing':      { bg: '#7c3aed', text: '#ffffff' },
  'Boom Studios':        { bg: '#ea580c', text: '#ffffff' },
  'Boom! Studios':       { bg: '#ea580c', text: '#ffffff' },
  'Vertigo':             { bg: '#0891b2', text: '#ffffff' },
  'Archie':              { bg: '#dc2626', text: '#ffffff' },
  'Archie Comics':       { bg: '#dc2626', text: '#ffffff' },
  'Valiant':             { bg: '#d97706', text: '#000000' },
  'Dynamite':            { bg: '#b91c1c', text: '#ffffff' },
  'Dynamite Entertainment': { bg: '#b91c1c', text: '#ffffff' },
};

export function getPublisherColor(company: string): { bg: string; text: string } {
  if (KNOWN[company]) return KNOWN[company];
  const hash = company.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}
