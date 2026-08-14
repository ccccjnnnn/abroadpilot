import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Authenticated user";

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-medium text-gray-400">
          AbroadPilot
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Account connected
        </h1>

        <p className="mt-2 text-gray-500">
          Your account is authenticated with
          Supabase.
        </p>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-400">
            Signed in as
          </p>

          <p className="mt-1 font-medium text-gray-900">
            {email}
          </p>
        </div>

        <form
          action="/auth/signout"
          method="post"
          className="mt-4"
        >
          <button
            type="submit"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}