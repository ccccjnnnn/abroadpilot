import AttentionCard from "../components/AttentionCard";
import TaskItem from "../components/TaskItem";
import BottomNav from "../components/BottomNav";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-gray-50 p-6 pb-28">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold">
            AbroadPilot
          </h1>

          <p className="mt-2 text-gray-600">
            Your AI assistant for studying abroad.
          </p>

          <div className="mt-8">
            <AttentionCard
              title="Course Registration"
              due="Aug 18"
            />
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">
              Today&apos;s Tasks
            </h2>

            <div className="mt-3 space-y-3">
              <TaskItem title="Submit course registration" />
              <TaskItem title="Email professor" />
            </div>
          </section>

          <button className="mt-8 w-full rounded-2xl bg-black px-4 py-4 text-white">
            🎙 Brain Dump
          </button>
        </div>
      </main>

      <BottomNav />
    </>
  );
}