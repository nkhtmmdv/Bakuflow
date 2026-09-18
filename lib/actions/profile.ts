"use server";

import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n/locales";

export async function updateProfileLanguage(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ language: locale }).eq("id", user.id);
}
