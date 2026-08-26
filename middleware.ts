import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Gates every `/admin` route behind a valid session cookie.
 *
 * Enforcement lives here rather than in the pages so a direct URL visit is
 * redirected before any admin markup is produced — nothing flashes on screen.
 * `lib/session.ts` is `jose`-only so it runs on the Edge runtime.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The login page must stay reachable without a session, or nobody can get in.
  if (pathname === "/admin/login") {
    const username = await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    // Already signed in — no reason to show the form again.
    if (username) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  const username = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (username) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  // Remember where they were headed so a later step can send them back.
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("from", pathname + search);
  }

  const response = NextResponse.redirect(loginUrl);
  // Clear an invalid/expired cookie so it isn't re-sent on every request.
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  /**
   * Only `/admin` routes. Next's static assets (`/_next/*`) and files with an
   * extension are outside this prefix, so they're never intercepted.
   */
  matcher: ["/admin", "/admin/:path*"],
};
