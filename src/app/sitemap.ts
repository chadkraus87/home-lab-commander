import type { MetadataRoute } from "next";

const routes = [
  "",
  "/devices",
  "/network",
  "/services",
  "/containers",
  "/monitoring",
  "/alerts",
  "/activity",
  "/inventory",
  "/notes",
  "/settings",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-20T00:00:00.000Z");
  return routes.map((route) => ({
    url: `https://home-lab-commander.vercel.app${route}`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
