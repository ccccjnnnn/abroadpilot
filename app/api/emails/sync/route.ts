import {
  createHash,
} from "node:crypto";

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

export const runtime =
  "nodejs";

/* =========================================================
 * Microsoft Graph types
 * ======================================================= */

type GraphEmailAddress = {
  name?: string | null;
  address?: string | null;
};

type GraphMessage = {
  "@odata.type"?: string;

  id?: string | null;

  internetMessageId?:
    | string
    | null;

  subject?:
    | string
    | null;

  from?: {
    emailAddress?:
      GraphEmailAddress;
  };

  sender?: {
    emailAddress?:
      GraphEmailAddress;
  };

  receivedDateTime?:
    | string
    | null;

  sentDateTime?:
    | string
    | null;

  hasAttachments?:
    boolean;

  bodyPreview?:
    | string
    | null;

  body?: {
    contentType?:
      | string
      | null;

    content?:
      | string
      | null;
  };
};

type GraphMessagePage = {
  value: GraphMessage[];

  "@odata.nextLink"?:
    string;
};

type GraphAttachment = {
  "@odata.type"?:
    string;

  id: string;

  name?:
    | string
    | null;

  contentType?:
    | string
    | null;

  isInline?:
    boolean;

  item?:
    GraphMessage;
};

/*
 * Explicitly define this type.
 *
 * This also fixes:
 *
 * TS7022:
 * 'result' implicitly has type 'any'
 */
type GraphAttachmentPage = {
  value:
    GraphAttachment[];

  "@odata.nextLink"?:
    string;
};

type EmailRow = {
  user_id:
    string;

  outlook_message_id:
    string;

  subject:
    string;

  sender_name:
    string | null;

  sender_address:
    string | null;

  received_at:
    string | null;

  original_sent_at:
    string | null;

  body:
    string;

  is_forwarded:
    boolean;

  updated_at:
    string;
};

/* =========================================================
 * Graph request helper
 * ======================================================= */

async function graphJson<T>(
  url: string,
  accessToken: string,
  preferText = false
): Promise<T> {
  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          Accept:
            "application/json",

          ...(preferText
            ? {
                Prefer:
                  'outlook.body-content-type="text"',
              }
            : {}),
        },

        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    const errorBody =
      await response.text();

    console.error(
      "Microsoft Graph error:",
      response.status,
      errorBody
    );

    throw new Error(
      `Microsoft Graph returned ${response.status}.`
    );
  }

  return (
    await response.json()
  ) as T;
}

/* =========================================================
 * Text helpers
 * ======================================================= */

function decodeHtmlEntities(
  text: string
) {
  return text
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&#(\d+);/g,
      (
        match: string,
        value: string
      ) => {
        const code =
          Number(value);

        if (
          !Number.isFinite(
            code
          )
        ) {
          return match;
        }

        try {
          return String
            .fromCodePoint(
              code
            );
        } catch {
          return match;
        }
      }
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (
        match: string,
        value: string
      ) => {
        const code =
          Number.parseInt(
            value,
            16
          );

        if (
          !Number.isFinite(
            code
          )
        ) {
          return match;
        }

        try {
          return String
            .fromCodePoint(
              code
            );
        } catch {
          return match;
        }
      }
    );
}

