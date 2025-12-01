// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin Area"' },
  });
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // proteger apenas /admin e /api/admin
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin")) {
    if (!ADMIN_USER || !ADMIN_PASS) {
      return new NextResponse("Admin auth not configured", { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) return unauthorizedResponse();

    const base64Credentials = authHeader.split(" ")[1];
    let credentials = "";
    try {
      // Edge runtime compat: prefere atob, fallback pra Buffer
      credentials =
        typeof atob === "function"
          ? atob(base64Credentials)
          : Buffer.from(base64Credentials, "base64").toString("utf8");
    } catch (e) {
      return unauthorizedResponse();
    }

    const [user, pass] = credentials.split(":");
    if (user !== ADMIN_USER || pass !== ADMIN_PASS) return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};  