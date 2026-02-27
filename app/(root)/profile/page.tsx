import { redirect } from "next/navigation";

import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/actions/auth.action";

const ProfilePage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2>Profile & Settings</h2>
        <p className="text-light-100">Manage your personal details and resume.</p>
      </div>
      <ProfileForm user={user} />
    </section>
  );
};

export default ProfilePage;
