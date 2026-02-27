import { getLeaderboard } from "@/lib/actions/statistics.action";

const LeaderboardPage = async () => {
  const entries = await getLeaderboard(10);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2>Leaderboard</h2>
        <p className="text-light-100">Top performers based on average interview scores.</p>
      </div>

      <div className="card-border">
        <div className="card p-6">
          {entries.length === 0 ? (
            <p className="text-light-100">No leaderboard data yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {entries.map((entry, index) => (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between border-b border-dark-300 pb-3 last:border-none last:pb-0"
                >
                  <div>
                    <p className="text-lg font-semibold">
                      {index + 1}. {entry.name}
                    </p>
                    <p className="text-sm text-light-100">
                      {entry.interviewCount} interviews
                    </p>
                  </div>
                  <div className="text-primary-200 font-semibold text-lg">
                    {entry.averageScore}/100
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LeaderboardPage;
