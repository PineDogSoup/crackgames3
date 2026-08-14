import type { Scores } from "../domain/types";
import type {
  ManagerScope,
  ManagerState,
  PublishResult,
  ScheduleDraft
} from "./types";

interface ManagerRequest {
  scope: ManagerScope;
  schedule?: ScheduleDraft;
  scores?: Scores;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/__manage/api/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object"
      && body !== null
      && "error" in body
      && typeof body.error === "string"
      ? body.error
      : "本地管理服务请求失败";
    throw new Error(message);
  }
  return body as T;
}

function payload(
  scope: ManagerScope,
  schedule: ScheduleDraft,
  scores: Scores
): ManagerRequest {
  return scope === "schedule" ? { scope, schedule } : { scope, scores };
}

export function loadManagerState(): Promise<ManagerState> {
  return request<ManagerState>("state");
}

export function saveManagerDraft(
  scope: ManagerScope,
  schedule: ScheduleDraft,
  scores: Scores
): Promise<ManagerState> {
  return request<ManagerState>("save", {
    method: "POST",
    body: JSON.stringify(payload(scope, schedule, scores))
  });
}

export function publishManagerDraft(
  scope: ManagerScope,
  schedule: ScheduleDraft,
  scores: Scores
): Promise<PublishResult> {
  return request<PublishResult>("publish", {
    method: "POST",
    body: JSON.stringify(payload(scope, schedule, scores))
  });
}
