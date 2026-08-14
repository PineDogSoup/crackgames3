import type {
  CompetitionEvent,
  EntryHeat,
  EventId,
  EventRankingRow,
  FlatScheduleRow,
  Heat,
  OverallRankingRow,
  ScheduleEvent,
  ScoreEntryParts,
  ScoreEvent,
  Scores,
  ScoringScale,
  Team
} from "./types";

const RESEED_HEAT_SIZES = [3, 3, 4, 4];
const SECONDARY_TIME_EVENTS: EventId[] = ["e2", "e3"];
const TIEBREAK_EVENTS: EventId[] = ["e2", "e3"];
const COMPLETION_REPS: Partial<Record<EventId, number>> = {
  e2: 132,
  e3: 208
};
const LANE_STARTS: Record<EventId, number> = {
  e1: 1,
  e2: 1,
  e3: 2
};

interface ScoreParts {
  primary: string;
  scoreTime: string;
  tiebreak: string;
}

interface ComparableScore {
  completed: boolean;
  primary: number;
  secondary?: number;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeScores(scores: Scores = {}): Scores {
  return clone(scores);
}

export function scoresFromScoreEvents(scoreEvents: ScoreEvent[] = []): Scores {
  return scoreEvents.reduce<Scores>((map, eventItem) => {
    const eventScores: Record<string, string> = {};
    eventItem.rows.forEach((row) => {
      if (row.score) {
        eventScores[row.id] = normalizeScore(eventItem.id, row.score);
      }
    });
    map[eventItem.id] = eventScores;
    return map;
  }, {});
}

function getScore(scores: Scores, eventId: EventId, teamId: string): string {
  return scores[eventId]?.[teamId] ?? "";
}

export function getLaneLabel(eventId: EventId, index: number): string {
  return `lane ${LANE_STARTS[eventId] + index}`;
}

export function setScore(scores: Scores, eventId: EventId, teamId: string, value: string): Scores {
  const nextScores = normalizeScores(scores);
  nextScores[eventId] = nextScores[eventId] ?? {};
  nextScores[eventId]![teamId] = normalizeScore(eventId, value);
  return nextScores;
}

export function setScorePrimary(scores: Scores, eventId: EventId, teamId: string, value: string): Scores {
  const nextScores = normalizeScores(scores);
  const current = splitScoreText(eventId, getScore(nextScores, eventId, teamId));
  nextScores[eventId] = nextScores[eventId] ?? {};
  nextScores[eventId]![teamId] = formatScoreFromParts(eventId, value, current.scoreTime, current.tiebreak);
  return nextScores;
}

export function setScoreTime(scores: Scores, eventId: EventId, teamId: string, value: string): Scores {
  const nextScores = normalizeScores(scores);
  const current = splitScoreText(eventId, getScore(nextScores, eventId, teamId));
  nextScores[eventId] = nextScores[eventId] ?? {};
  nextScores[eventId]![teamId] = formatScoreFromParts(eventId, current.primary, value, current.tiebreak);
  return nextScores;
}

export function setScoreTiebreak(scores: Scores, eventId: EventId, teamId: string, value: string): Scores {
  const nextScores = normalizeScores(scores);
  const current = splitScoreText(eventId, getScore(nextScores, eventId, teamId));
  nextScores[eventId] = nextScores[eventId] ?? {};
  nextScores[eventId]![teamId] = formatScoreFromParts(eventId, current.primary, current.scoreTime, value);
  return nextScores;
}

function parseTimeToSeconds(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseNumbers(value: string): number[] {
  return (value.match(/\d+(\.\d+)?/g) ?? []).map(Number);
}

function normalizeSpaces(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isTiebreakEvent(eventId: EventId): boolean {
  return TIEBREAK_EVENTS.includes(eventId);
}

function hasSecondaryTime(eventId: EventId): boolean {
  return SECONDARY_TIME_EVENTS.includes(eventId);
}

function firstNumberText(value: string): string {
  return value.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
}

function firstTimeText(value: string): string {
  return value.match(/\d{1,2}:\d{2}/)?.[0] ?? "";
}

function normalizePrimaryScore(eventId: EventId, value: string): string {
  const text = normalizeSpaces(value);
  if (!text) return "";

  if (eventId === "e1") {
    const timeMatch = text.match(/\d{1,2}:\d{2}/);
    const calMatch = text.match(/(\d+(?:\.\d+)?)\s*cal/i);

    if (timeMatch) {
      const prefixNumber = firstNumberText(text.slice(0, timeMatch.index));
      if (prefixNumber) return `${prefixNumber} Cal / ${timeMatch[0]}`;
      if (calMatch) return `${calMatch[1]} Cal / ${timeMatch[0]}`;
      return timeMatch[0];
    }

    const calories = calMatch?.[1] ?? firstNumberText(text);
    return calories ? `${calories} Cal` : text;
  }

  const repsMatch = text.match(/(\d+(?:\.\d+)?)\s*reps?/i);
  if (repsMatch) return `${repsMatch[1]} reps`;
  if (firstTimeText(text)) return "";

  const reps = firstNumberText(text);
  return reps ? `${reps} reps` : text;
}

function normalizeTiebreak(value: string): string {
  return firstTimeText(value);
}

function normalizeScoreTime(value: string): string {
  return firstTimeText(value);
}

function getCompletionRepsText(eventId: EventId): string {
  const reps = COMPLETION_REPS[eventId];
  return reps ? `${reps} reps` : "";
}

function stripTextRange(value: string, start: number, end: number): string {
  return normalizeSpaces(`${value.slice(0, start)} ${value.slice(end)}`).replace(/\s*\/\s*$/, "");
}

function stripFirstTimeText(value: string): string {
  const match = value.match(/\d{1,2}:\d{2}/);
  if (!match || match.index === undefined) return normalizeSpaces(value);
  return stripTextRange(value, match.index, match.index + match[0].length);
}

function takeLabeledTiebreak(text: string): { text: string; tiebreak: string } {
  const matches = [...text.matchAll(/(?:^|[\s/])(?:tb|tiebreak|tie[-\s]?break|破同分|同分)\s*[:：]?\s*(\d{1,2}:\d{2})/gi)];
  const match = matches.at(-1);
  if (!match || match.index === undefined) return { text, tiebreak: "" };

  return {
    text: stripTextRange(text, match.index, match.index + match[0].length),
    tiebreak: match[1]
  };
}

function splitScoreText(eventId: EventId, value: string): ScoreParts {
  const text = normalizeSpaces(value);
  if (!text) return { primary: "", scoreTime: "", tiebreak: "" };

  if (!hasSecondaryTime(eventId)) {
    return { primary: normalizePrimaryScore(eventId, text), scoreTime: "", tiebreak: "" };
  }

  const tiebreakResult = takeLabeledTiebreak(text);
  const scoreText = tiebreakResult.text;
  let tiebreak = tiebreakResult.tiebreak;
  let primary = "";
  let scoreTime = "";

  const segments = scoreText.split(/\s*\/\s*/).map(normalizeSpaces).filter(Boolean);
  if (segments.length) {
    primary = normalizePrimaryScore(eventId, segments[0]);
    scoreTime = normalizeScoreTime(segments[1] ?? "");
    if (!tiebreak) tiebreak = normalizeTiebreak(segments[2] ?? "");
  }

  const times = [...scoreText.matchAll(/\d{1,2}:\d{2}/g)];
  if (!scoreTime && times.length) scoreTime = times[0][0];
  if (!tiebreak && times.length > 1) tiebreak = times[1][0];

  if (!primary) primary = normalizePrimaryScore(eventId, stripFirstTimeText(scoreText));
  if (!primary && scoreTime) primary = getCompletionRepsText(eventId);

  return { primary, scoreTime, tiebreak };
}

function formatScoreFromParts(
  eventId: EventId,
  primary: string,
  scoreTime: string,
  tiebreak: string
): string {
  const safePrimary = normalizePrimaryScore(eventId, primary);
  const safeScoreTime = hasSecondaryTime(eventId) ? normalizeScoreTime(scoreTime) : "";
  const safeTiebreak = isTiebreakEvent(eventId) ? normalizeTiebreak(tiebreak) : "";
  const resolvedPrimary = safePrimary || (safeScoreTime ? getCompletionRepsText(eventId) : "");
  const parts: string[] = [];

  if (resolvedPrimary) parts.push(resolvedPrimary);
  if (safeScoreTime) parts.push(safeScoreTime);
  if (safeTiebreak) parts.push(`TB ${safeTiebreak}`);

  return parts.join(" / ");
}

export function normalizeScore(eventId: EventId, value: string): string {
  const parts = splitScoreText(eventId, value);
  return formatScoreFromParts(eventId, parts.primary, parts.scoreTime, parts.tiebreak);
}

export function formatDisplayScore(eventId: EventId, value: string): string {
  const normalizedScore = normalizeScore(eventId, value);
  const parts = splitScoreText(eventId, normalizedScore);
  if (!parts.primary) return "";

  if (eventId === "e1") return firstTimeText(normalizedScore) || parts.primary;

  const reps = parseReps(parts.primary);
  const completed = reps >= (COMPLETION_REPS[eventId] ?? Number.POSITIVE_INFINITY) && parts.scoreTime;
  return completed ? parts.scoreTime : parts.primary;
}

function stripEntryUnit(eventId: EventId, value: string): string {
  const text = normalizeSpaces(value);
  if (eventId === "e1") return normalizeSpaces(text.replace(/\s*cal\b/gi, ""));
  return normalizeSpaces(text.replace(/\s*reps?\b/gi, ""));
}

export function getScoreEntryParts(eventId: EventId, score: string): ScoreEntryParts {
  const parts = splitScoreText(eventId, score);
  return {
    score: stripEntryUnit(eventId, parts.primary),
    scoreTime: parts.scoreTime,
    tiebreak: parts.tiebreak,
    hasScoreTime: hasSecondaryTime(eventId),
    hasTiebreak: isTiebreakEvent(eventId)
  };
}

function hasPrimaryScore(eventId: EventId, score: string): boolean {
  return Boolean(splitScoreText(eventId, score).primary);
}

function parseCalories(value: string): number {
  return Number(value.match(/(\d+(?:\.\d+)?)\s*cal/i)?.[1] ?? 0);
}

function parseReps(value: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)\s*reps?/i);
  if (match) return Number(match[1]);
  return parseNumbers(value)[0] ?? 0;
}

function comparableScore(eventId: EventId, score: string): ComparableScore | null {
  const text = normalizeScore(eventId, score);
  if (!text) return null;

  if (eventId === "e1") {
    const time = parseTimeToSeconds(text);
    const calories = parseCalories(text);
    const completed = time !== null;
    return {
      completed,
      primary: completed ? -time : calories,
      secondary: completed ? calories : 0
    };
  }

  const parts = splitScoreText(eventId, text);
  if (!parts.primary) return null;

  const reps = parseReps(parts.primary);
  const scoreTime = parseTimeToSeconds(parts.scoreTime);
  const tiebreak = parseTimeToSeconds(parts.tiebreak);
  const completed = reps >= (COMPLETION_REPS[eventId] ?? Number.POSITIVE_INFINITY) && scoreTime !== null;

  if (completed) {
    return {
      completed: true,
      primary: -scoreTime,
      secondary: tiebreak !== null ? -tiebreak : Number.NEGATIVE_INFINITY
    };
  }

  return {
    completed: false,
    primary: reps,
    secondary: tiebreak !== null ? -tiebreak : Number.NEGATIVE_INFINITY
  };
}

function pointForRank(rank: number, scoringScale: ScoringScale): number {
  return Number((scoringScale.firstPlace - (rank - 1) * scoringScale.interval).toFixed(1));
}

export function getEventRankings(
  eventId: EventId,
  teams: Team[],
  scores: Scores,
  scoringScale: ScoringScale
): EventRankingRow[] {
  return teams
    .map((team) => ({
      team,
      score: normalizeScore(eventId, getScore(scores, eventId, team.id)),
      value: comparableScore(eventId, getScore(scores, eventId, team.id))
    }))
    .filter((row): row is { team: Team; score: string; value: ComparableScore } => row.value !== null)
    .sort((a, b) => {
      if (a.value.completed !== b.value.completed) return a.value.completed ? -1 : 1;
      if (a.value.primary !== b.value.primary) return b.value.primary - a.value.primary;
      const aSecondary = a.value.secondary ?? 0;
      const bSecondary = b.value.secondary ?? 0;
      if (aSecondary !== bSecondary) return bSecondary - aSecondary;
      return a.team.order - b.team.order;
    })
    .map((row, index) => ({
      rank: index + 1,
      team: row.team,
      score: formatDisplayScore(eventId, row.score),
      points: pointForRank(index + 1, scoringScale)
    }));
}

function getReseededTeams(
  sourceEventId: EventId,
  teams: Team[],
  scores: Scores,
  scoringScale: ScoringScale
): Team[] {
  const rankedTeams = getEventRankings(sourceEventId, teams, scores, scoringScale).map((row) => row.team);
  const rankedIds = new Set(rankedTeams.map((team) => team.id));
  const unrankedTeams = teams.filter((team) => !rankedIds.has(team.id));
  return [...unrankedTeams, ...rankedTeams.reverse()];
}

function getLanePriorityIndexes(eventId: EventId, heatSize: number): number[] {
  if (eventId === "e1") return Array.from({ length: heatSize }, (_, index) => index);

  const centerOutIndexes = [1, 2, 0, 3];
  const used = new Set<number>();
  const priorityIndexes = centerOutIndexes.filter((index) => {
    if (index >= heatSize || used.has(index)) return false;
    used.add(index);
    return true;
  });

  for (let index = 0; index < heatSize; index += 1) {
    if (!used.has(index)) priorityIndexes.push(index);
  }
  return priorityIndexes;
}

function arrangeTeamsByLanePriority(eventId: EventId, heatTeams: Team[]): Team[] {
  if (eventId === "e1") return heatTeams;

  const lanePriorityIndexes = getLanePriorityIndexes(eventId, heatTeams.length);
  const laneTeams: Team[] = [];
  heatTeams.slice().reverse().forEach((team, index) => {
    laneTeams[lanePriorityIndexes[index] ?? index] = team;
  });
  return laneTeams.filter(Boolean);
}

function splitTeamsForHeats(
  eventId: EventId,
  teamList: Team[],
  heatTemplates: Heat[],
  arrangeLanes: boolean
): Heat[] {
  let offset = 0;
  return heatTemplates.map((heat, index) => {
    const size = heat.size ?? heat.teamIds?.length ?? RESEED_HEAT_SIZES[index] ?? heat.teams.length;
    const heatTeams = teamList.slice(offset, offset + size);
    offset += size;
    return {
      ...heat,
      size,
      teams: arrangeLanes ? arrangeTeamsByLanePriority(eventId, heatTeams) : heatTeams
    };
  });
}

export function getEventHeats(
  eventId: EventId,
  events: CompetitionEvent[],
  eventSchedule: ScheduleEvent[],
  teams: Team[],
  scores: Scores,
  scoringScale: ScoringScale
): Heat[] {
  const eventItem = events.find((item) => item.id === eventId);
  if (!eventItem) return [];
  const baseHeats = eventSchedule.find((item) => item.name === eventItem.name)?.heats ?? [];
  if (eventId === "e1") return baseHeats;

  const sourceRanking = getEventRankings("e1", teams, scores, scoringScale);
  return splitTeamsForHeats(
    eventId,
    getReseededTeams("e1", teams, scores, scoringScale),
    baseHeats,
    sourceRanking.length > 0
  );
}

export function getOverallRankings(
  events: CompetitionEvent[],
  teams: Team[],
  scores: Scores,
  scoringScale: ScoringScale
): OverallRankingRow[] {
  return teams
    .map((team) => {
      const eventPoints = events.reduce<Record<EventId, number>>(
        (points, eventItem) => {
          const found = getEventRankings(eventItem.id, teams, scores, scoringScale).find(
            (row) => row.team.id === team.id
          );
          points[eventItem.id] = found?.points ?? 0;
          return points;
        },
        { e1: 0, e2: 0, e3: 0 }
      );
      return {
        team,
        eventPoints,
        total: eventPoints.e1 + eventPoints.e2 + eventPoints.e3
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.team.order - b.team.order)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      total: Number(row.total.toFixed(1))
    }));
}

