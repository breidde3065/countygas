// Everything editable lives here. Replace every placeholder before launch.

export type Hours = [string, string];
export type Branch = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  query: string; // what Google Maps searches for; use the exact Business Profile name
  hours: { weekday: Hours; sat: Hours; sun: Hours };
  delivery: { areas: string[]; fee: number; time: string; cutoff: string };
};

export type Social = { label: string; href: string };
export type Business = { name: string; pitch: string; announcement: string; founded: number; phone: string; whatsapp: string; email: string; socials: Social[] };
export type Size = { kg: string; refill: number; fresh: number; use: string };
export type Settings = { business: Business; branches: Branch[]; brands: string[]; sizes: Size[] };

export const business: Business = {
  name: 'County Gas',
  pitch: 'Good gas, delivered close to home.',
  announcement: 'GOOD ENERGY. GOOD PEOPLE. COUNTY GAS.',
  founded: 2015, // placeholder
  phone: '+254700000000',
  whatsapp: '254700000000',
  email: 'hello@countygas.co.ke',
  socials: [
    { label: 'Facebook', href: 'https://facebook.com/' },
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'TikTok', href: 'https://tiktok.com/' },
    { label: 'X', href: 'https://x.com/' },
  ],
};

const hours: Branch['hours'] = { weekday: ['07:00', '21:00'], sat: ['07:00', '21:00'], sun: ['08:00', '17:00'] };
const make = (id: string, name: string, n: number): Branch => ({
  id,
  name,
  phone: `+25470000000${n}`,
  whatsapp: `25470000000${n}`,
  query: `County Gas ${name}`,
  hours,
  delivery: { areas: [], fee: 150, time: '30 to 60 minutes', cutoff: '6 pm' },
});

export const branches: Branch[] = [
  make('gataka', 'Gataka', 1),
  make('rimpa', 'Rimpa', 2),
  make('tumaini', 'Tumaini', 3),
  make('maasai-lodge', 'Maasai Lodge', 4),
  make('kiserian', 'Kiserian', 5),
  make('fatima', 'Fatima', 6),
];

export const sizes: Size[] = [
  { kg: '6', refill: 1150, fresh: 3900, use: 'One or two burners, small households' },
  { kg: '13', refill: 2450, fresh: 7200, use: 'Family cooking, most homes' },
  { kg: '22.5', refill: 4250, fresh: 11500, use: 'Large families and small eateries' },
  { kg: '50', refill: 9000, fresh: 21000, use: 'Restaurants, hotels and institutions' },
];

export const brands = ['Total', 'K-Gas', 'Afrigas', 'Rubis', 'ProGas'];

export const accessories = [
  { name: 'Regulator', price: 850 },
  { name: 'Gas hose, 1.5 m', price: 450 },
  { name: 'Single burner', price: 1800 },
  { name: 'Double burner', price: 3200 },
  { name: 'Table-top grill', price: 2600 },
];

export const safety = {
  leak: [
    'Mix a little soap in water and brush it over the valve, regulator and hose joints.',
    'Open the valve. Bubbles that grow mean a leak.',
    'If you see bubbles, close the valve and do not use the cylinder. Call your branch.',
  ],
  storage: [
    'Keep cylinders upright, in a well-ventilated spot, away from heat and direct sun.',
    'Never store a cylinder in a bedroom, basement or a closed cupboard.',
    'Close the valve after every use and check the hose for cracks or stiffness every few months.',
    'Replace hoses and regulators that are old, cracked or loose. Do not tape over damage.',
  ],
  emergency: [
    'Put out all flames. Do not switch lights or appliances on or off.',
    'If it is safe to reach, close the cylinder valve.',
    'Open doors and windows, then move everyone outside.',
    'Call the emergency line on 999 or 112, then call your branch.',
  ],
};

/** Used until the admin saves settings for the first time. */
export const defaults: Settings = { business, branches, brands, sizes };
