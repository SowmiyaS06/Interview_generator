import { getLeaderboard } from "@/lib/actions/statistics.action";

const LeaderboardPage = async () => {
  const entries = await getLeaderboard(10);

  return (
    <section className="w-full flex flex-col gap-6">
      <div>
        <h2>Leaderboard</h2>
        <p className="text-light-100">Top performers based on average interview scores.</p>
      </div>

      <div className="w-full">
        {entries.length === 0 ? (
          <p className="text-light-100">No leaderboard data yet.</p>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-12 gap-4 px-2 py-3 border-b border-dark-300 text-sm text-light-100">
              <p className="col-span-2">Rank</p>
              <p className="col-span-6">Candidate</p>
              <p className="col-span-2">Interviews</p>
              <p className="col-span-2 text-right">Score</p>
            </div>

            {entries.map((entry, index) => (
              <div
                key={entry.userId}
                className="grid grid-cols-12 gap-4 px-2 py-4 border-b border-dark-300 last:border-none"
              >
                <p className="col-span-2 font-semibold">#{index + 1}</p>
                <p className="col-span-6 text-lg font-semibold">{entry.name}</p>
                <p className="col-span-2 text-light-100">{entry.interviewCount}</p>
                <p className="col-span-2 text-right text-primary-200 font-semibold">
                  {entry.averageScore}/100
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LeaderboardPage;
