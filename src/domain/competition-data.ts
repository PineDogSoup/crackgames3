import type {
  CompetitionData,
  CompetitionEvent,
  CompetitionGroup,
  CompetitionStatus,
  EventId,
  Heat,
  PublishedEventRankingRow,
  PublishedOverallRankingRow,
  ScheduleEvent,
  ScoreEvent,
  ScoringScale,
  Team
} from "./types";

export interface SourceHeat extends Omit<Heat, "teams"> {
  teamIds: string[];
}

export interface SourceScheduleEvent extends Omit<ScheduleEvent, "heats"> {
  heats: SourceHeat[];
}

export interface CompetitionSource {
  teams: Team[];
  events: CompetitionEvent[];
  eventSchedule: SourceScheduleEvent[];
  groups: CompetitionGroup[];
  overallRanking: PublishedOverallRankingRow[];
  scoringScale: ScoringScale;
  statusText: Record<CompetitionStatus, string>;
  eventRankings: Record<EventId, PublishedEventRankingRow[]>;
  scoreEvents: ScoreEvent[];
}

const EXPECTED_EVENT_IDS: EventId[] = ["e1", "e2", "e3"];
const EXPECTED_HEAT_SIZES: Record<EventId, number[]> = {
  e1: [4, 5, 5],
  e2: [3, 3, 4, 4],
  e3: [3, 3, 4, 4]
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertUnique(values: string[], label: string): void {
  assert(new Set(values).size === values.length, `${label} must be unique`);
}

function eventIdForSchedule(source: CompetitionSource, item: SourceScheduleEvent): EventId | null {
  return source.events.find((eventItem) => eventItem.name === item.name)?.id ?? null;
}

export function validateCompetitionSource(source: CompetitionSource): void {
  assert(Array.isArray(source.teams), "teams must be an array");
  assert(source.teams.length === 14, "competition must contain exactly 14 teams");
  assertUnique(source.teams.map((team) => team.id), "team ids");
  assertUnique(source.teams.map((team) => team.name), "team names");
  source.teams.forEach((team, index) => {
    assert(team.order === index + 1, `team ${team.id} must keep stable order ${index + 1}`);
    assert(team.athletes.length === 3, `team ${team.id} must contain exactly 3 athletes`);
  });

  assert(source.events.length === 3, "competition must contain exactly 3 events");
  assertUnique(source.events.map((eventItem) => eventItem.id), "event ids");
  assert(
    EXPECTED_EVENT_IDS.every((eventId) => source.events.some((eventItem) => eventItem.id === eventId)),
    "events must include e1, e2 and e3"
  );

  const validTeamIds = new Set(source.teams.map((team) => team.id));
  source.eventSchedule.forEach((scheduleItem) => {
    const eventId = eventIdForSchedule(source, scheduleItem);
    if (!eventId) {
      assert(scheduleItem.heats.length === 0, `${scheduleItem.name} must not define competition heats`);
      return;
    }

    const expectedSizes = EXPECTED_HEAT_SIZES[eventId];
    assert(
      scheduleItem.heats.map((heat) => heat.teamIds.length).join(",") === expectedSizes.join(","),
      `${eventId} heat sizes must be ${expectedSizes.join("/")}`
    );
    const scheduledTeamIds = scheduleItem.heats.flatMap((heat) => heat.teamIds);
    assert(scheduledTeamIds.length === 14, `${eventId} must schedule all 14 teams`);
    assertUnique(scheduledTeamIds, `${eventId} scheduled team ids`);
    assert(
      scheduledTeamIds.every((teamId) => validTeamIds.has(teamId)),
      `${eventId} contains an unknown team id`
    );
  });

  assert(source.groups.length === 1, "competition must contain exactly one group");
  assert(source.groups[0].slots.length === 5, "team group must contain the five source timeline slots");
  assert(source.scoringScale.firstPlace === 100, "first place must be worth 100 points");
  assert(source.scoringScale.lastPlace === 50, "last place must be worth 50 points");
  assert(source.scoringScale.teamCount === 14, "scoring scale must target 14 teams");
  assert(
    Math.abs(source.scoringScale.interval - 50 / 13) < Number.EPSILON,
    "scoring interval must be 50 / 13"
  );
  EXPECTED_EVENT_IDS.forEach((eventId) => {
    assert(Array.isArray(source.eventRankings[eventId]), `eventRankings.${eventId} must be an array`);
  });
}

export function hydrateCompetition(
  source: CompetitionSource,
  generatedAt = new Date().toISOString()
): CompetitionData {
  validateCompetitionSource(source);
  const teamMap = new Map(source.teams.map((team) => [team.id, team]));
  const eventSchedule: ScheduleEvent[] = source.eventSchedule.map((scheduleItem) => ({
    ...scheduleItem,
    heats: scheduleItem.heats.map((heat) => ({
      ...heat,
      teams: heat.teamIds.map((teamId) => teamMap.get(teamId)).filter((team): team is Team => Boolean(team))
    }))
  }));
  const events = source.events.map((eventItem) => ({
    ...eventItem,
    ranking: source.eventRankings[eventItem.id] ?? eventItem.ranking ?? []
  }));

  return {
    teams: source.teams,
    events,
    eventSchedule,
    groups: source.groups,
    overallRanking: source.overallRanking,
    scoringScale: source.scoringScale,
    statusText: source.statusText,
    eventRankings: source.eventRankings,
    scoreEvents: source.scoreEvents,
    generatedAt
  };
}
