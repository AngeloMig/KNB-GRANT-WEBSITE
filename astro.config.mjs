import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const githubPages = process.env.GITHUB_PAGES === "true";
const [owner, repository] = (
  process.env.GITHUB_REPOSITORY || "AngeloMig/KNB-GRANT-WEBSITE"
).split("/");
const githubBase = repository.toLowerCase() === `${owner.toLowerCase()}.github.io`
  ? "/"
  : `/${repository}`;

export default defineConfig({
  site:
    githubPages ? `https://${owner.toLowerCase()}.github.io` : (
      process.env.PUBLIC_SITE_URL ||
      "https://grant-payad-portfolio.infinite-mod-9611.chatgpt.site"
    ),
  base: githubPages ? githubBase : "/",
  outDir: githubPages ? "./dist-github/" : "./dist/",
  build: { assets: githubPages ? "assets" : "_astro", inlineStylesheets: "always" },
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") && !page.endsWith("/quote/") })],
  output: "static",
});
