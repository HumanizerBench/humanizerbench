import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  source?: string;
  turnstileSiteKey?: string;
  className?: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let turnstileScriptLoading: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptLoading) return turnstileScriptLoading;
  turnstileScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });
  return turnstileScriptLoading;
}

export default function SubscribeForm({
  source = "public_site",
  turnstileSiteKey,
  className,
}: Props) {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainer = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileContainer.current) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileContainer.current)
          return;
        widgetId.current = window.turnstile.render(turnstileContainer.current, {
          sitekey: turnstileSiteKey,
          callback: (token) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          theme: "auto",
          size: "compact",
        });
      })
      .catch(() => {
        // If Turnstile fails to load, the form will still submit but the
        // server will reject; surface a generic error then.
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [turnstileSiteKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status.kind === "submitting") return;
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken, source }),
      });
      if (res.ok) {
        setStatus({ kind: "ok" });
        setEmail("");
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
          setTurnstileToken(null);
        }
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({
        kind: "error",
        message: data.error ?? "Could not subscribe. Try again.",
      });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  if (status.kind === "ok") {
    return (
      <p className={cn("text-xs text-[var(--color-text-secondary)]", className)}>
        Thanks, you’re on the list.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-2", className)}
      noValidate
    >
      <label
        htmlFor={emailId}
        className="text-xs text-[var(--color-text-secondary)]"
      >
        Get notified when rankings update
      </label>
      <div className="flex gap-2">
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          disabled={status.kind === "submitting"}
        />
        <Button
          type="submit"
          size="default"
          disabled={
            status.kind === "submitting" ||
            !email ||
            (Boolean(turnstileSiteKey) && !turnstileToken)
          }
        >
          {status.kind === "submitting" ? "…" : "Subscribe"}
        </Button>
      </div>
      {turnstileSiteKey ? (
        <div ref={turnstileContainer} className="cf-turnstile" />
      ) : null}
      {status.kind === "error" ? (
        <p className="text-xs text-destructive" role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
