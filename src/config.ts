export const SITE_NAME = "Crack Game III";
export const SITE_BASE_PATH = "/crackgames3/";

export const PUBLIC_TABS = [
  { id: "competition", label: "比赛", icon: "competition" },
  { id: "events", label: "项目", icon: "events" },
  { id: "schedule", label: "赛程", icon: "schedule" }
] as const;

export type PublicTabId = (typeof PUBLIC_TABS)[number]["id"];
