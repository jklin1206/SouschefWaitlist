import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "waitlist_not_configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body?.source === "string" ? body.source : "waitlist-landing";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        name: name || null,
        email,
        source,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "waitlist_insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
