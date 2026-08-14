import type { CompetitionSource, SourceScheduleEvent } from "../domain/competition-data";
import type { CompetitionGroup, Scores } from "../domain/types";

export type ManagerScope = "schedule" | "scores";

export interface ScheduleDraft {
  groups: CompetitionGroup[];
  eventSchedule: SourceScheduleEvent[];
}

export interface ManagerDraftFile {
  schedule?: ScheduleDraft;
  scores?: Scores;
  savedAt: Partial<Record<ManagerScope, string>>;
}

export interface ManagerGitState {
  branch: string;
  remote: string;
  userName: string;
  userEmail: string;
  dirtyFiles: string[];
  ahead: number;
  behind: number;
  identityConfigured: boolean;
}

export interface ManagerState {
  source: CompetitionSource;
  schedule: ScheduleDraft;
  scores: Scores;
  savedAt: Partial<Record<ManagerScope, string>>;
  git: ManagerGitState;
}

export interface PublishResult {
  message: string;
  commit: string;
  pagesUrl: string;
  actionsUrl: string;
  state: ManagerState;
}

export interface ApiErrorResponse {
  error: string;
}
