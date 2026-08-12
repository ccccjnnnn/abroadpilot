"use client";

import { useState } from "react";

type Task = {
  id: number;
  title: string;
  completed: boolean;
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Submit course registration",
      completed: false,
    },
    {
      id: 2,
      title: "Email professor",
      completed: false,
    },
    {
      id: 3,
      title: "Complete PRCV copyright",
      completed: false,
    },
  ]);

  const [newTask, setNewTask] = useState("");

  function addTask() {
    const title = newTask.trim();

    if (!title) {
      return;
    }

    const task: Task = {
      id: Date.now(),
      title,
      completed: false,
    };

    setTasks([...tasks, task]);
    setNewTask("");
  }

  function toggleTask(id: number) {
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      )
    );
  }

  function deleteTask(id: number) {
    setTasks(tasks.filter((task) => task.id !== id));
  }

  return (
    <div>
      <div className="mt-8 flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              addTask();
            }
          }}
          placeholder="What do you need to do?"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
        />

        <button
          onClick={addTask}
          className="rounded-xl bg-black px-5 py-3 font-medium text-white"
        >
          Add
        </button>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          My Tasks
        </h2>

        <div className="mt-3 space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                className="h-5 w-5"
              />

              <span
                className={`flex-1 ${
                  task.completed
                    ? "text-gray-400 line-through"
                    : "text-gray-900"
                }`}
              >
                {task.title}
              </span>

              <button
                onClick={() => deleteTask(task.id)}
                className="text-sm text-gray-400 hover:text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            No tasks yet.
          </p>
        )}
      </section>
    </div>
  );
}