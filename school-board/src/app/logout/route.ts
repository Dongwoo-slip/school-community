import { NextResponse } from "next/server";
<<<<<<< HEAD
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/community/free", req.url));
=======
import { createClient as createAuthedClient } from "@/lib/supabase/server";

async function signOutAndRedirect(req: Request) {
  const supabase = await createAuthedClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url));
}

export async function GET(req: Request) {
  return signOutAndRedirect(req);
}

export async function POST(req: Request) {
  return signOutAndRedirect(req);
>>>>>>> b3138e5 (deploy)
}
