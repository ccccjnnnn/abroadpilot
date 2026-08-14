import {
  randomBytes,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@/lib/supabase/server";

import {
  createMicrosoftClient,
  getMicrosoftConfig,
  OUTLOOK_SCOPES,
} from "@/lib/microsoft/msal";

export const runtime = "nodejs";

export async function GET(
  request: Request
) {
  /*
   * First verify that the user is
   * already logged into AbroadPilot.
   */
  const supabase =
    await createSupabaseClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  const microsoft =
    createMicrosoftClient();

  const { redirectUri } =
    getMicrosoftConfig();

  /*
   * OAuth state protects against
   * CSRF / forged callback requests.
   */
  const state =
    randomBytes(32).toString("hex");

  const authUrl =
    await microsoft.getAuthCodeUrl({
      scopes: OUTLOOK_SCOPES,

      redirectUri,

      state,

      /*
       * Important during testing:
       * lets you explicitly choose
       * your NTU account instead of
       * silently using the personal
       * Microsoft account.
       */
      prompt: "select_account",
    });

  const response =
    NextResponse.redirect(authUrl);

  response.cookies.set(
    "outlook_oauth_state",
    state,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge: 10 * 60,
    }
  );

  return response;
}