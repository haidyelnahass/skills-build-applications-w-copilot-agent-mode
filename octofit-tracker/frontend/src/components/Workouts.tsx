import { CapabilityCard } from './CapabilityCard.js';
import { useApiResource } from './useApiResource.js';

type WorkoutsResponse = { suggestions: Array<{ _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason: string }> };

export default function Workouts() {
  const resource = useApiResource<WorkoutsResponse>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`);
  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      {resource.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
      {resource.status === 'error' && <p role="alert">Unable to load workout suggestions: {resource.message}</p>}
      {resource.status === 'success' && resource.data.suggestions.length === 0 && <p>No workout suggestions yet.</p>}
      {resource.status === 'success' && resource.data.suggestions.length > 0 && (
        <ul className="list-group">
          {resource.data.suggestions.map((workout, index) => (
            <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
              <strong>{workout.title}</strong> · {workout.focus} · {workout.minutes} minutes · {workout.difficulty}
              <p className="mb-0">{workout.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
