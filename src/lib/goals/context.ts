import type { GoalDoc } from "@/types";

function firstTitle(goals: GoalDoc[], layer: GoalDoc["layer"]): string {
  return goals.find((g) => g.layer === layer && g.status === "active")?.title ?? "";
}

/** AI対話に渡す目標コンテキストを短文で整形する */
export function buildGoalContext(goals: GoalDoc[]): string {
  const vision = firstTitle(goals, "vision_5y");
  const goal3m = firstTitle(goals, "goal_3m");
  const weekly = firstTitle(goals, "weekly");
  const lines = [
    vision ? `5年後の理想像: ${vision}` : "",
    goal3m ? `3ヶ月目標: ${goal3m}` : "",
    weekly ? `今週のゴール: ${weekly}` : "",
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "目標情報なし";
}

/** 日次タスクを紐付けるべき目標ID（weekly優先、なければgoal_3m） */
export function pickDailyGoalId(goals: GoalDoc[]): string | undefined {
  const weekly = goals.find((g) => g.layer === "weekly" && g.status === "active");
  if (weekly) return weekly.id;
  return goals.find((g) => g.layer === "goal_3m" && g.status === "active")?.id;
}
