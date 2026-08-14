"use client";

import {
  useEffect,
  useState,
} from "react";

type Task = {
  id: string;
  title: string;
  completed: boolean;

  source:
    | "manual"
    | "voice"
    | "email_auto"
    | "email_manual";

  due_date: string | null;
  due_text: string | null;

  category:
    | "academic"
    | "research"
    | "career"
    | "personal"
    | "admin"
    | "other"
    | null;

  priority:
    | "high"
    | "medium"
    | "low"
    | null;

  created_at: string;
  completed_at: string | null;
};

export default function TaskManager() {
  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [newTask, setNewTask] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isAdding, setIsAdding] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setError(null);
      setIsLoading(true);

      const response =
        await fetch("/api/tasks", {
          cache: "no-store",
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not load tasks."
        );
      }

      setTasks(data.tasks ?? []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Could not load tasks."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function addTask() {
    const title =
      newTask.trim();

    if (!title || isAdding) {
      return;
    }

    try {
      setError(null);
      setIsAdding(true);

      const response =
        await fetch("/api/tasks", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not add task."
        );
      }

      setTasks((currentTasks) => [
        data.task,
        ...currentTasks,
      ]);

      setNewTask("");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Could not add task."
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleTask(
    task: Task
  ) {
    const nextCompleted =
      !task.completed;

    /*
     * Optimistic update:
     * update the UI immediately.
     */
    setTasks((currentTasks) =>
      currentTasks.map(
        (currentTask) =>
          currentTask.id === task.id
            ? {
                ...currentTask,
                completed:
                  nextCompleted,
              }
            : currentTask
      )
    );

    try {
      setError(null);

      const response =
        await fetch("/api/tasks", {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id: task.id,
            completed:
              nextCompleted,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not update task."
        );
      }

      setTasks((currentTasks) =>
        currentTasks.map(
          (currentTask) =>
            currentTask.id === task.id
              ? data.task
              : currentTask
        )
      );
    } catch (error) {
      console.error(error);

      /*
       * API failed:
       * revert the checkbox.
       */
      setTasks((currentTasks) =>
        currentTasks.map(
          (currentTask) =>
            currentTask.id === task.id
              ? task
              : currentTask
        )
      );

      setError(
        error instanceof Error
          ? error.message
          : "Could not update task."
      );
    }
  }

  async function deleteTask(
    task: Task
  ) {
    /*
     * Keep a copy in case
     * the request fails.
     */
    const previousTasks =
      tasks;

    setTasks((currentTasks) =>
      currentTasks.filter(
        (currentTask) =>
          currentTask.id !== task.id
      )
    );

    try {
      setError(null);

      const response =
        await fetch(
          `/api/tasks?id=${encodeURIComponent(
            task.id
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not delete task."
        );
      }
    } catch (error) {
      console.error(error);

      /*
       * Restore tasks if
       * deletion failed.
       */
      setTasks(previousTasks);

      setError(
        error instanceof Error
          ? error.message
          : "Could not delete task."
      );
    }
  }

  return (
    <div>
      <div className="mt-8 flex gap-2">
        <input
          type="text"
          value={newTask}
          disabled={isAdding}
          onChange={(event) =>
            setNewTask(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter"
            ) {
              addTask();
            }
          }}
          placeholder="What do you need to do?"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
        />

        <button
          type="button"
          onClick={addTask}
          disabled={
            isAdding ||
            !newTask.trim()
          }
          className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isAdding
            ? "Adding..."
            : "Add"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            My Tasks
          </h2>

          {!isLoading &&
            tasks.length > 0 && (
              <span className="text-sm text-gray-400">
                {
                  tasks.filter(
                    (task) =>
                      !task.completed
                  ).length
                }{" "}
                remaining
              </span>
            )}
        </div>

        {isLoading ? (
          <div className="mt-4 rounded-xl bg-white p-4 text-sm text-gray-400 shadow-sm">
            Loading tasks...
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={
                    task.completed
                  }
                  onChange={() =>
                    toggleTask(task)
                  }
                  className="h-5 w-5"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={
                      task.completed
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
                    }
                  >
                    {task.title}
                  </p>

                  {task.source !==
                    "manual" && (
                    <p className="mt-1 text-xs text-gray-400">
                      {task.source}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    deleteTask(task)
                  }
                  className="text-sm text-gray-400 transition hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {!isLoading &&
          tasks.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
              <p className="font-medium text-gray-700">
                No tasks yet
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Add your first task
                above.
              </p>
            </div>
          )}
      </section>
    </div>
  );
}