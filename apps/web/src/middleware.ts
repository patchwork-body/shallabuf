import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";

const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "fr"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
});

// export async function middleware(request: NextRequest) {
//   if (!request.nextUrl.pathname.endsWith("/login") && !user) {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   return response;
// }

export const config = {
  matcher: [
    "/((?!_next/static|api|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
