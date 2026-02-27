import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getUserGamificationProfile } from "@/lib/actions/features.action";
import { getUserStatistics } from "@/lib/actions/statistics.action";

const ProfilePage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Fetch user gamification profile and statistics
  const gamificationResult = await getUserGamificationProfile(user.id);
  const statsResult = await getUserStatistics(user.id);

  const gamificationProfile = gamificationResult?.success ? gamificationResult.profile : null;
  const userStats = statsResult || null;

  return (
    <section className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Profile & Settings</h1>
          <p className="text-lg text-slate-300 mt-3">Manage your personal details, resume, and view your achievements.</p>
        </div>

        {/* User Stats Overview */}
        {gamificationProfile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
            <div className="glass-card p-6 text-center rounded-xl">
              <p className="text-4xl font-bold text-blue-400">{gamificationProfile.level || 1}</p>
              <p className="text-slate-300 text-sm mt-2">Current Level</p>
            </div>
            <div className="glass-card p-6 text-center rounded-xl">
              <p className="text-4xl font-bold text-green-400">{gamificationProfile.totalXP || 0}</p>
              <p className="text-slate-300 text-sm mt-2">Total XP</p>
            </div>
            <div className="glass-card p-6 text-center rounded-xl">
              <p className="text-4xl font-bold text-orange-400">{gamificationProfile.streak || 0}</p>
              <p className="text-slate-300 text-sm mt-2">Day Streak</p>
            </div>
            <div className="glass-card p-6 text-center rounded-xl">
              <p className="text-4xl font-bold text-purple-400">{gamificationProfile.badges?.length || 0}</p>
              <p className="text-slate-300 text-sm mt-2">Badges Earned</p>
            </div>
          </div>
        )}

        {/* Interview Statistics */}
        {userStats && (
          <div className="glass-card p-8 mb-10 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Interview Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#23272f] rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Total Interviews</p>
                <p className="text-3xl font-bold text-white">{userStats.totalInterviews || 0}</p>
              </div>
              <div className="bg-[#23272f] rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Average Score</p>
                <p className="text-3xl font-bold text-white">{userStats.averageScore?.toFixed(1) || "N/A"}</p>
              </div>
              <div className="bg-[#23272f] rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Best Score</p>
                <p className="text-3xl font-bold text-white">{userStats.highestScore || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="glass-card p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-6">Personal Information</h2>
          <ProfileForm user={user} />
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
