import { createClient } from "@/lib/supabase/server";
import { getActiveNodes } from "@/lib/data/nodes";
import { getCurrentUserFavorites } from "@/lib/data/favorites";
import { FavoritesList } from "@/components/features/FavoritesList";
import { AddFavoriteForm } from "@/components/features/AddFavoriteForm";
import { T } from "@/components/i18n/T";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [nodes, favorites] = await Promise.all([getActiveNodes(), getCurrentUserFavorites()]);
  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="text-xl font-bold">
        <T k="favorites.title" />
      </h1>

      {!user ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          <T k="favorites.signInRequired" />
        </p>
      ) : (
        <>
          <AddFavoriteForm nodes={nodes} />
          {favorites.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              <T k="favorites.empty" />
            </p>
          ) : (
            <FavoritesList favorites={favorites} nodesById={nodesById} showDelete />
          )}
        </>
      )}
    </div>
  );
}
