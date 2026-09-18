"use client";

import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/provider";
import { NodeSelect } from "@/components/features/NodeSelect";
import { createFavorite } from "@/lib/actions/favorites";
import type { TransportNode } from "@/types/database";

export function AddFavoriteForm({ nodes }: { nodes: TransportNode[] }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !originId || !destinationId || originId === destinationId) {
      setError("invalid");
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("originNodeId", originId);
    formData.set("destinationNodeId", destinationId);

    startTransition(async () => {
      const result = await createFavorite(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setTitle("");
        setOriginId("");
        setDestinationId("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fav-title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("favorites.addTitle")}
        </label>
        <input
          id="fav-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("favorites.addTitlePlaceholder")}
          className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <NodeSelect
        label={t("home.origin")}
        placeholder={t("home.originPlaceholder")}
        nodes={nodes}
        value={originId}
        onChange={setOriginId}
      />
      <NodeSelect
        label={t("home.destination")}
        placeholder={t("home.destinationPlaceholder")}
        nodes={nodes}
        value={destinationId}
        onChange={setDestinationId}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t("common.error")}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="min-h-[48px] rounded-xl bg-emerald-700 px-4 text-base font-semibold text-white disabled:opacity-50"
      >
        {t("common.save")}
      </button>
    </form>
  );
}
