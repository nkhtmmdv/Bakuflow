"use client";

import { useT } from "@/lib/i18n/provider";

export function LoadingState({ label }: { label?: string }) {
  const t = useT();
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-zinc-500">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600" />
      <p className="text-sm">{label ?? t("common.loading")}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-zinc-500">
      <span aria-hidden="true" className="text-3xl">
        🧭
      </span>
      <p className="max-w-xs text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-red-700 dark:text-red-400">
      <span aria-hidden="true" className="text-3xl">
        ⚠️
      </span>
      <p className="max-w-xs text-sm">{message ?? t("common.error")}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
