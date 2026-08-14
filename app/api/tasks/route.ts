import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
    };
  }

  return {
    supabase,
    user,
  };
}

/**
 * GET /api/tasks
 * Get all tasks belonging to the current user.
 */
export async function GET() {
  const { supabase, user } =
    await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { data, error } =
    await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        completed,
        source,
        due_date,
        due_text,
        category,
        priority,
        created_at,
        completed_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Could not load tasks:",
      error
    );

    return Response.json(
      {
        error: "Could not load tasks.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    tasks: data ?? [],
  });
}

/**
 * POST /api/tasks
 * Create a manual task.
 */
export async function POST(
  request: NextRequest
) {
  const { supabase, user } =
    await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const body = await request.json();

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  if (!title) {
    return Response.json(
      {
        error: "Task title is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (title.length > 500) {
    return Response.json(
      {
        error: "Task title is too long.",
      },
      {
        status: 400,
      }
    );
  }

  const { data, error } =
    await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title,
        completed: false,
        source: "manual",
      })
      .select(
        `
        id,
        title,
        completed,
        source,
        due_date,
        due_text,
        category,
        priority,
        created_at,
        completed_at
        `
      )
      .single();

  if (error) {
    console.error(
      "Could not create task:",
      error
    );

    return Response.json(
      {
        error: "Could not create task.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json(
    {
      task: data,
    },
    {
      status: 201,
    }
  );
}

/**
 * PATCH /api/tasks
 * Toggle / update a task.
 */
export async function PATCH(
  request: NextRequest
) {
  const { supabase, user } =
    await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const body = await request.json();

  const id =
    typeof body.id === "string"
      ? body.id
      : "";

  const completed =
    body.completed;

  if (
    !id ||
    typeof completed !== "boolean"
  ) {
    return Response.json(
      {
        error: "Invalid task update.",
      },
      {
        status: 400,
      }
    );
  }

  const { data, error } =
    await supabase
      .from("tasks")
      .update({
        completed,
        completed_at: completed
          ? new Date().toISOString()
          : null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select(
        `
        id,
        title,
        completed,
        source,
        due_date,
        due_text,
        category,
        priority,
        created_at,
        completed_at
        `
      )
      .single();

  if (error) {
    console.error(
      "Could not update task:",
      error
    );

    return Response.json(
      {
        error: "Could not update task.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    task: data,
  });
}

/**
 * DELETE /api/tasks?id=...
 */
export async function DELETE(
  request: NextRequest
) {
  const { supabase, user } =
    await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const url =
    new URL(request.url);

  const id =
    url.searchParams.get("id");

  if (!id) {
    return Response.json(
      {
        error: "Task ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  const { error } =
    await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

  if (error) {
    console.error(
      "Could not delete task:",
      error
    );

    return Response.json(
      {
        error: "Could not delete task.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    success: true,
  });
}