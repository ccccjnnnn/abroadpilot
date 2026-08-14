import Link from "next/link";

export default function BottomNav() {
  const navItems = [
    {
      href: "/",
      icon: "🏠",
      label: "Home",
    },
    {
      href: "/inbox",
      icon: "✉️",
      label: "Inbox",
    },
    {
      href: "/tasks",
      icon: "✅",
      label: "Tasks",
    },
    {
      href: "/voice",
      icon: "🎙️",
      label: "Voice",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex w-full max-w-md items-stretch px-2 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-gray-600 transition hover:bg-gray-100"
          >
            <span className="text-xl leading-none">
              {item.icon}
            </span>

            <span className="whitespace-nowrap text-[11px] font-medium leading-none">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}