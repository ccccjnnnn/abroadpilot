import BottomNav from "../../components/BottomNav";
import OutlookInbox from "../../components/OutlookInbox";

export default function InboxPage() {
  return (
    <>
      <main className="min-h-screen bg-gray-50 px-5 pb-32 pt-10">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-medium text-gray-400">
            AbroadPilot
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Inbox
          </h1>

          <p className="mt-2 leading-6 text-gray-600">
            Your school emails, organized into
            important messages, deadlines, and tasks.
          </p>

          <OutlookInbox />
        </div>
      </main>

      <BottomNav />
    </>
  );
}