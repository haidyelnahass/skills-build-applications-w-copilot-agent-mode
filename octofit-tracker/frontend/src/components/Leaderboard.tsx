import { CapabilityCard } from './CapabilityCard.js';
import { useApiResource } from './useApiResource.js';

type LeaderboardResponse = { leaderboard: Array<{ teamName: string; totalPoints: number; rank: number }> };

export default function Leaderboard() {
  const resource = useApiResource<LeaderboardResponse>('/api/leaderboard');
  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals.">
      {resource.status === 'loading' && <p role="status">Loading leaderboard...</p>}
      {resource.status === 'error' && <p role="alert">Unable to load leaderboard: {resource.message}</p>}
      {resource.status === 'success' && resource.data.leaderboard.length === 0 && <p>No rankings yet.</p>}
      {resource.status === 'success' && resource.data.leaderboard.length > 0 && (
        <ol className="list-group list-group-numbered">
          {resource.data.leaderboard.map((entry) => (
            <li className="list-group-item d-flex justify-content-between" key={`${entry.rank}-${entry.teamName}`}>
              <span>{entry.teamName}</span><strong>{entry.totalPoints} points</strong>
            </li>
          ))}
        </ol>
      )}
    </CapabilityCard>
  );
}