export function getEntryHeats(
  activeEventId: EventId,
  events: CompetitionEvent[],
  eventSchedule: ScheduleEvent[],
  teams: Team[],
  scores: Scores,
  scoringScale: ScoringScale
): EntryHeat[] {
  const ranking = getEventRankings(activeEventId, teams, scores, scoringScale);
  return getEventHeats(activeEventId, events, eventSchedule, teams, scores, scoringScale).map((heat) => {
    const entered = heat.teams.filter((team) => hasPrimaryScore(activeEventId, getScore(scores, activeEventId, team.id))).length;
    const status = entered === 0
      ? { label: "未录入", cls: "pending" as const }
      : entered < heat.teams.length
        ? { label: `${entered}/${heat.teams.length}`, cls: "partial" as const }
        : { label: "已完成", cls: "done" as const };

    return {
      ...heat,
      status,
      rows: heat.teams.map((team, index) => {
        const rankRow = ranking.find((row) => row.team.id === team.id);
        const entryParts = getScoreEntryParts(activeEventId, getScore(scores, activeEventId, team.id));
        return {
          id: team.id,
          lane: getLaneLabel(activeEventId, index),
          teamName: team.name,
          score: entryParts.score,
          scoreInput: entryParts.score,
          scoreTime: entryParts.scoreTime,
          scoreTimeInput: entryParts.scoreTime,
          tiebreak: entryParts.tiebreak,
          tiebreakInput: entryParts.tiebreak,
          hasScoreTime: entryParts.hasScoreTime,
          hasTiebreak: entryParts.hasTiebreak,
          rank: rankRow ? `#${rankRow.rank}` : "-",
          points: rankRow?.points ?? "待算"
        };
      })
    };
  });
}

