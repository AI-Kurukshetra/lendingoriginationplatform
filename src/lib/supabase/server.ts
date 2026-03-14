import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
