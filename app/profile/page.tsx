import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/features/ProfileClient";
import { T } from "@/components/i18n/T";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (await supabase.from("profiles").select("*").eq("id", user.id).single()).data
    : null;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="text-xl font-bold">
        <T k="profile.title" />
      </h1>
      <ProfileClient email={user?.email ?? null} profile={profile} />
    </div>
  );
}
