import type { Timestamp } from "firebase/firestore";

/**
 * 全データモデルの型定義。
 * Firestore のコレクション構成（users 配下のサブコレクション）に対応する。
 *
 *   users/{uid}
 *   users/{uid}/goals/{goalId}
 *   users/{uid}/dailyTasks/{taskId}
 *   users/{uid}/reflections/{reflectionId}
 *   users/{uid}/conversations/{conversationId}
 */

/** AI の語り口スタイル */
export type AiStyle = "future_self" | "coach";

/** 対話の種類 */
export type ConversationType =
  | "onboarding"
  | "morning_woop"
  | "night_reflection";

/** 対話セッションの状態（中断・再開のため） */
export type ConversationStatus = "in_progress" | "completed" | "abandoned";

/** 目標の階層。daily は dailyTasks 側に一本化したため weekly まで。 */
export type GoalLayer = "vision_5y" | "goal_3m" | "weekly";

export type GoalStatus = "active" | "done" | "archived";

/** タスク分類: 絶対やる / できたらやる */
export type TaskCategory = "must" | "optional";

/** 対話/フォームのどちら由来か */
export type EntrySource = "dialogue" | "form";

/** WOOP のステップ */
export type WoopStep = "wish" | "outcome" | "obstacle" | "plan";

// ============================================================
// users
// ============================================================
export interface UserDoc {
  uid: string;
  email: string;
  displayName?: string;
  /** IANA タイムゾーン 例: "Asia/Tokyo" */
  timezone: string;
  /** 1日の境界となる時刻(0-23)。例: 4 = 朝4時を境界にする */
  dayResetHour: number;
  /** 選択した AI スタイル */
  aiStyle: AiStyle;
  /** 日次リマインドを表示するか */
  reminderEnabled?: boolean;
  /** リマインド時刻（0-23） */
  reminderHour?: number;
  /** 規約/プライバシー同意時刻 */
  policyAcceptedAt?: Timestamp;
  onboardingCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// goals (5年 / 3ヶ月 / 週次の階層)
// ============================================================
export interface GoalDoc {
  id: string;
  layer: GoalLayer;
  title: string;
  description?: string;
  /** 上位層への参照。vision_5y は null */
  parentId: string | null;
  status: GoalStatus;
  /** 週次 / 3ヶ月の対象期間 */
  periodStart?: Timestamp;
  periodEnd?: Timestamp;
  source: EntrySource;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// dailyTasks
//   見積もり量・AI調整後の量・実績量を「すべて」保存する（v2のバッファ最適化用）
// ============================================================

/** バッファ調整の履歴 1件 */
export interface BufferAdjustment {
  at: Timestamp;
  /** 調整前の量 */
  before: number;
  /** 調整後の量 */
  after: number;
  /** 適用したバッファ率 例: 0.7 */
  ratio: number;
  /** A案: ユーザーに明示した調整理由 */
  reason: string;
}

export interface DailyTaskDoc {
  id: string;
  /** 境界基準の論理日付 "YYYY-MM-DD" */
  date: string;
  title: string;
  category: TaskCategory;
  /** ユーザーが見積もった量 */
  estimatedAmount: number;
  /** AI調整後(70%ルール)の量 */
  adjustedAmount: number;
  /** 夜に記録する実績量。未記録は null */
  actualAmount: number | null;
  /** 量の単位 例: "ページ" "分" */
  unit?: string;
  /** バッファ調整履歴 */
  bufferHistory: BufferAdjustment[];
  completed: boolean;
  /** 紐づく上位ゴール(任意) */
  goalId?: string;
  source: EntrySource;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// reflections (夜の振り返り + 自動スコア)
// ============================================================

/** 見積もり vs 実績の比較データ 1件 */
export interface TaskResult {
  taskId: string;
  title: string;
  estimatedAmount: number;
  adjustedAmount: number;
  actualAmount: number;
}

export interface ReflectionDoc {
  id: string;
  /** 論理日付 "YYYY-MM-DD" */
  date: string;
  /** 自動スコア 0-100 */
  score: number;
  /** 調整後ベースの達成率 0-1 = Σactual / Σadjusted */
  achievementRateAdjusted: number;
  /** 見積もりベースの達成率 0-1 = Σactual / Σestimated（併記） */
  achievementRateEstimated: number;
  /** AIによる振り返り要約 */
  summary: string;
  taskResults: TaskResult[];
  /** 元になった夜の対話 */
  conversationId: string;
  createdAt: Timestamp;
}

// ============================================================
// conversations (対話履歴 + 中断/再開状態)
// ============================================================
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Timestamp;
}

export interface ConversationDoc {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  aiStyle: AiStyle;
  /** 朝/夜の対話が紐づく論理日付 */
  date?: string;
  /** 再開位置の復元に使う現在ステップ（WOOP等） */
  currentStep?: WoopStep | string;
  messages: ChatMessage[];
  /** 入力済みだが未確定の内容（失敗時に保持し再開させる） */
  draft?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// API 入出力で使う、Timestamp を含まない軽量メッセージ型
// ============================================================
export interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}
