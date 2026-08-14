"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(
    formData.get("email") ?? ""
  ).trim();

  const password = String(
    formData.get("password") ?? ""
  );

  if (!email || !password) {
    redirect(
      "/login?error=Email and password are required"
    );
  }

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/", "layout");

  redirect("/account");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(
    formData.get("email") ?? ""
  ).trim();

  const password = String(
    formData.get("password") ?? ""
  );

  if (!email || !password) {
    redirect(
      "/login?error=Email and password are required"
    );
  }

  if (password.length < 8) {
    redirect(
      "/login?error=Password must be at least 8 characters"
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          `${siteUrl}/auth/callback?next=/account`,
      },
    });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/account");
  }

  redirect(
    "/login?message=Check your email to confirm your account"
  );
}