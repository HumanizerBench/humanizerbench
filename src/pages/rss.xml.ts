import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_URL, BRAND_NAME } from "@/lib/config";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort(
      (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
    );

  return rss({
    title: `${BRAND_NAME} Blog`,
    description: "Notes from HumanizerBench",
    site: context.site ?? SITE_URL,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.pubDate,
      description: p.data.description,
      link: `/blog/${p.id}/`,
    })),
  });
}