function htmlToText(
  html: string
) {
  const withoutHtml =
    html
      .replace(
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style\b[^>]*>[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<br\s*\/?>/gi,
        "\n"
      )
      .replace(
        /<\/p>/gi,
        "\n\n"
      )
      .replace(
        /<\/div>/gi,
        "\n"
      )
      .replace(
        /<\/li>/gi,
        "\n"
      )
      .replace(
        /<[^>]+>/g,
        " "
      );

  return decodeHtmlEntities(
    withoutHtml
  )
    .replace(
      /\r\n/g,
      "\n"
    )
    .replace(
      /[ \t]+\n/g,
      "\n"
    )
    .replace(
      /\n[ \t]+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .replace(
      /[ \t]{2,}/g,
      " "
    )
    .trim();
}

function getMessageBody(
  message: GraphMessage
) {
  const raw =
    repairMojibake(
      message.body
        ?.content ||
        message.bodyPreview ||
        ""
    );

  const contentType =
    message.body
      ?.contentType
      ?.toLowerCase();

  if (
    contentType ===
      "html" ||
    /<[a-z][\s\S]*>/i.test(
      raw
    )
  ) {
    return htmlToText(
      raw
    );
  }

  return raw
    .replace(
      /\r\n/g,
      "\n"
    )
    .trim();
}

function getSender(
  message: GraphMessage
) {
  const emailAddress =
    message.from
      ?.emailAddress ||
    message.sender
      ?.emailAddress;

  const address =
    emailAddress
      ?.address ||
    null;

  const name =
    repairMojibake(
      emailAddress
        ?.name ||
        address ||
        "Unknown sender"
    );

  return {
    name,
    address,
  };
}

function looksLikeForward(
  subject: string
) {
  const cleaned =
    subject.trim();

  return (
    /^(fw|fwd)\s*:/i.test(
      cleaned
    ) ||
    /^(转发|轉寄|轉發)\s*[:：]/i.test(
      cleaned
    )
  );
}

function looksLikeMessageItem(
  item:
    GraphMessage | undefined
) {
  if (!item) {
    return false;
  }

  if (
    item[
      "@odata.type"
    ] ===
    "#microsoft.graph.message"
  ) {
    return true;
  }

  /*
   * Fallback:
   * some responses may omit
   * @odata.type.
   */
  return Boolean(
    item.subject ||
      item.body ||
      item.internetMessageId
  );
}

/* =========================================================
 * Stable ID for imported email
 * ======================================================= */

function createSourceId({
  message,
  body,
}: {
  message: GraphMessage;
  body: string;
}) {
  /*
   * Best ID:
   * original RFC message ID.
   */
  if (
    message.internetMessageId
  ) {
    return (
      "internet:" +
      message.internetMessageId
    );
  }

  /*
   * Fallback:
   * deterministic fingerprint.
   *
   * This prevents the same original
   * email from being imported twice
   * if the user forwards it again
   * later in another batch.
   */
  const sender =
    getSender(
      message
    );

  const fingerprint = [
    message.subject || "",
    sender.address || "",
    message.sentDateTime ||
      "",
    message.receivedDateTime ||
      "",
    body,
  ].join("\n---\n");

  const hash =
    createHash(
      "sha256"
    )
      .update(
        fingerprint,
        "utf8"
      )
      .digest(
        "hex"
      );

  return (
    "fingerprint:" +
    hash
  );
}

/* =========================================================
 * Get full outer message
 * Used for old single-message forwarding
 * ======================================================= */

async function getOuterMessage(
  messageId: string,
  accessToken: string
): Promise<GraphMessage> {
  const url =
    new URL(
      `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(
        messageId
      )}`
    );

  url.searchParams.set(
    "$select",
    [
      "id",
      "internetMessageId",
      "subject",
      "from",
      "sender",
      "receivedDateTime",
      "sentDateTime",
      "body",
      "bodyPreview",
      "hasAttachments",
    ].join(",")
  );

  return graphJson<GraphMessage>(
    url.toString(),
    accessToken,
    true
  );
}

/* =========================================================
 * List attachments
 *
 * Explicit types here fix TS7022.
 * ======================================================= */

async function listAttachments(
  messageId: string,
  accessToken: string
): Promise<
  GraphAttachment[]
> {
  let nextUrl:
    | string
    | null =
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(
      messageId
    )}/attachments`;

  const attachments:
    GraphAttachment[] =
    [];

  while (
    nextUrl !== null
  ) {
    /*
     * Explicit string variable
     * prevents circular inference
     * in strict TypeScript.
     */
    const currentUrl:
      string =
      nextUrl;

    const page:
      GraphAttachmentPage =
      await graphJson<
        GraphAttachmentPage
      >(
        currentUrl,
        accessToken
      );

    attachments.push(
      ...(page.value ?? [])
    );

    nextUrl =
      page[
        "@odata.nextLink"
      ] ?? null;
  }

  return attachments;
}

/* =========================================================
 * Expand itemAttachment -> original email
 * ======================================================= */

async function getExpandedAttachment(
  messageId: string,
  attachmentId: string,
  accessToken: string
): Promise<
  GraphAttachment
> {
  const url =
    new URL(
      `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(
        messageId
      )}/attachments/${encodeURIComponent(
        attachmentId
      )}`
    );

  url.searchParams.set(
    "$expand",
    "microsoft.graph.itemattachment/item"
  );

  return graphJson<
    GraphAttachment
  >(
    url.toString(),
    accessToken
  );
}

/* =========================================================
 * POST /api/emails/sync
 * ======================================================= */

export async function POST() {
  /*
   * 1. Verify current
   * AbroadPilot user.
   */
  const supabase =
    await createSupabaseClient();

  const {
    data: { user },
  } =
    await supabase
      .auth
      .getUser();

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

  /*
   * 2. Load Outlook connection.
   */
  const {
    data:
      connection,
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
        home_account_id,
        encrypted_token_cache
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
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

  if (
    !connection
  ) {
    return NextResponse.json(
      {
        connected:
          false,

        error:
          "Outlook is not connected.",
      },
      {
        status: 409,
      }
    );
  }

  try {
    /*
     * 3. Restore encrypted
     * MSAL token cache.
     */
    const microsoft =
      createMicrosoftClient();

    const serializedCache =
      decryptText(
        connection
          .encrypted_token_cache
      );

    const tokenCache =
      microsoft
        .getTokenCache();

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
        "Microsoft account could not be restored."
      );
    }

    /*
     * Microsoft recommends restoring
     * the cached account by
     * homeAccountId before
     * acquireTokenSilent().
     */
    const tokenResult =
      await microsoft
        .acquireTokenSilent(
          {
            account,

            scopes:
              OUTLOOK_GRAPH_SCOPES,
          }
        );

    if (
      !tokenResult
        .accessToken
    ) {
      throw new Error(
        "Microsoft access token is unavailable."
      );
    }

    const accessToken =
      tokenResult
        .accessToken;

    /*
     * acquireTokenSilent may update
     * the MSAL cache, so save it again.
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

    if (
      cacheSaveError
    ) {
      console.error(
        "Could not update Outlook token cache:",
        cacheSaveError
      );
    }

    /*
     * 4. Read recent Inbox metadata.
     *
     * We don't request all message
     * bodies here.
     */
    const messagesUrl =
      new URL(
        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"
      );

    messagesUrl
      .searchParams
      .set(
        "$top",
        "50"
      );

    messagesUrl
      .searchParams
      .set(
        "$select",
        [
          "id",
          "internetMessageId",
          "subject",
          "from",
          "sender",
          "receivedDateTime",
          "sentDateTime",
          "hasAttachments",
        ].join(",")
      );

    messagesUrl
      .searchParams
      .set(
        "$orderby",
        "receivedDateTime desc"
      );

    const inboxResult:
      GraphMessagePage =
      await graphJson<
        GraphMessagePage
      >(
        messagesUrl.toString(),
        accessToken
      );

    /*
     * Rows we plan to insert.
     */
    const rows:
      EmailRow[] =
      [];

    let batchContainers =
      0;

    let attachedMessagesFound =
      0;

    let singleForwardsFound =
      0;

    let unsupportedEmailAttachments =
      0;

    /*
     * 5. Process recent messages.
     */
    for (
      const outer of
      inboxResult.value
    ) {
      if (!outer.id) {
        continue;
      }

      let importedItemAttachment =
        false;

      /* -------------------------------------------------
       * CASE A
       *
       * Multiple messages forwarded
       * "as attachments"
       * ------------------------------------------------ */

      if (
        outer.hasAttachments
      ) {
        const attachments =
          await listAttachments(
            outer.id,
            accessToken
          );

        const itemAttachments =
          attachments.filter(
            (
              attachment
            ) =>
              attachment[
                "@odata.type"
              ] ===
                "#microsoft.graph.itemAttachment" &&
              !attachment
                .isInline
          );

        if (
          itemAttachments
            .length >
          0
        ) {
          batchContainers +=
            1;
        }

        for (
          const attachment of
          itemAttachments
        ) {
          const expanded =
            await getExpandedAttachment(
              outer.id,
              attachment.id,
              accessToken
            );

          const item =
            expanded.item;

          /*
           * itemAttachment can also
           * contain event/contact.
           *
           * We only want messages.
           */
          if (
            !looksLikeMessageItem(
              item
            )
          ) {
            continue;
          }

          /*
           * TypeScript now knows
           * item exists.
           */
          const originalMessage =
            item as GraphMessage;

          const sender =
            getSender(
              originalMessage
            );

          const body =
            getMessageBody(
              originalMessage
            );

          const subject =
            repairMojibake(
              originalMessage
                .subject ||
                attachment
                  .name ||
                "(No subject)"
            );

          const sourceId =
            createSourceId(
              {
                message:
                  originalMessage,
                body,
              }
            );

          rows.push({
            user_id:
              user.id,

            outlook_message_id:
              sourceId,

            subject,

            sender_name:
              sender.name,

            sender_address:
              sender.address,

            /*
             * For a forwarded original
             * email, use the original
             * mail time, not the time
             * of the wrapper email.
             */
            received_at:
              originalMessage
                .receivedDateTime ||
              originalMessage
                .sentDateTime ||
              outer
                .receivedDateTime ||
              null,

            original_sent_at:
              originalMessage
                .sentDateTime ||
              null,

            body,

            is_forwarded:
              true,

            updated_at:
              new Date()
                .toISOString(),
          });

          attachedMessagesFound +=
            1;

          importedItemAttachment =
            true;
        }

        /*
         * Outlook normally exposes
         * forwarded email attachments
         * as itemAttachment.
         *
         * But report .eml-style
         * fileAttachments if they
         * appear so we know a MIME
         * parser is needed.
         */
        for (
          const attachment of
          attachments
        ) {
          const isFileAttachment =
            attachment[
              "@odata.type"
            ] ===
            "#microsoft.graph.fileAttachment";

          const isEmailFile =
            attachment
              .contentType ===
              "message/rfc822" ||
            attachment
              .name
              ?.toLowerCase()
              .endsWith(
                ".eml"
              ) === true;

          if (
            isFileAttachment &&
            isEmailFile
          ) {
            unsupportedEmailAttachments +=
              1;
          }
        }
      }

      /*
       * If the outer message was just
       * a batch wrapper, don't import
       * that wrapper itself.
       */
      if (
        importedItemAttachment
      ) {
        continue;
      }

      /* -------------------------------------------------
       * CASE B
       *
       * Old single-message Forward.
       *
       * Keep this for backwards
       * compatibility.
       * ------------------------------------------------ */

      const outerSubject =
        repairMojibake(
          outer.subject ||
            ""
        );

      if (
        !looksLikeForward(
          outerSubject
        )
      ) {
        continue;
      }

      /*
       * Only now fetch its full body.
       */
      const fullMessage =
        await getOuterMessage(
          outer.id,
          accessToken
        );

      const outerSender =
        getSender(
          fullMessage
        );

      const fullBody =
        getMessageBody(
          fullMessage
        );

      const parsed =
        parseForwardedEmail(
          {
            subject:
              outerSubject,

            fromName:
              outerSender.name,

            fromAddress:
              outerSender.address,

            body:
              fullBody,
          }
        );

      /*
       * Subject looked forwarded,
       * but body didn't contain a
       * recognizable forwarded
       * message block.
       */
      if (
        !parsed.isForwarded
      ) {
        continue;
      }

      const displaySender =
        getDisplaySender(
          parsed
        );

      /*
       * Build a stable identity
       * from the restored original
       * mail rather than the wrapper.
       */
      const singleFingerprint =
        [
          getDisplaySubject(
            parsed
          ),
          displaySender
            .address ||
            "",
          parsed
            .originalSentAt ||
            "",
          parsed.body,
        ].join(
          "\n---\n"
        );

      const singleHash =
        createHash(
          "sha256"
        )
          .update(
            singleFingerprint,
            "utf8"
          )
          .digest(
            "hex"
          );

      rows.push({
        user_id:
          user.id,

        outlook_message_id:
          `forward:${singleHash}`,

        subject:
          getDisplaySubject(
            parsed
          ),

        sender_name:
          displaySender.name,

        sender_address:
          displaySender.address,

        received_at:
          fullMessage
            .receivedDateTime ||
          null,

        original_sent_at:
          parsed
            .originalSentAt,

        body:
          parsed.body,

        is_forwarded:
          true,

        updated_at:
          new Date()
            .toISOString(),
      });

      singleForwardsFound +=
        1;
    }

    /*
     * 6. Remove duplicates created
     * inside this single Sync run.
     */
    const rowMap =
      new Map<
        string,
        EmailRow
      >();

    for (
      const row of rows
    ) {
      rowMap.set(
        row.outlook_message_id,
        row
      );
    }

    const uniqueRows:
      EmailRow[] =
      Array.from(
        rowMap.values()
      );

    /*
     * Nothing found.
     */
    if (
      uniqueRows.length ===
      0
    ) {
      return NextResponse.json(
        {
          connected:
            true,

          processed:
            0,

          inserted:
            0,

          duplicates:
            0,

          batchContainers,

          attachedMessagesFound,

          singleForwardsFound,

          unsupportedEmailAttachments,
        }
      );
    }

    /*
     * 7. Check database for emails
     * already imported previously.
     *
     * Don't upsert here.
     *
     * Otherwise future Sync operations
     * could accidentally overwrite
     * AI analysis results.
     */
    const ids =
      uniqueRows.map(
        (
          row
        ) =>
          row
            .outlook_message_id
      );

    const {
      data:
        existingData,
      error:
        existingError,
    } =
      await supabase
        .from(
          "emails"
        )
        .select(
          "outlook_message_id"
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "outlook_message_id",
          ids
        );

    if (
      existingError
    ) {
      console.error(
        "Could not check existing emails:",
        existingError
      );

      throw new Error(
        "Could not check existing emails."
      );
    }

    const existingRows =
      (
        existingData ??
        []
      ) as Array<{
        outlook_message_id:
          string;
      }>;

    const existingIds =
      new Set<string>(
        existingRows.map(
          (
            row
          ) =>
            row
              .outlook_message_id
        )
      );

    const newRows:
      EmailRow[] =
      uniqueRows.filter(
        (
          row
        ) =>
          !existingIds.has(
            row
              .outlook_message_id
          )
      );

    /*
     * 8. Insert only new emails.
     */
    if (
      newRows.length >
      0
    ) {
      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "emails"
          )
          .insert(
            newRows
          );

      if (
        insertError
      ) {
        console.error(
          "Could not insert emails:",
          insertError
        );

        throw new Error(
          "Could not save imported emails."
        );
      }
    }

    /*
     * 9. Success.
     */
    return NextResponse.json(
      {
        connected:
          true,

        processed:
          uniqueRows.length,

        inserted:
          newRows.length,

        duplicates:
          uniqueRows.length -
          newRows.length,

        batchContainers,

        attachedMessagesFound,

        singleForwardsFound,

        unsupportedEmailAttachments,
      }
    );
  } catch (error) {
    console.error(
      "Email sync error:",
      error
    );

    /*
     * Microsoft session is no longer
     * silently refreshable.
     */
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
            : "Could not sync school emails.",
      },
      {
        status: 500,
      }
    );
  }
}