import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@/lib/supabase/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  createMicrosoftClient,
  getMicrosoftConfig,
  OUTLOOK_SCOPES,
} from "@/lib/microsoft/msal";

import {
  encryptText,
} from "@/lib/crypto/encryption";

export const runtime = "nodejs";

type GraphProfile = {
  id?: string;

  displayName?: string;

  mail?: string | null;

  userPrincipalName?: string;
};

function statesMatch(
  received: string,
  stored: string
) {
  const receivedBuffer =
    Buffer.from(received);

  const storedBuffer =
    Buffer.from(stored);

  if (
    receivedBuffer.length !==
    storedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    storedBuffer
  );
}

async function getGraphProfile(
  accessToken: string
) {
  const response =
    await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          Accept:
            "application/json",
        },

        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    console.error(
      "Microsoft Graph profile error:",
      response.status,
      body
    );

    throw new Error(
      "Could not read Microsoft profile."
    );
  }

  return (
    await response.json()
  ) as GraphProfile;
}

export async function GET(
  request: NextRequest
) {
  const error =
    request.nextUrl.searchParams.get(
      "error"
    );

  const errorDescription =
    request.nextUrl.searchParams.get(
      "error_description"
    );

  if (error) {
    return NextResponse.json(
      {
        error,

        message:
          errorDescription ||
          "Microsoft authorization failed.",
      },
      {
        status: 400,
      }
    );
  }

  const code =
    request.nextUrl.searchParams.get(
      "code"
    );

  const state =
    request.nextUrl.searchParams.get(
      "state"
    );

  const storedState =
    request.cookies.get(
      "outlook_oauth_state"
    )?.value;

  const isStateValid =
    Boolean(
      state &&
        storedState &&
        statesMatch(
          state,
          storedState
        )
    );

  if (
    !code ||
    !state ||
    !storedState ||
    !isStateValid
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid Outlook OAuth callback.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Verify the user is still logged
   * into AbroadPilot.
   */
  const supabase =
    await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  try {
    const microsoft =
      createMicrosoftClient();

    const { redirectUri } =
      getMicrosoftConfig();

    /*
     * Exchange authorization code.
     */
    const result =
      await microsoft
        .acquireTokenByCode({
          code,

          scopes:
            OUTLOOK_SCOPES,

          redirectUri,
        });

    if (
      !result.accessToken ||
      !result.account
    ) {
      throw new Error(
        "Microsoft did not return an account or access token."
      );
    }

    /*
     * Read the connected account's
     * basic profile.
     */
    const profile =
      await getGraphProfile(
        result.accessToken
      );

    const microsoftAccountId =
      profile.id ||
      result.account.localAccountId;

    const email =
      profile.mail ||
      profile.userPrincipalName ||
      result.account.username;

    if (
      !microsoftAccountId ||
      !email ||
      !result.account.homeAccountId
    ) {
      throw new Error(
        "Microsoft account information is incomplete."
      );
    }

    /*
     * Serialize the entire MSAL token
     * cache, not just the current
     * access token.
     */
    const serializedCache =
      microsoft
        .getTokenCache()
        .serialize();

    const encryptedCache =
      encryptText(
        serializedCache
      );

    /*
     * Store it using our backend-only
     * Supabase admin client.
     */
    const admin =
      getSupabaseAdmin();

    const now =
      new Date().toISOString();

    const {
      error: saveError,
    } =
      await admin
        .from(
          "outlook_connections"
        )
        .upsert(
          {
            user_id:
              user.id,

            microsoft_account_id:
              microsoftAccountId,

            email,

            display_name:
              profile.displayName ||
              result.account.name ||
              null,

            home_account_id:
              result.account
                .homeAccountId,

            encrypted_token_cache:
              encryptedCache,

            updated_at:
              now,
          },
          {
            onConflict:
              "user_id",
          }
        );

    if (saveError) {
      console.error(
        "Could not save Outlook connection:",
        saveError
      );

      throw new Error(
        "Could not save Outlook connection."
      );
    }

    const response =
      NextResponse.redirect(
        new URL(
          "/inbox?connected=1",
          request.url
        )
      );

    response.cookies.delete(
      "outlook_oauth_state"
    );

    return response;
  } catch (error) {
    console.error(
      "Outlook callback error:",
      error
    );

    const response =
      NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Outlook connection failed.",
        },
        {
          status: 500,
        }
      );

    response.cookies.delete(
      "outlook_oauth_state"
    );

    return response;
  }
}