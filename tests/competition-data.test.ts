import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { hydrateCompetition, validateCompetitionSource } from "../src/domain/competition-data";
import type { CompetitionSource } from "../src/domain/competition-data";

const source = JSON.parse(
  readFileSync(new URL("../source-data/competition.json", import.meta.url), "utf8")
) as CompetitionSource;

describe("competition source data", () => {
  it("keeps the complete legacy competition shape", () => {
    expect(() => validateCompetitionSource(source)).not.toThrow();
    expect(source.teams).toHaveLength(14);
    expect(source.events.map((eventItem) => eventItem.id)).toEqual(["e1", "e2", "e3"]);
    expect(source.groups[0].slots).toHaveLength(5);
  });

  it("hydrates team ids into complete Heat teams", () => {
    const data = hydrateCompetition(source, "2026-08-14T00:00:00.000Z");
    const eventOne = data.eventSchedule.find((item) => item.name === "Event 1");

    expect(eventOne?.heats.map((heat) => heat.teams.length)).toEqual([4, 5, 5]);
    expect(eventOne?.heats[0].teams.map((team) => team.name)).toEqual([
      "欢乐豆", "冰燕东升", "杠铃甭老倌", "随变"
    ]);
    expect(data.generatedAt).toBe("2026-08-14T00:00:00.000Z");
  });
});
