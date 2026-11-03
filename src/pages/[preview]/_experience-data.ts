// Shared data for the experience-section design previews (/ideas/experience/ and /ideas/experience-3/).
// Every fact comes from src/data/profile.ts; durations are worked out from the dates.
import fs from 'node:fs';
import { withBase } from '../../utils/paths';
import { experience } from '../../data/profile';
import { projects } from '../../data/projects';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toMonth = (s: string) => { const [m, y] = s.trim().split(' '); return Number(y) * 12 + MONTHS.indexOf(m); };
const length = (months: number) => {
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' ');
};
const slugify = (s: string) => s.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Focus areas, taken word for word from each role's summary (or title, where there's no summary yet).
const focus: Record<string, string[]> = {
  Rivyl: ['Shopify', 'Team leadership', 'Webflow', 'Migrations', 'Integrations', 'Technical SEO'],
  'Cardell Media': ['Shopify', 'Website builds', 'Website management', 'Agency clients'],
  'Dingus & Zazzy': ['WordPress', 'Shopify', 'Webflow', 'Maintenance', 'Page speed'],
  'Tecniqode Web Solutions': ['Website development', 'Project coordination', 'Quality assurance'],
};
// Colour per company, from the site's canvas palette. Used for tints and timeline bars only.
const hues: Record<string, number> = { Rivyl: 60, 'Cardell Media': 245, 'Dingus & Zazzy': 295, 'Tecniqode Web Solutions': 105 };
// Wordmark text, and a size nudge for logos with a lot of empty space around them.
const labels: Record<string, string> = { 'Tecniqode Web Solutions': 'Tecniqode' };
const scales: Record<string, number> = { Rivyl: 1.3 };
// Logos live in public/images/logos/<slug>.svg|png|webp, taken from each company's own website.
const logoOf = (slug: string) => {
  const file = ['svg', 'png', 'webp'].map((ext) => `images/logos/${slug}.${ext}`).find((f) => fs.existsSync(`public/${f}`));
  if (!file) return {};
  const buf = fs.readFileSync(`public/${file}`);
  let ratio = 3;
  if (file.endsWith('.png')) ratio = buf.readUInt32BE(16) / buf.readUInt32BE(20);
  else { const vb = buf.toString().match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/); if (vb) ratio = Number(vb[1]) / Number(vb[2]); }
  return { src: withBase(`/${file}`), ratio };
};

export const roles = experience.map((item) => {
  const [from, to] = item.dates.split('—');
  const start = toMonth(from), end = toMonth(to);
  const slug = slugify(item.company);
  return {
    ...item, slug, start, end, months: end - start, length: length(end - start),
    startYear: from.trim().split(' ')[1], focus: focus[item.company] ?? [],
    logo: { name: item.company, label: labels[item.company], scale: scales[item.company], ...logoOf(slug) },
    style: `--hue:${hues[item.company] ?? 0}`,
    work: projects.filter((p) => p.agency === item.company),
  };
});
// Overlapping roles (Cardell Media and Dingus & Zazzy) get their own lane on the timeline bar.
export const lanes: number[] = [];
export const lane = new Map<string, number>();
[...roles].sort((a, b) => a.start - b.start).forEach((r) => {
  let i = lanes.findIndex((laneEnd) => laneEnd <= r.start);
  if (i === -1) { i = lanes.length; lanes.push(0); }
  lanes[i] = r.end;
  lane.set(r.company, i);
});
export const first = Math.min(...roles.map((r) => r.start));
export const last = Math.max(...roles.map((r) => r.end));
export const totalYears = Math.floor((last - first) / 12);
export const years = Array.from({ length: Math.floor(last / 12) - Math.floor(first / 12) + 1 }, (_, i) => Math.floor(first / 12) + i);
export const pct = (month: number) => ((month - first) / (last - first)) * 100;
// The year grid (idea 9) runs from January of the first year to the end of the last.
export const gridStart = years[0] * 12, gridEnd = (years[years.length - 1] + 1) * 12;
export const gpct = (month: number) => ((month - gridStart) / (gridEnd - gridStart)) * 100;
export const longest = roles.reduce((a, b) => (b.months > a.months ? b : a));
export const shot = (slug: string) => withBase(`/images/projects/${slug}-320.webp`);
