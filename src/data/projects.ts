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
  agency?: string;
}

export const projects: Project[] = [
  {
    slug: "trademutt",
    name: "TradeMutt",
    platform: "Shopify",
    category: "Ecommerce",
    engagement: "Company project",
    url: "https://trademutt.com/",
    canvas: "olive",
    description:
      "Conversation-starting workwear. An ecommerce experience for a brand with a social purpose.",
    overview:
      "TradeMutt brings distinctive workwear, hi-vis clothing, and accessories together in an online store. Its digital presence combines product collections with the story of the brand and its social impact.",
  },
  {
    slug: "maestro-labs",
    name: "Maestro Labs",
    platform: "Webflow",
    category: "Software & technology",
    engagement: "Freelance project",
    url: "https://www.maestrolabs.com/",
    canvas: "lilac",
    description:
      "A digital home for AI productivity tools, bringing email and meeting assistants into focus.",
    overview:
      "Maestro Labs presents AI assistants for email, meetings, and productivity. The website introduces its products, explains their features, and helps visitors explore integrations and ways to get started.",
  },
  {
    slug: "valiant-finance",
    name: "Valiant Finance",
    platform: "Webflow",
    category: "Financial services",
    engagement: "Freelance project",
    url: "https://www.valiantfinance.com/",
    canvas: "violet",
    description:
      "Business finance, made approachable. A website connecting businesses with lending options.",
    overview:
      "Valiant Finance introduces business lending options through a website focused on helping visitors understand available finance products and begin a quote. Industry information and product explanations support the customer journey.",
  },
  {
    slug: "case-mate",
    name: "Case-Mate",
    platform: "Shopify",
    category: "Ecommerce",
    engagement: "Freelance project",
    url: "https://case-mate.com/",
    canvas: "rose",
    description:
      "Everyday essentials with personality. A product-led storefront for accessories and more.",
    overview:
      "Case-Mate showcases phone accessories, totes, and everyday essentials through product photography, collections, and featured products. The storefront brings a wide range of accessories into one shopping experience.",
  },
  {
    slug: "aeromech",
    name: "Aeromech",
    platform: "Webflow",
    category: "Aerospace & engineering",
    engagement: "Company project",
    agency: "Rivyl",
    url: "https://www.aeromech.com.au/",
    canvas: "blue",
    description:
      "Big sky thinking. A bold web presence for an aerospace and engineering business.",
    overview:
      "Aeromech presents its aerospace and engineering business through large aircraft imagery and a distinctive visual identity. The website introduces the company and gives visitors a way to explore its work and services.",
  },
  {
    slug: "polybush",
    name: "Polybush",
    platform: "WordPress",
    category: "Automotive",
    engagement: "Freelance project",
    url: "https://www.polybush.co.uk/",
    canvas: "clay",
    description:
      "A specialist product catalog bringing automotive suspension components to a broad audience.",
    overview:
      "Polybush helps visitors explore suspension components for cars, vans, and commercial vehicles. Its website combines product browsing, vehicle selection, technical information, and company resources.",
  },
];
