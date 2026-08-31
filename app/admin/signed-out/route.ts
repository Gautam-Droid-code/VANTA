import { NextResponse } from "next/server";
import { ADMIN_COOKIE_CLEAR } from "@/lib/session";

/**
 * Clears the admin cookie and sends the browser to the login form.
 *
 * This exists to break a redirect loop that the cookie-path fix alone does not
 * close.
 *
 * The loop: `middleware.ts` runs on the Edge and can only check the token's
 * *signature* — it cannot open a database connection, so it cannot know a
 * session was revoked. The dashboard layout can, and does. So a browser
 * holding a validly-signed token for a revoked session gets:
 *
 *     /admin        → layout sees no valid session → /admin/login
 *     /admin/login  → middleware sees a valid signature → /admin
 *     …forever
 *
 * Sign-out was one way to reach that state (the cookie was deleted at the
 * wrong path and survived — see ADMIN_COOKIE_CLEAR). But it is not the only
 * way: revoking a session from the Security page puts *that* browser into
 * exactly this state on its next navigation, with no cookie bug involved at
 * all. Measured, not assumed: `curl -L` against `/admin` with a valid token
 * and a revoked row redirected six times and was still going.
 *
 * A layout cannot clear a cookie — Server Components have no response headers
 * to write to. A Route Handler can, which is the whole reason this is a route
 * rather than a line in the layout. Middleware waves it through (the signature
 * is still valid), it deletes the cookie, and the redirect that follows finds
 * no cookie and lands on the form.
 *
 * Not an authorization boundary and does not need to be: it only ever removes
 * a credential. Anyone may call it; the worst they can do is sign themselves
 * out.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.delete(ADMIN_COOKIE_CLEAR);
  // Belt and braces: this response must never be cached, or a proxy could
  // serve the clearing redirect to somebody who is legitimately signed in.
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}
