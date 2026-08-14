import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const RESOURCE_ID = "volc.seedasr.auc";

const SUBMIT_URL =
  "https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit";

const QUERY_URL =
  "https://openspeech.bytedance.com/api/v3/auc/bigmodel/query";

const BUCKET = "voice-temp";

function getEnv() {
  const volcApiKey = process.env.VOLCENGINE_ASR_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!volcApiKey) {
    throw new Error("VOLCENGINE_ASR_API_KEY is missing.");
  }

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing.");
  }

  if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is missing.");
  }

  return {
    volcApiKey,
    supabaseUrl,
    supabaseSecretKey,
  };
}

function getSupabaseAdmin() {
  const { supabaseUrl, supabaseSecretKey } = getEnv();

  const parsedUrl = new URL(supabaseUrl.trim());

  const projectUrl = parsedUrl.origin;

  return createClient(
    projectUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function blockUnsafeProductionUse() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ASR_PRODUCTION_ENABLED !== "true"
  );
}

function buildHeaders(
  apiKey: string,
  taskId: string
) {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
    "X-Api-Resource-Id": RESOURCE_ID,
    "X-Api-Request-Id": taskId,
    "X-Api-Sequence": "-1",
  };
}

export async function POST(request: Request) {
  if (blockUnsafeProductionUse()) {
    return Response.json(
      {
        error:
          "ASR is disabled in production until user authentication is added.",
      },
      {
        status: 403,
      }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    const { volcApiKey } = getEnv();

    const formData = await request.formData();

    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return Response.json(
        {
          error: "Audio file is missing.",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size > 20 * 1024 * 1024) {
      return Response.json(
        {
          error: "Audio file is too large.",
        },
        {
          status: 413,
        }
      );
    }

    const taskId = randomUUID();

    const storagePath =
      `asr/${taskId}.wav`;

    const audioBuffer =
      Buffer.from(
        await audio.arrayBuffer()
      );

    const { error: uploadError } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          storagePath,
          audioBuffer,
          {
            contentType: "audio/wav",
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        "Supabase upload error:",
        uploadError
      );

      return Response.json(
        {
          error:
            "Could not upload temporary audio.",
        },
        {
          status: 500,
        }
      );
    }

    const { data: signedData, error: signedError } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUrl(
          storagePath,
          60 * 60 * 4
        );

    if (
      signedError ||
      !signedData?.signedUrl
    ) {
      await supabase.storage
        .from(BUCKET)
        .remove([storagePath]);

      console.error(
        "Signed URL error:",
        signedError
      );

      return Response.json(
        {
          error:
            "Could not create temporary audio URL.",
        },
        {
          status: 500,
        }
      );
    }

    const submitResponse =
      await fetch(
        SUBMIT_URL,
        {
          method: "POST",

          headers: buildHeaders(
            volcApiKey,
            taskId
          ),

          body: JSON.stringify({
            user: {
              uid: "abroadpilot",
            },

            audio: {
              url: signedData.signedUrl,
              format: "wav",
            },

            request: {
              model_name: "bigmodel",
              enable_itn: true,
              enable_punc: true,
            },
          }),

          cache: "no-store",
        }
      );

    const statusCode =
      submitResponse.headers.get(
        "X-Api-Status-Code"
      );

    const message =
      submitResponse.headers.get(
        "X-Api-Message"
      );

    if (statusCode !== "20000000") {
      await supabase.storage
        .from(BUCKET)
        .remove([storagePath]);

      console.error(
        "Doubao submit error:",
        statusCode,
        message
      );

      return Response.json(
        {
          error:
            message ||
            `ASR submit failed (${statusCode}).`,
        },
        {
          status: 502,
        }
      );
    }

    return Response.json({
      taskId,
      status: "submitted",
    });
  } catch (error) {
    console.error(
      "ASR submit exception:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected ASR error.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET(request: Request) {
  if (blockUnsafeProductionUse()) {
    return Response.json(
      {
        error:
          "ASR is disabled in production until user authentication is added.",
      },
      {
        status: 403,
      }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    const { volcApiKey } = getEnv();

    const url =
      new URL(request.url);

    const taskId =
      url.searchParams.get(
        "taskId"
      );

    if (
      !taskId ||
      !/^[0-9a-f-]{36}$/i.test(taskId)
    ) {
      return Response.json(
        {
          error: "Invalid task ID.",
        },
        {
          status: 400,
        }
      );
    }

    const storagePath =
      `asr/${taskId}.wav`;

    const queryResponse =
      await fetch(
        QUERY_URL,
        {
          method: "POST",

          headers: buildHeaders(
            volcApiKey,
            taskId
          ),

          body: "{}",

          cache: "no-store",
        }
      );

    const statusCode =
      queryResponse.headers.get(
        "X-Api-Status-Code"
      );

    const message =
      queryResponse.headers.get(
        "X-Api-Message"
      );

    if (
      statusCode === "20000001" ||
      statusCode === "20000002"
    ) {
      return Response.json(
        {
          status: "processing",
        },
        {
          status: 202,
        }
      );
    }

    if (statusCode !== "20000000") {
      await supabase.storage
        .from(BUCKET)
        .remove([storagePath]);

      console.error(
        "Doubao query error:",
        statusCode,
        message
      );

      return Response.json(
        {
          error:
            message ||
            `ASR query failed (${statusCode}).`,
        },
        {
          status: 502,
        }
      );
    }

    const data =
      await queryResponse.json();

    const text =
      data?.result?.text ?? "";

    await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);

    return Response.json({
      status: "done",
      text,
    });
  } catch (error) {
    console.error(
      "ASR query exception:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected ASR query error.",
      },
      {
        status: 500,
      }
    );
  }
}