import BottomNav from "../../components/BottomNav";
import VoiceRecorder from "../../components/VoiceRecorder";

export default function VoicePage() {
  return (
    <>
      <main className="min-h-screen bg-gray-50 px-5 pb-32 pt-10">
        <div className="mx-auto w-full max-w-md">
          <div>
            <p className="text-sm font-medium text-gray-400">
              AbroadPilot
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Brain Dump
            </h1>

            <p className="mt-2 leading-6 text-gray-600">
              Speak naturally. We&apos;ll turn your thoughts into something
              actionable.
            </p>
          </div>

          <VoiceRecorder />

          <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">
              Try saying
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              “Tomorrow I need to email my professor, check course
              registration on Friday, and work on my paper this weekend.”
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </>
  );
}