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
}

export const projects: Project[] = [
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
];
