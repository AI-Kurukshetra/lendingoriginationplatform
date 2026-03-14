import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function readAllCookies(cookieStore: any) {
  if (typeof cookieStore.getAll === "function") {
    return cookieStore.getAll();
  }
  if (cookieStore && typeof cookieStore[Symbol.iterator] === "function") {
    return Array.from(cookieStore as Iterable<[string, any]>).map(
      ([name, value]) => ({
        name,
        value: typeof value === "string" ? value : value?.value,
      })
    );
  }
  return [];
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
