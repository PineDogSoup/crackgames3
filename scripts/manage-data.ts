import {
  hydrateCompetition,
  type CompetitionSource,
  type SourceScheduleEvent
} from "../src/domain/competition-data";
import {
  buildScoreEvents,
  getEventHeats,
  getEventRankings,
  getOverallRankings,
  scoresFromScoreEvents
} from "../src/domain/scoreboard";
import type {
  EventId,
  PublishedEventRankingRow,
  PublishedOverallRankingRow,
  Scores
} from "../src/domain/types";
import type { ScheduleDraft } from "../src/manage/types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function buildPublishedEventRankings(
  source: CompetitionSource,
  scores: Scores
): Record<EventId, PublishedEventRankingRow[]> {
  const data = hydrateCompetition(source);
  return source.events.reduce<Record<EventId, PublishedEventRankingRow[]>>(
    (rankings, eventItem) => {
      rankings[eventItem.id] = getEventRankings(
        eventItem.id,
        data.teams,
        scores,
        data.scoringScale
      ).map((row) => ({
        rank: row.rank,
        team: row.team.name,
        score: row.score,
        points: row.points
      }));
      return rankings;
    },
    { e1: [], e2: [], e3: [] }
  );
}

function buildPublishedOverallRanking(
  source: CompetitionSource,
  scores: Scores
): PublishedOverallRankingRow[] {
  const data = hydrateCompetition(source);
  return getOverallRankings(data.events, data.teams, scores, data.scoringScale).map((row) => ({
    rank: row.rank,
    team: row.team.name,
    e1: row.eventPoints.e1,
    e2: row.eventPoints.e2,
    e3: row.eventPoints.e3,
    total: row.total,
    status: "成绩实时"
  }));
}

function buildReseededSchedule(source: CompetitionSource, scores: Scores): SourceScheduleEvent[] {
  const data = hydrateCompetition(source);
  const eventByName = new Map(source.events.map((eventItem) => [eventItem.name, eventItem]));

  return source.eventSchedule.map((scheduleItem) => {
    const eventItem = eventByName.get(scheduleItem.name);
    if (!eventItem) return clone(scheduleItem);

    const derivedHeats = getEventHeats(
      eventItem.id,
      data.events,
      data.eventSchedule,
      data.teams,
      scores,
      data.scoringScale
    );

    return {
      ...clone(scheduleItem),
      heats: scheduleItem.heats.map((heat, index) => ({
        ...clone(heat),
        teamIds: derivedHeats[index]?.teams.map((team) => team.id) ?? heat.teamIds
      }))
    };
  });
}

export function applyScoresToSource(source: CompetitionSource, scores: Scores): CompetitionSource {
  const normalizedScores = clone(scores);
  const hasScores = Object.values(normalizedScores).some((eventScores) =>
    Object.values(eventScores ?? {}).some(Boolean)
  );
  const eventRankings = buildPublishedEventRankings(source, normalizedScores);
  const eventSchedule = buildReseededSchedule(source, normalizedScores);
  const nextBase: CompetitionSource = {
    ...clone(source),
    eventRankings,
    eventSchedule
  };
  const data = hydrateCompetition(nextBase);
  const events = data.events.map((eventItem) => ({
    ...eventItem,
    ranking: eventRankings[eventItem.id]
  }));

  return {
    ...nextBase,
    overallRanking: buildPublishedOverallRanking(nextBase, normalizedScores),
    scoreEvents: hasScores
      ? buildScoreEvents(
        events,
        data.eventSchedule,
        data.teams,
        normalizedScores,
        data.scoringScale
      )
      : []
  };
}

export function applyScheduleToSource(
  source: CompetitionSource,
  schedule: ScheduleDraft
): CompetitionSource {
  const nextSource: CompetitionSource = {
    ...clone(source),
    groups: clone(schedule.groups),
    eventSchedule: clone(schedule.eventSchedule)
  };

  return applyScoresToSource(nextSource, scoresFromScoreEvents(source.scoreEvents));
}
