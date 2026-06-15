import { NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE_SECONDS, createAdminSessionValue } from "@/lib/adminAuth";
import { optionalEnv } from "@/lib/env";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  const adminEmail = optionalEnv("ADMIN_EMAIL", "admin@example.com").toLowerCase();
  const adminPassword = optionalEnv("ADMIN_PASSWORD", "change-this-password");

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  response.cookies.set(COOKIE_NAME, createAdminSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });
  return response;
}
