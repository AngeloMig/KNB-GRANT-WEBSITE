import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site:
    process.env.PUBLIC_SITE_URL ||
    "https://grant-payad-portfolio.infinite-mod-9611.chatgpt.site",
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") })],
  output: "static",
});
