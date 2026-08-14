import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { applyScheduleToSource, applyScoresToSource } from "../scripts/manage-data";
import type { CompetitionSource } from "../src/domain/competition-data";
import { setScore } from "../src/domain/scoreboard";
import type { Scores } from "../src/domain/types";

const source = JSON.parse(
  readFileSync(new URL("../source-data/competition.json", import.meta.url), "utf8")
) as CompetitionSource;

describe("local manager data publishing", () => {
  it("keeps score-derived source sections empty before any score is entered", () => {
    const next = applyScoresToSource(source, {});

    expect(next.scoreEvents).toEqual([]);
    expect(next.overallRanking).toEqual([]);
    expect(next.eventRankings).toEqual({ e1: [], e2: [], e3: [] });
  });

  it("materializes scores, rankings and reseeded Heats in one source update", () => {
    let scores: Scores = {};
    scores = setScore(scores, "e1", "t01", "200 Cal / 18:42");
    scores = setScore(scores, "e1", "t02", "198 Cal");
    scores = setScore(scores, "e2", "t01", "132 reps / 06:18 / TB 05:30");

    const next = applyScoresToSource(source, scores);
    const eventTwoSchedule = next.eventSchedule.find((item) => item.name === "Event 2");

    expect(next.eventRankings.e1.map((row) => row.team)).toEqual(["欢乐豆", "陀螺战队"]);
    expect(next.overallRanking[0]).toMatchObject({ team: "欢乐豆", total: 200 });
    expect(next.scoreEvents).toHaveLength(3);
    expect(next.scoreEvents.find((item) => item.id === "e2")?.rows.find((row) => row.id === "t01")?.score)
      .toBe("132 reps / 06:18 / TB 05:30");
    expect(eventTwoSchedule?.heats.flatMap((heat) => heat.teamIds)).toHaveLength(14);
  });

  it("publishes schedule fields without dropping existing scores", () => {
    const scored = applyScoresToSource(source, setScore({}, "e1", "t01", "200 Cal / 18:42"));
    const schedule = {
      groups: structuredClone(scored.groups),
      eventSchedule: structuredClone(scored.eventSchedule)
    };
    const eventOne = schedule.eventSchedule.find((item) => item.name === "Event 1");
    if (!eventOne) throw new Error("Event 1 schedule was not found");
    eventOne.window = "10:40-12:10";
    eventOne.heats[0].time = "10:50-11:11";

    const next = applyScheduleToSource(scored, schedule);
    const nextEventOne = next.eventSchedule.find((item) => item.name === "Event 1");

    expect(nextEventOne?.window).toBe("10:40-12:10");
    expect(nextEventOne?.heats[0].time).toBe("10:50-11:11");
    expect(next.eventRankings.e1[0].team).toBe("欢乐豆");
    expect(next.scoreEvents.find((item) => item.id === "e1")?.rows.find((row) => row.id === "t01")?.score)
      .toBe("200 Cal / 18:42");
  });
});
