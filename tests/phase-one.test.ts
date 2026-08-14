import { describe, expect, it } from "vitest";

import { PUBLIC_TABS, SITE_BASE_PATH, SITE_NAME } from "../src/config";

describe("phase one web foundation", () => {
  it("keeps the GitHub Pages repository base path", () => {
    expect(SITE_BASE_PATH).toBe("/crackgames3/");
  });

  it("registers the three public mobile tabs", () => {
    expect(PUBLIC_TABS.map((tab) => tab.label)).toEqual(["比赛", "项目", "赛程"]);
  });

  it("uses the competition brand name", () => {
    expect(SITE_NAME).toBe("Crack Game III");
  });
});
