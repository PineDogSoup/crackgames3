import type { CompetitionData } from "../domain/types";

export async function loadCompetition(signal?: AbortSignal): Promise<CompetitionData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/competition.json`, {
    cache: "no-cache",
    signal
  });

  if (!response.ok) {
    throw new Error(`赛事数据加载失败 (${response.status})`);
  }

  const data = await response.json() as CompetitionData;
  if (data.teams.length !== 14 || data.events.length !== 3) {
    throw new Error("赛事数据不完整，请重新生成 competition.json");
  }
  return data;
}
