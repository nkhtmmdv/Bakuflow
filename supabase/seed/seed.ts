/**
 * Seeds the real transport nodes named in the product spec, plus (only
 * outside production) a couple of clearly-marked DEMO routes so the routing
 * engine has something to search over in development. Real bus/metro
 * routes are never invented here — an admin adds those manually once
 * confirmed against an official source (see README "Adding routes").
 *
 * Usage: npm run seed   (reads .env.local for Supabase credentials)
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { SEED_NODES } from "./nodes";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local before seeding.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function seedNodes(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();

  for (const node of SEED_NODES) {
    const { data, error } = await supabase
      .from("transport_nodes")
      .upsert(
        {
          name_az: node.nameAz,
          name_ru: node.nameRu,
          slug: node.slug,
          type: "metro",
          latitude: node.lat,
          longitude: node.lon,
          active: true,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error) throw new Error(`Failed to seed node ${node.slug}: ${error.message}`);
    slugToId.set(data.slug, data.id);
    console.log(`✓ node ${node.slug}`);
  }

  return slugToId;
}

/**
 * A small loop of DEMO routes connecting a handful of the seeded nodes, so
 * `/trip` has something to return locally. NEVER seeded in production —
 * these travel times are invented for testing, not sourced from any real
 * timetable.
 */
async function seedDemoRoutes(slugToId: Map<string, string>): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping DEMO routes (NODE_ENV=production).");
    return;
  }

  const demoRoutes = [
    {
      code: "DEMO-1",
      nameAz: "DEMO: Dərnəgül — 28 May",
      nameRu: "DEMO: Дарнагюль — 28 Мая",
      type: "metro" as const,
      stops: [
        { slug: "darnagul", minutes: 0 },
        { slug: "nariman-narimanov", minutes: 6 },
        { slug: "elmlar-akademiyasi", minutes: 5 },
        { slug: "28-may", minutes: 4 },
      ],
    },
    {
      code: "DEMO-2",
      nameAz: "DEMO: Dərnəgül — 20 Yanvar (alternative)",
      nameRu: "DEMO: Дарнагюль — 20 Января (альтернатива)",
      type: "bus" as const,
      stops: [
        { slug: "darnagul", minutes: 0 },
        { slug: "azadliq-prospekti", minutes: 9 },
        { slug: "nasimi", minutes: 7 },
        { slug: "memar-acami", minutes: 4 },
        { slug: "20-yanvar", minutes: 3 },
      ],
    },
  ];

  for (const route of demoRoutes) {
    const { data: routeRow, error: routeError } = await supabase
      .from("routes")
      .upsert(
        {
          code: route.code,
          name_az: route.nameAz,
          name_ru: route.nameRu,
          type: route.type,
          active: true,
          is_demo: true,
        },
        { onConflict: "code" },
      )
      .select("id")
      .single();

    if (routeError) throw new Error(`Failed to seed route ${route.code}: ${routeError.message}`);

    // Idempotent re-seed: clear this demo route's stops before re-inserting.
    await supabase.from("route_nodes").delete().eq("route_id", routeRow.id);

    const rows = route.stops.map((stop, index) => {
      const nodeId = slugToId.get(stop.slug);
      if (!nodeId) throw new Error(`Unknown seed node slug: ${stop.slug}`);
      return {
        route_id: routeRow.id,
        node_id: nodeId,
        sequence: index,
        estimated_minutes_from_previous: stop.minutes,
      };
    });

    const { error: nodesError } = await supabase.from("route_nodes").insert(rows);
    if (nodesError) throw new Error(`Failed to seed stops for ${route.code}: ${nodesError.message}`);

    console.log(`✓ DEMO route ${route.code}`);
  }
}

async function main() {
  const slugToId = await seedNodes();
  await seedDemoRoutes(slugToId);
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
