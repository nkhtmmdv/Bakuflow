import { getActiveNodes } from "@/lib/data/nodes";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/features/ReportForm";
import { T } from "@/components/i18n/T";

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const params = await searchParams;
  const nodeParam = typeof params.node === "string" ? params.node : undefined;

  const supabase = await createClient();
  const [nodes, userResult] = await Promise.all([getActiveNodes(), supabase.auth.getUser()]);

  const initialNode = nodeParam
    ? nodes.find((n) => n.id === nodeParam || n.slug === nodeParam)
    : undefined;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="text-xl font-bold">
        <T k="report.title" />
      </h1>
      <ReportForm
        nodes={nodes}
        initialNodeId={initialNode?.id}
        isAuthenticated={!!userResult.data.user}
      />
    </div>
  );
}
