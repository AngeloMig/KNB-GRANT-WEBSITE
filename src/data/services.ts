// Public service content, also reused by the local design previews.
import { projects, canvasHues } from './projects';
import { withBase } from '../utils/paths';

const shot = (slug: string) => {
  const p = projects.find((x) => x.slug === slug)!;
  return { name: p.name, src: withBase(`/images/projects/${slug}-960.webp`), small: withBase(`/images/projects/${slug}-480.webp`), phone: withBase(`/images/projects/${slug}-mobile-440.webp`), hue: canvasHues[p.canvas] ?? 60, agency:p.agency, engagement:p.engagement, href:withBase(`/work/${slug}/`) };
};
export const services = [
  { name: 'Shopify development', short: 'Shopify', mobileText:'', text: 'Custom themes, Liquid development, ecommerce builds, and integrations that connect your store to the tools you use.', tags: 'Shopify · Shopify Plus · Liquid', href: withBase('/contact/'), shots: ['tero', 'road-armor', 'omenz'].map(shot) },
  { name: 'Webflow development', short: 'Webflow', mobileText:'', text: 'Bring your designs to life with responsive Webflow development, CMS-driven pages, and considered interactions.', tags: 'Webflow · Finsweet Client-First · GSAP', href: withBase('/contact/'), shots: ['teamtown', 'all-terrain-industries', 'narrative-hub'].map(shot) },
  { name: 'WordPress development', short: 'WordPress', mobileText:'', text: 'Flexible business websites, custom themes, WooCommerce stores, and ongoing website improvements.', tags: 'WordPress · WooCommerce · PHP', href: withBase('/contact/'), shots: ['coptrz', 'financial-advisor-uk', 'coptrz'].map(shot) },
  { name: 'Monthly support plans', short: 'Support', mobileText:'Monthly help with updates, fixes and improvements.', text: 'A developer on call every month: 20, 40 or 80 hours for updates, fixes, speed and improvements, with a health check and a short report each month.', tags: 'Basic · Medium · Large · VIP', href: withBase('/plans/'), shots: ['skinistry', 'light-my-bricks', 'omenz'].map(shot) },
  { name: 'Migrations & technical SEO', short: 'Migrations & SEO', mobileText:'Move platforms, improve speed and keep your search setup.', text: 'Platform migrations, third-party integrations, page-speed improvements, and technical search optimization.', tags: 'Migrations · APIs · Technical SEO', href: withBase('/contact/#audit'), shots: ['light-my-bricks', 'financial-advisor-uk', 'all-terrain-industries'].map(shot) },
];
