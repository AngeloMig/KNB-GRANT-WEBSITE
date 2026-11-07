export interface Project {
  slug: string;
  name: string;
  platform: string;
  category: string;
  engagement: string;
  url: string;
  description: string;
  overview: string;
  canvas: string;
  /** Phone status-bar colours, matched to the top of each mobile screenshot. */
  mobileBar: { bg: string; fg: string };
  agency?: string;
  /** Kept in the data but left off the site for now. */
  hidden?: boolean;
  /** Extra work: listed under Selected work (behind "Load more") with its own page, but kept out of the hero orbit. */
  more?: boolean;
}

const allProjects: Project[] = [
  {
    slug: "tero",
    name: "Tero",
    platform: "Shopify",
    category: "Wellness & audio",
    engagement: "Company project",
    agency: "MDO Digital",
    url: "https://tero.au/",
    canvas: "blue",
    mobileBar: { bg: "#6b8f92", fg: "#fff" },
    description:
      "A listening app for the bath. A Shopify site for a studio recording audio made for warm water.",
    overview:
      "Tero is a studio for the bath, releasing spoken essays, stories, breathwork, narrated histories, and sound recorded to be heard in warm water. The site introduces the app, its library and releases, and lets listeners join to get access by email.",
  },
  {
    slug: "road-armor",
    name: "Road Armor",
    platform: "Shopify",
    category: "Automotive",
    engagement: "Company project",
    agency: "Rivyl",
    url: "https://roadarmor.com/",
    canvas: "clay",
    mobileBar: { bg: "#0c0c0c", fg: "#fff" },
    description:
      "Built for the road ahead. A storefront for American-made steel bumpers and off-road accessories.",
    overview:
      "Road Armor manufactures American-made steel bumpers and accessories for trucks, Jeeps, and off-road vehicles. Its online store brings product ranges, vehicle builds, and dealer information together in one place.",
  },
  {
    slug: "feedbird",
    name: "Feedbird",
    hidden: true,
    platform: "Webflow",
    category: "Marketing services",
    engagement: "Company project",
    agency: "KNB Web Solution",
    url: "https://feedbird.com/",
    canvas: "blue",
    mobileBar: { bg: "#f3f2f1", fg: "#000" },
    description:
      "Social media, done for you. A marketing site for a social media management agency.",
    overview:
      "Feedbird is a social media management agency for small businesses. Its website explains its plans and services, shows example posts and videos, and guides visitors towards booking a demo.",
  },
  {
    slug: "omenz",
    name: "Omenz",
    platform: "Shopify",
    category: "Fashion & apparel",
    engagement: "Company project",
    agency: "Rivyl",
    url: "https://omenz.com.au/",
    canvas: "olive",
    mobileBar: { bg: "#ffeb6e", fg: "#000" },
    description:
      "Heavy ink, bold attitude. An online store for an independent Australian streetwear label.",
    overview:
      "Omenz is an independent Australian label designing graphic tees inspired by tattoo, metal, and moto culture. The store showcases new releases, bestsellers, and collections with a bold, gritty visual style.",
  },
  {
    slug: "coptrz",
    name: "Coptrz",
    platform: "WordPress",
    category: "Drones & technology",
    engagement: "Company project",
    agency: "KNB Web Solution",
    url: "https://coptrz.com/",
    canvas: "violet",
    mobileBar: { bg: "#fff", fg: "#000" },
    description:
      "The drone experts. A web presence for a commercial drone retailer and training provider.",
    overview:
      "Coptrz supplies commercial drones and drone technology in the UK, alongside consultancy, repairs, and training. The website brings together products, industry solutions, training courses, and resources.",
  },
  {
    slug: "skinistry",
    name: "Skinistry",
    platform: "Shopify",
    category: "Beauty & skincare",
    engagement: "Company project",
    agency: "Rivyl",
    url: "https://skinistry.co/",
    canvas: "lilac",
    mobileBar: { bg: "#0e0124", fg: "#fff" },
    description:
      "Sinfully good skin. A bold, character-driven storefront for a skincare brand.",
    overview:
      "Skinistry sells skincare products and bundles through a playful, high-contrast storefront. Collections, bundles, and featured favourites help shoppers find the right products for their routine.",
  },
  {
    slug: "light-my-bricks",
    name: "Light My Bricks",
    platform: "Shopify",
    category: "Toys & hobbies",
    engagement: "Company project",
    agency: "Rivyl",
    url: "https://www.lightmybricks.com/",
    canvas: "rose",
    mobileBar: { bg: "#fdcf00", fg: "#000" },
    description:
      "Lighting for LEGO® builds. A storefront for lighting kits designed by LEGO fans.",
    overview:
      "Light My Bricks designs lighting kits engineered for specific LEGO® sets. The store helps fans find kits for their builds, browse new releases, and explore its learning centre and instructions.",
  },
  {
    slug: "monsera",
    name: "Monsera",
    more: true,
    platform: "Webflow",
    category: "Fashion & lingerie",
    engagement: "Company project",
    url: "https://monsera-dev.webflow.io/",
    canvas: "rose",
    mobileBar: { bg: "#1c1b1d", fg: "#fff" },
    description:
      "Step into your goddess. A Webflow storefront for a lingerie brand with personalised bra fittings.",
    overview:
      "Monsera is a lingerie and fashion brand built around empowering women and nurturing self-worth. The site presents its collections, a fit guide and personalised bra fittings, with shopping, wishlist and account features.",
  },
  {
    slug: "narrative-hub",
    name: "Narrative Hub",
    more: true,
    platform: "Webflow",
    category: "Creative agency",
    engagement: "Company project",
    url: "https://www.narrativehub.com.au/",
    canvas: "blue",
    mobileBar: { bg: "#fff", fg: "#000" },
    description:
      "Fuelling brands. A website for a branding, marketing and video production agency.",
    overview:
      "Narrative Hub is an Australian creative agency offering branding, marketing, social media and video production from one team. The site showcases its video work and services, links to its socials and lists open roles.",
  },
  {
    slug: "teamtown",
    name: "Teamtown",
    more: true,
    platform: "Webflow",
    category: "Design services",
    engagement: "Company project",
    url: "https://www.teamtown.co/",
    canvas: "olive",
    mobileBar: { bg: "#fff", fg: "#000" },
    description:
      "On-demand design for marketing teams. A Webflow site for a graphic design subscription agency.",
    overview:
      "Teamtown is a design subscription agency that works as an in-house design team for marketing teams. The site explains how the subscription works, shows its work and client reviews, and leads visitors to pricing or an intro call.",
  },
  {
    slug: "financial-advisor-uk",
    name: "Financial Advisor UK",
    more: true,
    platform: "WordPress",
    category: "Financial services",
    engagement: "Company project",
    url: "https://financialadvisoruk.com/",
    canvas: "violet",
    mobileBar: { bg: "#341d83", fg: "#fff" },
    description:
      "Find your perfect financial advisor. A WordPress directory matching UK visitors with advisors.",
    overview:
      "Financial Advisor UK is a directory of advisors offering mortgage, life insurance, pension and wealth management advice. Visitors can get quotes, read guides and be matched with an advisor, while advisors can join and upgrade their listing.",
  },
  {
    slug: "all-terrain-industries",
    name: "All Terrain Industries",
    more: true,
    platform: "Webflow",
    category: "4WD & automotive",
    engagement: "Company project",
    url: "https://www.allterrainindustries.com.au/",
    canvas: "clay",
    mobileBar: { bg: "#e37d30", fg: "#000" },
    description:
      "Gear up. Get out. A Webflow storefront for 4WD suspension, wheels and recovery gear.",
    overview:
      "All Terrain Industries is an Australian 4WD brand making suspension, airbag kits, wheels, lighting and recovery gear. The site lets drivers shop by category, find a dealer near them and read about the brand.",
  },
];

export const projects = allProjects.filter((project) => !project.hidden);
/** The six projects that spin in the hero orbit; extra work stays in the Selected work list. */
export const heroProjects = projects.filter((project) => !project.more);

/** The hue of each card tint, for the deeper shades of a project's colour (the hero, "Next project"). */
export const canvasHues: Record<string, number> = { olive: 105, lilac: 295, violet: 285, rose: 20, blue: 245, clay: 60 };
