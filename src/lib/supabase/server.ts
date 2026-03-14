import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return readAllCookies(cookieStore);
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can't set cookies, ignore.
          }
        },
      },
    }
  );
}
