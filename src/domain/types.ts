export type EventId = "e1" | "e2" | "e3";
export type CompetitionStatus = "open" | "next" | "later" | "done";

export interface Team {
  id: string;
  order: number;
  name: string;
  athletes: string[];
}

export interface ScoringScale {
  firstPlace: number;
  lastPlace: number;
  teamCount: number;
  interval: number;
}

export interface EventRankingRow {
  rank: number;
  team: Team;
  score: string;
  points: number;
}

export interface PublishedEventRankingRow {
  rank: number;
  team: string;
  score: string;
  points: number;
}

export interface CompetitionEvent {
  id: EventId;
  icon: string;
  name: string;
  subtitle: string;
  type: string;
  typeName: string;
  category: string;
  scoring: string;
  groups: string;
  window: string;
  cap: string;
  summary: string;
  details: string[];
  ranking: PublishedEventRankingRow[];
}

export interface Heat {
  id: string;
  name: string;
  time: string;
  status: CompetitionStatus;
  statusText: string;
  expanded?: boolean;
  size?: number;
  teamIds?: string[];
  teams: Team[];
}

export interface ScheduleEvent {
  id: string;
  name: string;
  window: string;
  status: CompetitionStatus;
  statusText: string;
  note: string;
  expanded?: boolean;
  heats: Heat[];
}

export interface ScheduleSlot {
  time: string;
  label: string;
  zone: string;
  event: string;
  status: CompetitionStatus;
}

export interface CompetitionGroup {
  id: string;
  name: string;
  note: string;
  badge: string;
  slots: ScheduleSlot[];
}

export interface PublishedOverallRankingRow {
  rank: number;
  team: string;
  e1: number;
  e2: number;
  e3: number;
  total: number;
  status: string;
}

export interface ScoreEventRow extends Team {
  heat: string;
  lane: string;
  time: string;
  scheduleLabel: string;
  rank: number | "";
  autoPoint: number | "待算";
  score: string;
}

export interface ScoreEvent extends CompetitionEvent {
  rows: ScoreEventRow[];
}

export interface CompetitionData {
  teams: Team[];
  events: CompetitionEvent[];
  eventSchedule: ScheduleEvent[];
  groups: CompetitionGroup[];
  overallRanking: PublishedOverallRankingRow[];
  scoringScale: ScoringScale;
  statusText: Record<CompetitionStatus, string>;
  eventRankings: Record<EventId, PublishedEventRankingRow[]>;
  scoreEvents: ScoreEvent[];
  generatedAt: string;
}

export type Scores = Partial<Record<EventId, Record<string, string>>>;

export interface OverallRankingRow {
  rank: number;
  team: Team;
  eventPoints: Record<EventId, number>;
  total: number;
}

export interface ScoreEntryParts {
  score: string;
  scoreTime: string;
  tiebreak: string;
  hasScoreTime: boolean;
  hasTiebreak: boolean;
}

export interface EntryRow extends ScoreEntryParts {
  id: string;
  lane: string;
  teamName: string;
  scoreInput: string;
  scoreTimeInput: string;
  tiebreakInput: string;
  rank: string;
  points: number | "待算";
}

export interface EntryHeat extends Omit<Heat, "status"> {
  status: {
    label: string;
    cls: "pending" | "partial" | "done";
  };
  rows: EntryRow[];
}

export interface FlatScheduleRow {
  id: string;
  event: string;
  heat: string;
  time: string;
  lane: string;
  team: string;
}