export function getScheduleRows(
  events: CompetitionEvent[],
  eventSchedule: ScheduleEvent[],
  teams: Team[],
  scores: Scores,
  scoringScale: ScoringScale
): FlatScheduleRow[] {
  return events.flatMap((eventItem) =>
    getEventHeats(eventItem.id, events, eventSchedule, teams, scores, scoringScale).flatMap((heat) =>
      heat.teams.map((team, index) => ({
        id: `${eventItem.id}-${heat.id}-${team.id}`,
        event: eventItem.name,
        heat: heat.name,
        time: heat.time,
        lane: getLaneLabel(eventItem.id, index),
        team: team.name
      }))
    )
  );
}

export function buildScoreEvents(
  events: CompetitionEvent[],
  eventSchedule: ScheduleEvent[],
  teams: Team[],
  scores: Scores,
  scoringScale: ScoringScale
): ScoreEvent[] {
  return events.map((eventItem) => ({
    ...eventItem,
    rows: getEventHeats(eventItem.id, events, eventSchedule, teams, scores, scoringScale).flatMap((heat) =>
      heat.teams.map((team, index) => {
        const rankRow = getEventRankings(eventItem.id, teams, scores, scoringScale).find(
          (row) => row.team.id === team.id
        );
        return {
          ...team,
          heat: heat.name,
          lane: getLaneLabel(eventItem.id, index),
          time: heat.time,
          scheduleLabel: `${heat.name} · ${getLaneLabel(eventItem.id, index)}`,
          rank: rankRow?.rank ?? "",
          autoPoint: rankRow?.points ?? "待算",
          score: normalizeScore(eventItem.id, getScore(scores, eventItem.id, team.id))
        };
      })
    )
  }));
}
