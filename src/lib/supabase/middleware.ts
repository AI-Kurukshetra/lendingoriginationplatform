import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type CookiePair = { name: string; value: string };
type CookieLike = { name: string; value: string | { value?: string } | undefined };
type CookieStoreLike = { getAll?: () => CookieLike[] } | Iterable<[string, string | { value?: string }]>;

function normalizeCookie(name: string, value: string | { value?: string } | undefined): CookiePair {
  return { name, value: typeof value === "string" ? value : value?.value ?? "" };
}

function readAllCookies(cookieStore: CookieStoreLike): CookiePair[] {
  if (typeof cookieStore === "object" && cookieStore !== null && "getAll" in cookieStore && typeof cookieStore.getAll === "function") {
    return cookieStore.getAll().map((item) => normalizeCookie(item.name, item.value));
  }

  try {
    return Array.from(cookieStore as Iterable<[string, string | { value?: string }]>).map(
      ([name, value]) => normalizeCookie(name, value)
    );
  } catch {
    return [];
  }
}

export function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return readAllCookies(request.cookies);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, response };
}
