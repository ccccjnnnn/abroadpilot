import {
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type EmailRow = {
  id: string;

  subject: string;

  sender_name:
    | string
    | null;

  sender_address:
    | string
    | null;

  received_at:
    | string
    | null;

  original_sent_at:
    | string
    | null;

  body: string;

  is_forwarded:
    boolean;

  summary_zh:
    | string
    | null;

  category:
    | string
    | null;

  importance:
    | string
    | null;

  mandatory:
    | boolean
    | null;

  deadline:
    | string
    | null;

  deadline_text:
    | string
    | null;

  actions:
    unknown;

  analysis_status:
    string;

  analysis_error:
    | string
    | null;

  analyzed_at:
    | string
    | null;

  created_at:
    string;

  updated_at:
    string;
};

export async function GET() {
  const supabase =
    await createSupabaseClient();

  /*
   * Verify the current
   * AbroadPilot user.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
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

  /*
   * Read only this user's
   * imported school emails.
   *
   * RLS already protects the table,
   * and we also explicitly filter
   * by user_id.
   */
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "emails"
      )
      .select(
        `
        id,
        subject,
        sender_name,
        sender_address,
        received_at,
        original_sent_at,
        body,
        is_forwarded,
        summary_zh,
        category,
        importance,
        mandatory,
        deadline,
        deadline_text,
        actions,
        analysis_status,
        analysis_error,
        analyzed_at,
        created_at,
        updated_at
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .order(
        "received_at",
        {
          ascending:
            false,
          nullsFirst:
            false,
        }
      )
      .limit(
        100
      );

  if (error) {
    console.error(
      "Could not load emails:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not load emails.",
      },
      {
        status: 500,
      }
    );
  }

  const emails =
    (
      data ??
      []
    ) as EmailRow[];

  return NextResponse.json({
    emails:
      emails.map(
        (email) => {
          const cleanedBody =
            email.body
              ?.replace(
                /\s+/g,
                " "
              )
              .trim() ||
            "";

          return {
            id:
              email.id,

            subject:
              email.subject,

            sender_name:
              email.sender_name,

            sender_address:
              email.sender_address,

            received_at:
              email.received_at,

            original_sent_at:
              email.original_sent_at,

            preview:
              cleanedBody.slice(
                0,
                280
              ),

            is_forwarded:
              email.is_forwarded,

            summary_zh:
              email.summary_zh,

            category:
              email.category,

            importance:
              email.importance,

            mandatory:
              email.mandatory,

            deadline:
              email.deadline,

            deadline_text:
              email.deadline_text,

            actions:
              email.actions,

            analysis_status:
              email.analysis_status,

            analysis_error:
              email.analysis_error,

            analyzed_at:
              email.analyzed_at,
          };
        }
      ),
  });
}