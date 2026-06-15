import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
