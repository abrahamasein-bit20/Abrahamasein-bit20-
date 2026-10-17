import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;

  // Keep setup and auth callback reachable even when configuration is incomplete.
  if (path === "/setup" || path === "/auth/callback") return NextResponse.next();

  if (!url || !key) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Supabase middleware auth check failed:", error.message);
      return NextResponse.redirect(new URL("/setup?error=supabase_auth_check", request.url));
    }
    if (!user && path !== "/login") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }
    if (user && path === "/login") return NextResponse.redirect(new URL("/", request.url));
    return response;
  } catch (error) {
    console.error("Workspace middleware invocation failed:", error instanceof Error ? error.message : "Unknown middleware error");
    return NextResponse.redirect(new URL("/setup?error=middleware", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
