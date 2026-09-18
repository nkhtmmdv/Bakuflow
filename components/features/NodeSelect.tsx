"use client";

import { useId } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { TransportNode } from "@/types/database";

export function nodeName(node: Pick<TransportNode, "name_az" | "name_ru">, locale: string): string {
  return locale === "ru" ? node.name_ru : node.name_az;
}

export function NodeSelect({
  label,
  nodes,
  value,
  onChange,
  placeholder,
  name,
  required,
}: {
  label: string;
  nodes: TransportNode[];
  value: string;
  onChange: (nodeId: string) => void;
  placeholder: string;
  name?: string;
  required?: boolean;
}) {
  const { locale } = useI18n();
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        <option value="">{placeholder}</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {nodeName(node, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
