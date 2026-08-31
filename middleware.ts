import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_CLEAR, SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Gates every `/admin` route behind a signed session cookie.
 *
 * **This is not authorization.** It checks the token's signature only, which is
 * all it can do: the Edge runtime must not open a database connection, so it
 * cannot know whether the session behind the token was revoked. Its job is to
 * stop a signed-out visit rendering admin markup before it redirects — nothing
 * flashes on screen.
 *
 * The real check is the row, verified by `lib/adminSession.ts` on the Node
 * runtime, which every admin page and every admin action calls before doing
 * anything. A session revoked a minute ago still passes here and is refused
 * there.
 */
/**
 * Forces `no-store` on every admin response.
 *
 * `next.config.mjs` sets this too, but Next overrides it with its own
 * `no-cache, must-revalidate` on dynamically rendered routes — verified
 * against `/admin/login`. `no-cache` still permits a shared cache to *store*
 * the response and merely revalidate it; `no-store` is the one that says a
 * proxy may not keep a copy of a signed-in admin page at all.
 *
 * Set here because middleware runs on every matched request and its headers
 * survive onto the response, which is what makes it the last word.
 */
function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The login page must stay reachable without a session, or nobody can get in.
  if (pathname === "/admin/login") {
    const claims = await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    // Already signed in — no reason to show the form again.
    if (claims) {
      return noStore(NextResponse.redirect(new URL("/admin", request.url)));
    }
    return noStore(NextResponse.next());
  }

  const claims = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (claims) return noStore(NextResponse.next());

  const loginUrl = new URL("/admin/login", request.url);
  // Remember where they were headed so a later step can send them back.
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("from", pathname + search);
  }

  const response = noStore(NextResponse.redirect(loginUrl));
  // Clear an invalid/expired cookie so it isn't re-sent on every request.
  // With the path — the cookie is set at `/admin`, and a delete without it
  // targets `/` and silently leaves the cookie in place. See
  // ADMIN_COOKIE_CLEAR in lib/session.ts.
  response.cookies.delete(ADMIN_COOKIE_CLEAR);
  return response;
}

export const config = {
  /**
   * Only `/admin` routes. Next's static assets (`/_next/*`) and files with an
   * extension are outside this prefix, so they're never intercepted.
   */
  matcher: ["/admin", "/admin/:path*"],
};
