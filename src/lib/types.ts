export type AiStyle = "labeling";
export type WoopStage = "wo" | "woo" | "woop";
export type DayMode = "normal" | "minimal" | "checkin_only";
export type ChatMode = "onboarding" | "morning" | "evening";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UserProfile {
  createdAt: number; // epoch ms
  timezone: string;
  aiStyle: AiStyle;
  triggerHabit: string; // 開始条件付け（例: 朝食後に机に座ったら）
  minimalRule: string; // 最低ライン（例: 5分だけでもOK）
  onboardingCompleted: boolean;
}

export interface IdealSelf {
  title: string;
  description: string;
  habits: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  isFirstTask: boolean;
  priority?: 1 | 2 | 3 | 4;
}

export interface Scores {
  narikiri: number; // 理想との一致度 0-100
  pace: number; // 達成ペース 0-100
  motivation: number; // モチベーション 0-100
  narikiriReason?: string;
  paceReason?: string;
  motivationReason?: string;
}

export interface Dialogue {
  messages: ChatMessage[];
  completedAt: number | null;
  woopStage?: WoopStage;
}

export interface DailyLog {
  date: string; // yyyy-mm-dd（ユーザーのローカル日付）
  morningDialogue: Dialogue | null;
  eveningDialogue: Dialogue | null;
  tasks: Task[];
  tomorrowFirstTask: string | null; // 夜に決めた「明日の最初の1タスク」
  scores: Scores | null;
  mode: DayMode;
  eveningNote?: string | null;
  // 見積もりと実績の差分（将来のバッファ最適化用。MVPでは保存のみ）
  estimation?: { planned: number; completed: number } | null;
}

export interface RecentDayContext {
  date: string;
  doneTasks: string[];
  undoneTasks: string[];
  note?: string | null;
}

export interface WeeklyReview {
  week: string; // yyyy-Www
  summary: string;
  stuckPatterns: string[];
  adjustments: string[];
  completionRate: number;
  createdAt: number;
}

export interface ChatContext {
  aiStyle: AiStyle;
  idealSelf?: { title: string; description?: string; habits: string[] } | null;
  triggerHabit?: string | null;
  minimalRule?: string | null;
  dayCount?: number;
  woopStage?: WoopStage;
  gapDays?: number;
  mode?: DayMode;
  yesterday?: { taskCount: number; doneCount: number; completionRate: number } | null;
  tomorrowFirstTask?: string | null;
  todayTasks?: Task[];
  recentDays?: RecentDayContext[];
}
