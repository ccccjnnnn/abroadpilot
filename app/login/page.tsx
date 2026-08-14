import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}) {
  const { error, message } =
    await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-medium text-gray-400">
          AbroadPilot
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Welcome back
        </h1>

        <p className="mt-2 text-gray-500">
          Sign in to sync your tasks across
          devices.
        </p>

        <form className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-gray-400"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            formAction={login}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800"
          >
            Sign in
          </button>

          <button
            formAction={signup}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}