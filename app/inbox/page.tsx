import BottomNav from "../../components/BottomNav";

export default function InboxPage() {
  return (
    <>
      <main className="min-h-screen bg-gray-50 p-6 pb-28">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold">
            Inbox
          </h1>

          <p className="mt-2 text-gray-600">
            School emails organized by AI.
          </p>

          <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-500">
                Required
              </span>

              <span className="text-xs text-gray-400">
                Academic
              </span>
            </div>

            <h2 className="mt-3 text-lg font-semibold">
              Course Registration Reminder
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Please complete your course registration before Aug 18.
            </p>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium">
                中文摘要
              </p>

              <p className="mt-1 text-sm text-gray-600">
                学校要求你在 8 月 18 日之前完成课程注册。
              </p>
            </div>

            <button className="mt-5 w-full rounded-xl bg-black px-4 py-3 text-sm text-white">
              Add to Tasks
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </>
  );
}