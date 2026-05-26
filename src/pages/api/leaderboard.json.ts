import type { APIRoute } from "astro";
import { loadLatestCycle } from "@/lib/data";

export const prerender = true;

export const GET: APIRoute = async () => {
  const cycle = await loadLatestCycle();
  return new Response(JSON.stringify(cycle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
