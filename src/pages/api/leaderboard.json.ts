import type { APIRoute } from "astro";
import { loadLatestCycleOrNull } from "@/lib/data";

export const prerender = true;

export const GET: APIRoute = async () => {
  const cycle = await loadLatestCycleOrNull();
  if (!cycle) {
    return new Response(
      JSON.stringify({ error: "No cycles published yet" }, null, 2),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }
  return new Response(JSON.stringify(cycle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
