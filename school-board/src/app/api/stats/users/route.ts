import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const sb = admin();

    let total = 0;
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      total += data.users.length;
      if (data.users.length < perPage) break;
      page += 1;
    }

    return NextResponse.json({ count: total });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
