import BottomNav from "../../components/BottomNav";
import TaskManager from "../../components/TaskManager";

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

          <TaskManager />
        </div>
      </main>

      <BottomNav />
    </>
  );
}