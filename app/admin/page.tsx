import { getAdminAnalytics } from "@/lib/data/admin/analytics";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <span className="text-xs uppercase text-zinc-500">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const analytics = await getAdminAnalytics();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Reports today" value={analytics.reportsToday} />
        <StatCard label="Active users today" value={analytics.activeUsersToday} />
      </div>

      <Section title="Most crowded nodes">
        {analytics.mostCrowded.length === 0 ? (
          <p className="text-sm text-zinc-500">No data yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {analytics.mostCrowded.map((row) => (
              <li key={row.node_id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{row.name_az}</span>
                <span className="text-zinc-500">
                  {row.crowd_level} · {row.report_count} reports
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Top origins">
        {analytics.topOrigins.length === 0 ? (
          <p className="text-sm text-zinc-500">No data yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {analytics.topOrigins.map((row) => (
              <li key={row.node_id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{row.name_az}</span>
                <span className="text-zinc-500">{row.searches} searches</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Top destinations">
        {analytics.topDestinations.length === 0 ? (
          <p className="text-sm text-zinc-500">No data yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {analytics.topDestinations.map((row) => (
              <li key={row.node_id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{row.name_az}</span>
                <span className="text-zinc-500">{row.searches} searches</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Top OD pairs">
        {analytics.topPairs.length === 0 ? (
          <p className="text-sm text-zinc-500">No data yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {analytics.topPairs.map((row, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {row.origin_name_az} → {row.destination_name_az}
                </span>
                <span className="text-zinc-500">{row.searches} searches</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Peak search windows (last 7 days)">
        {analytics.peakWindows.length === 0 ? (
          <p className="text-sm text-zinc-500">No data yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {analytics.peakWindows.map((row, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{new Date(row.window_start).toLocaleString()}</span>
                <span className="text-zinc-500">{row.searches} searches</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
