"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { updateProfileLanguage } from "@/lib/actions/profile";
import type { Profile } from "@/types/database";

export function ProfileClient({
  email,
  profile,
}: {
  email: string | null;
  profile: Profile | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (profile) {
      updateProfileLanguage(locale).catch(() => {});
    }
    // Only re-run when the user actively changes locale, not on every profile refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: magicLinkEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    });
    setStatus(error ? "error" : "sent");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!email || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">{t("profile.notSignedIn")}</p>
        <p className="text-sm text-zinc-500">{t("profile.signInHint")}</p>
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={magicLinkEmail}
            onChange={(e) => setMagicLinkEmail(e.target.value)}
            placeholder={t("profile.emailPlaceholder")}
            className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="min-h-[48px] rounded-xl bg-emerald-700 px-4 text-base font-semibold text-white disabled:opacity-50"
          >
            {t("profile.sendLink")}
          </button>
          {status === "sent" && (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
              {t("profile.linkSent")}
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {t("common.error")}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase text-zinc-500">{t("profile.email")}</span>
        <span className="font-medium">{email}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("profile.language")}
        </span>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase text-zinc-500">{t("profile.trustScore")}</span>
        <span className="font-medium">{profile.trust_score.toFixed(2)}</span>
      </div>

      {profile.role === "admin" && (
        <Link
          href="/admin"
          className="min-h-[48px] rounded-xl border border-zinc-300 px-4 py-3 text-center font-medium dark:border-zinc-700"
        >
          {t("profile.adminPanel")}
        </Link>
      )}

      <button
        type="button"
        onClick={signOut}
        className="min-h-[48px] rounded-xl border border-red-300 px-4 text-base font-medium text-red-700 dark:border-red-800 dark:text-red-400"
      >
        {t("common.signOut")}
      </button>
    </div>
  );
}
