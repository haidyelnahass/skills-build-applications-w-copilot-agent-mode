import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

type InputRecord = Record<string, unknown>;

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

function asRecord(input: unknown): InputRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw badRequest('Request body must be an object');
  return input as InputRecord;
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function activityFocus(type: string): string {
  const normalized = type.trim().toLowerCase();
  if (['run', 'running', 'cycle', 'cycling', 'swim', 'swimming'].includes(normalized)) return 'endurance';
  if (['strength', 'lifting', 'weights'].includes(normalized)) return 'strength';
  if (['walk', 'walking', 'yoga', 'stretching'].includes(normalized)) return 'mobility';
  return normalized;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const body = asRecord(input);
  const { userId, teamId, type, minutes } = body;
  if (!isObjectId(userId) || !isObjectId(teamId)) throw badRequest('Valid userId and teamId are required');
  if (typeof type !== 'string' || !type.trim()) throw badRequest('Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) throw badRequest('Minutes must be at least one');

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw badRequest('Activity user and team must exist');

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = asRecord(input);
  const { name, mascot } = body;
  if (typeof name !== 'string' || !name.trim()) throw badRequest('Team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw badRequest('Team mascot is required');

  const members = body.members ?? [];
  if (!Array.isArray(members) || members.some((member) => !isObjectId(member))) {
    throw badRequest('Team members must be valid user IDs');
  }
  const memberIds = [...new Set(members)];
  const existingMembers = memberIds.length
    ? await User.find({ _id: { $in: memberIds } }).select('_id team').lean()
    : [];
  if (existingMembers.length !== memberIds.length) throw badRequest('All team members must exist');

  const previousTeamIds = [...new Set(existingMembers.map((member) => member.team?.toString()).filter((id): id is string => Boolean(id)))];
  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
  if (memberIds.length) {
    await Team.updateMany({ _id: { $in: previousTeamIds } }, { $pull: { members: { $in: memberIds } } });
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(pointTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: totalsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) throw notFound('User not found');

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal.trim().toLowerCase();
  const recentFocus = recentActivity ? activityFocus(recentActivity.type) : '';
  const priorities = [...new Set([goal, recentFocus].filter(Boolean))];
  workouts.sort((left, right) => {
    const leftPriority = priorities.indexOf(left.focus.trim().toLowerCase());
    const rightPriority = priorities.indexOf(right.focus.trim().toLowerCase());
    return (leftPriority < 0 ? priorities.length : leftPriority) - (rightPriority < 0 ? priorities.length : rightPriority);
  });

  return workouts.map((workout) => {
    const focus = workout.focus.trim().toLowerCase();
    let reason: string;
    if (focus === goal && recentActivity) reason = `Matches your ${user.fitnessGoal} goal and recent ${recentActivity.type} activity.`;
    else if (focus === goal) reason = `Supports your ${user.fitnessGoal} goal.`;
    else if (focus === recentFocus && recentActivity) reason = `Builds on your recent ${recentActivity.type} activity.`;
    else reason = `A complementary ${workout.focus} workout for your ${user.fitnessGoal} goal.`;
    return { ...workout, reason };
  });
}

export { User };
