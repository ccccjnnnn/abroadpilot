import {
  NextResponse,
} from "next/server";

import {
  InteractionRequiredAuthError,
} from "@azure/msal-node";

import {
  createClient as createSupabaseClient,
} from "@/lib/supabase/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  createMicrosoftClient,
  OUTLOOK_GRAPH_SCOPES,
} from "@/lib/microsoft/msal";

import {
  decryptText,
  encryptText,
} from "@/lib/crypto/encryption";

import {
  getDisplaySender,
  getDisplaySubject,
  parseForwardedEmail,
  repairMojibake,
} from "@/lib/email/forwarded";

export const runtime = "nodejs";

type GraphMessage = {
  id: string;

  subject?: string | null;

  from?: {
    emailAddress?: {
      name?: string | null;
      address?: string | null;
    };
  };

  receivedDateTime?: string;

  bodyPreview?: string;

  body?: {
    contentType?: string;
    content?: string;
  };

  isRead?: boolean;
};

export async function GET() {
  const supabase =
    await createSupabaseClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const admin =
    getSupabaseAdmin();

  const {
    data: connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "outlook_connections"
      )
      .select(
        `
        email,
        display_name,
        home_account_id,
        encrypted_token_cache
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (connectionError) {
    console.error(
      "Could not load Outlook connection:",
      connectionError
    );

    return NextResponse.json(
      {
        error:
          "Could not load Outlook connection.",
      },
      {
        status: 500,
      }
    );
  }

  if (!connection) {
    return NextResponse.json({
      connected: false,
      messages: [],
    });
  }

  try {
    const microsoft =
      createMicrosoftClient();

    const serializedCache =
      decryptText(
        connection
          .encrypted_token_cache
      );

    const tokenCache =
      microsoft.getTokenCache();

    tokenCache.deserialize(
      serializedCache
    );

    const account =
      await tokenCache
        .getAccountByHomeId(
          connection
            .home_account_id
        );

    if (!account) {
      throw new Error(
        "Microsoft account could not be restored from token cache."
      );
    }

    const tokenResult =
      await microsoft
        .acquireTokenSilent({
          account,

          scopes:
            OUTLOOK_GRAPH_SCOPES,
        });

    if (
      !tokenResult.accessToken
    ) {
      throw new Error(
        "Microsoft access token is unavailable."
      );
    }

    /*
     * acquireTokenSilent() may refresh
     * tokens, so persist the cache again.
     */
    const updatedCache =
      tokenCache.serialize();

    const {
      error:
        cacheSaveError,
    } =
      await admin
        .from(
          "outlook_connections"
        )
        .update({
          encrypted_token_cache:
            encryptText(
              updatedCache
            ),

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "user_id",
          user.id
        );

    if (cacheSaveError) {
      console.error(
        "Could not update Outlook token cache:",
        cacheSaveError
      );
    }

    /*
     * Request the FULL message body.
     * Microsoft Graph will return body
     * in plain text because of the
     * Prefer header below.
     */
    const messagesUrl =
      new URL(
        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"
      );

    messagesUrl.searchParams.set(
      "$top",
      "10"
    );

    messagesUrl.searchParams.set(
      "$select",
      [
        "id",
        "subject",
        "from",
        "receivedDateTime",
        "bodyPreview",
        "body",
        "isRead",
      ].join(",")
    );

    messagesUrl.searchParams.set(
      "$orderby",
      "receivedDateTime desc"
    );

    const graphResponse =
      await fetch(
        messagesUrl.toString(),
        {
          headers: {
            Authorization:
              `Bearer ${tokenResult.accessToken}`,

            Accept:
              "application/json",

            Prefer:
              'outlook.body-content-type="text"',
          },

          cache:
            "no-store",
        }
      );

    if (!graphResponse.ok) {
      const body =
        await graphResponse.text();

      console.error(
        "Microsoft Graph messages error:",
        graphResponse.status,
        body
      );

      throw new Error(
        "Could not read Outlook messages."
      );
    }

    const result =
      await graphResponse.json() as {
        value:
          GraphMessage[];
      };

    const messages =
      result.value.map(
        (message) => {
          const subject =
            repairMojibake(
              message.subject ||
                "(No subject)"
            );

          const outerFromName =
            repairMojibake(
              message.from
                ?.emailAddress
                ?.name ||
                message.from
                  ?.emailAddress
                  ?.address ||
                "Unknown sender"
            );

          const outerFromAddress =
            message.from
              ?.emailAddress
              ?.address ||
            null;

          const body =
            repairMojibake(
              message.body
                ?.content ||
                message.bodyPreview ||
                ""
            );

          const parsed =
            parseForwardedEmail({
              subject,

              fromName:
                outerFromName,

              fromAddress:
                outerFromAddress,

              body,
            });

          const sender =
            getDisplaySender(
              parsed
            );

          return {
            id:
              message.id,

            subject:
              getDisplaySubject(
                parsed
              ),

            from:
              sender.name,

            fromAddress:
              sender.address,

            receivedAt:
              message
                .receivedDateTime ||
              null,

            originalSentAt:
              parsed
                .originalSentAt,

            body:
              parsed.body,

            preview:
              parsed.body
                .replace(
                  /\s+/g,
                  " "
                )
                .trim()
                .slice(
                  0,
                  260
                ),

            isForwarded:
              parsed
                .isForwarded,

            isRead:
              message.isRead ??
              false,
          };
        }
      );

    return NextResponse.json({
      connected: true,

      account: {
        email:
          connection.email,

        name:
          repairMojibake(
            connection
              .display_name
          ),
      },

      messages,
    });
  } catch (error) {
    console.error(
      "Outlook messages error:",
      error
    );

    if (
      error instanceof
      InteractionRequiredAuthError
    ) {
      return NextResponse.json(
        {
          connected:
            false,

          reconnectRequired:
            true,

          error:
            "Microsoft needs you to reconnect Outlook.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load Outlook messages.",
      },
      {
        status: 500,
      }
    );
  }
}