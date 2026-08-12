import BottomNav from "../../components/BottomNav";

export default function VoicePage() {
  return (
    <>
      <main className="min-h-screen bg-gray-50 p-6 pb-28">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold">
            Brain Dump
          </h1>

          <p className="mt-2 text-gray-600">
            Speak your thoughts. AbroadPilot will organize them.
          </p>

          <div className="mt-20 flex flex-col items-center">
            <button className="flex h-32 w-32 items-center justify-center rounded-full bg-black text-5xl text-white shadow-lg">
              🎙
            </button>

            <p className="mt-6 text-lg font-medium">
              Tap to start talking
            </p>

            <p className="mt-2 max-w-xs text-center text-sm text-gray-500">
              Your voice will be converted into organized tasks.
            </p>
          </div>

          <div className="mt-16 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-400">
              Example
            </p>

            <p className="mt-2 text-sm text-gray-600">
              “Tomorrow I need to email my professor and check my course
              registration.”
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </>
  );
}