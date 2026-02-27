import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/actions/auth.action";
import { getAdminOverview } from "@/lib/actions/admin.action";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminPage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const overview = await getAdminOverview();
  if (!overview.authorized) {
    return (
      <section className="flex flex-col gap-4">
        <h2>Admin Dashboard</h2>
        <p className="text-light-100">You do not have access to this page.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2>Admin Dashboard</h2>
        <p className="text-light-100">System overview and cost monitoring.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-border">
          <div className="card p-4">
            <p className="text-sm text-light-100">Users</p>
            <p className="text-2xl font-semibold">{overview.counts.users}</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <p className="text-sm text-light-100">Interviews</p>
            <p className="text-2xl font-semibold">{overview.counts.interviews}</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <p className="text-sm text-light-100">Feedbacks</p>
            <p className="text-2xl font-semibold">{overview.counts.feedbacks}</p>
          </div>
        </div>
      </div>

      <div className="card-border">
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3>Registered Users ({overview.users.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-secondary">
                  <th className="text-left py-3 px-2 text-light-100 font-medium">Name</th>
                  <th className="text-left py-3 px-2 text-light-100 font-medium">Email</th>
                  <th className="text-center py-3 px-2 text-light-100 font-medium">Interviews</th>
                  <th className="text-center py-3 px-2 text-light-100 font-medium">Feedbacks</th>
                  <th className="text-center py-3 px-2 text-light-100 font-medium">Avg Score</th>
                  <th className="text-left py-3 px-2 text-light-100 font-medium">Joined</th>
                  <th className="text-left py-3 px-2 text-light-100 font-medium">Last Activity</th>
                  <th className="text-center py-3 px-2 text-light-100 font-medium">Resume</th>
                </tr>
              </thead>
              <tbody>
                {overview.users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-light-100">
                      No users registered yet.
                    </td>
                  </tr>
                ) : (
                  overview.users.map((user) => (
                    <tr key={user.id} className="border-b border-card-secondary/50 hover:bg-card-secondary/20 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100/10 flex items-center justify-center text-xs font-semibold text-primary-100">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-light-100">{user.email}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                          {user.stats.interviewCount}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-400 font-semibold">
                          {user.stats.feedbackCount}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {user.stats.averageScore > 0 ? (
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${
                            user.stats.averageScore >= 80 
                              ? "bg-green-500/10 text-green-400" 
                              : user.stats.averageScore >= 60 
                              ? "bg-yellow-500/10 text-yellow-400" 
                              : "bg-red-500/10 text-red-400"
                          }`}>
                            {user.stats.averageScore.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-light-100/50">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-light-100 text-xs">
                        {formatDate(user.joinedAt)}
                      </td>
                      <td className="py-3 px-2 text-light-100 text-xs">
                        {formatDateTime(user.lastActivity)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {user.resumeUrl ? (
                          <a
                            href={user.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-100 hover:text-primary-200 text-xs underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-light-100/50 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-border">
          <div className="card p-6 flex flex-col gap-3">
            <h3>Cost Summary</h3>
            <p className="text-light-100">Total cost: ${overview.costs.totalCost.toFixed(4)}</p>
            <p className="text-light-100">Total calls: {overview.costs.totalCalls}</p>
            <p className="text-light-100">Average per call: ${overview.costs.averageCostPerCall.toFixed(4)}</p>
            <p className="text-light-100">
              Interview generation: ${overview.costs.costByOperation.interviewGeneration.toFixed(4)}
            </p>
            <p className="text-light-100">
              Feedback generation: ${overview.costs.costByOperation.feedbackGeneration.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="card-border">
          <div className="card p-6 flex flex-col gap-3">
            <h3>Cache Summary</h3>
            <p className="text-light-100">Entries: {overview.cache.totalEntries}</p>
            <p className="text-light-100">Valid entries: {overview.cache.validEntries}</p>
            <p className="text-light-100">Expired entries: {overview.cache.expiredEntries}</p>
            <p className="text-light-100">Cache hit rate: {overview.cache.hitRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="card-border">
        <div className="card p-6 flex flex-col gap-3">
          <h3>Top API Users</h3>
          {overview.costs.topUsers.length === 0 ? (
            <p className="text-light-100">No cost data available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {overview.costs.topUsers.map((entry) => (
                <div key={entry.userId} className="flex justify-between text-light-100">
                  <span>{entry.userId}</span>
                  <span>${entry.totalCost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminPage;
