import { NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("outlook_connections")
    .select("email, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Outlook status error:", error);

    return NextResponse.json(
      { error: "Could not load Outlook connection." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({
      connected: false,
    });
  }

  return NextResponse.json({
    connected: true,

    account: {
      email: data.email,
      name: data.display_name,
    },
  });
}