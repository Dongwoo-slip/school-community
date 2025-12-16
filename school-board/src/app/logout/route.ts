import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOutAndRedirect(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/community/free", req.url));
}

export async function GET(req: Request) {
  return signOutAndRedirect(req);
}

export async function POST(req: Request) {
  return signOutAndRedirect(req);
}
