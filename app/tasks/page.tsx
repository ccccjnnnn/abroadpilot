import BottomNav from "../../components/BottomNav";
import TaskItem from "../../components/TaskItem";

export default function TasksPage() {
  return (
    <>
      <main className="min-h-screen bg-gray-50 p-6 pb-28">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold">
            Tasks
          </h1>

          <p className="mt-2 text-gray-600">
            Everything you need to get done.
          </p>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">
              Today
            </h2>

            <div className="mt-3 space-y-3">
              <TaskItem title="Submit course registration" />
              <TaskItem title="Email professor" />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">
              Upcoming
            </h2>

            <div className="mt-3 space-y-3">
              <TaskItem title="Complete PRCV copyright" />
            </div>
          </section>

          <button className="mt-8 w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 font-medium">
            + Add Task
          </button>
        </div>
      </main>

      <BottomNav />
    </>
  );
}