import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <nav className="flex gap-2 overflow-x-auto text-sm font-medium">
        <Link href="/admin" className="rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
          Dashboard
        </Link>
        <Link
          href="/admin/nodes"
          className="rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
        >
          Nodes
        </Link>
        <Link
          href="/admin/routes"
          className="rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
        >
          Routes
        </Link>
      </nav>
      {children}
    </div>
  );
}
