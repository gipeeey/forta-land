// ============================================================
// FORTA — central site configuration
// One source of truth for brand, navigation, contact and social.
// Edit here and every page/component updates.
// ============================================================

export const site = {
  name: 'FORTA',
  /** Used in <title> templates and copy. */
  legalName: 'Forta Studio',
  tagline: 'Software studio',
  /** Default meta description (homepage / fallback). */
  description:
    'FORTA is a software studio. We research, design and build the websites, web apps, and custom systems businesses run on — and partner with agencies who need a technical team.',
  /** Placeholder — replace with the real domain when chosen. Must match astro.config.mjs `site`. */
  url: 'https://forta.studio',
  email: 'hello@forta.studio',
  /** Remote-first locations shown on the contact page. */
  locations: 'Remote-first, worldwide',
  /** Founding year (used in copy + stats). */
  founded: 2026,
  /** Formspree form id — replace `your-id` with the real one from formspree.io. */
  formspreeId: 'your-id',
} as const;

export const nav = [
  { href: '/', label: 'Index' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'Studio' },
  { href: '/journal', label: 'Journal' },
  { href: '/contact', label: 'Contact' },
] as const;

export const social = [
  { href: '#', label: 'Instagram' },
  { href: '#', label: 'Dribbble' },
  { href: '#', label: 'LinkedIn' },
  { href: '#', label: 'Are.na' },
] as const;
