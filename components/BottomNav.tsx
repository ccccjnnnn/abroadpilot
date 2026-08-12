import Link from "next/link";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md justify-around px-4 py-3">

        <Link
          href="/"
          className="text-center text-sm"
        >
          <div className="text-xl">
            🏠
          </div>
          <div>Home</div>
        </Link>

        <Link
          href="/inbox"
          className="text-center text-sm"
        >
          <div className="text-xl">
            ✉️
          </div>
          <div>Inbox</div>
        </Link>

        <Link
          href="/tasks"
          className="text-center text-sm"
        >
          <div className="text-xl">
            ✅
          </div>
          <div>Tasks</div>
        </Link>

        <Link
          href="/voice"
          className="text-center text-sm"
        >
          <div className="text-xl">
            🎙
          </div>
          <div>Voice</div>
        </Link>

      </div>
    </nav>
  );
}