import { NextResponse } from "next/server";

type WindowKey = `${string}:${string}`;

const counters = new Map<WindowKey, { count: number; resetAt: number }>();

function nowMs() {
  return Date.now();
}

export function checkRateLimit(params: {
  uid: string;
  endpoint: string;
  max: number;
  windowMs: number;
}): NextResponse | null {
  const key: WindowKey = `${params.uid}:${params.endpoint}`;
  const current = counters.get(key);
  const now = nowMs();
  if (!current || now >= current.resetAt) {
    counters.set(key, { count: 1, resetAt: now + params.windowMs });
    return null;
  }
  if (current.count >= params.max) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "短時間にアクセスが集中しています。少し待って再試行してください。" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(retryAfter, 1)) },
      }
    );
  }
  current.count += 1;
  counters.set(key, current);
  return null;
}
