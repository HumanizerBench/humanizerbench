import type { APIRoute } from "astro";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SubscribeBody {
  email?: unknown;
  turnstileToken?: unknown;
  source?: unknown;
}

interface RuntimeEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

// Astro 6 + @astrojs/cloudflare removed `Astro.locals.runtime.env` in favor of
// the `cloudflare:workers` module's `env` binding. That module only exists at
// runtime inside a Worker — `astro dev` resolves it to undefined, in which
// case we fall back to process.env for local development.
async function getEnv(): Promise<RuntimeEnv> {
  let cf: RuntimeEnv | undefined;
  try {
    // @ts-expect-error — virtual module provided by the Workers runtime
    const mod = await import("cloudflare:workers");
    cf = mod.env as RuntimeEnv;
  } catch {
    // Not running inside a Worker (astro dev, tsx, etc).
  }
  return {
    SUPABASE_URL: cf?.SUPABASE_URL ?? process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: cf?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    TURNSTILE_SECRET_KEY:
      cf?.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET_KEY,
  };
}

async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
): Promise<boolean> {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const token =
    typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const source =
    typeof body.source === "string" && body.source.length <= 64
      ? body.source
      : "public_site";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: "Invalid email" });
  }

  const env = await getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return json(500, { error: "Subscriber store not configured" });
  }

  if (env.TURNSTILE_SECRET_KEY) {
    if (!token) return json(400, { error: "Captcha required" });
    const ok = await verifyTurnstile(
      token,
      env.TURNSTILE_SECRET_KEY,
      clientAddress ?? null,
    );
    if (!ok) return json(400, { error: "Captcha failed" });
  }

  // Insert via Supabase REST. RLS allows anon INSERT only; duplicates are
  // collapsed by `on_conflict=email` with `resolution=ignore-duplicates` so
  // re-submitting the same address looks the same as a fresh subscribe.
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({ email, source }),
    },
  );

  if (!res.ok) {
    return json(502, { error: "Could not save subscription" });
  }

  return json(200, { ok: true });
};
