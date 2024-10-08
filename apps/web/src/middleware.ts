import { verifyRequestOrigin } from "lucia";
import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { validateSessionMiddleware } from "./helpers/validate-session-middleware";

const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "fr"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
});

const protectedRoutes = ["/decks", "/"];
const publicRoutes = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  // Compare Origin and X-Forwarded-Host headers for CSRF protection
  if (request.method !== "GET") {
    const originHeader = request.headers.get("Origin");
    const hostHeader = request.headers.get("X-Forwarded-Host");

    if (
      !originHeader ||
      !hostHeader ||
      !verifyRequestOrigin(originHeader, [hostHeader])
    ) {
      return new NextResponse(null, {
        status: 403,
      });
    }
  }

  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);

  const { user, session } = await validateSessionMiddleware();

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (!publicRoutes.some((route) => path.endsWith(route)) && !user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/decks", request.nextUrl));
  }

  return I18nMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|api|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
