import { CapabilityCard } from './CapabilityCard.js';
import { useApiResource } from './useApiResource.js';

type TeamsResponse = { teams: Array<{ _id?: string; name: string; mascot?: string; members?: string[] }> };

export default function Teams() {
  const resource = useApiResource<TeamsResponse>('/api/teams');
  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      {resource.status === 'loading' && <p role="status">Loading teams...</p>}
      {resource.status === 'error' && <p role="alert">Unable to load teams: {resource.message}</p>}
      {resource.status === 'success' && resource.data.teams.length === 0 && <p>No teams yet.</p>}
      {resource.status === 'success' && resource.data.teams.length > 0 && (
        <ul className="list-group">
          {resource.data.teams.map((team, index) => (
            <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
              <strong>{team.name}</strong>{team.mascot ? ` · ${team.mascot}` : ''} · {team.members?.length ?? 0} members
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
