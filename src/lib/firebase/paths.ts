/**
 * Firestore のコレクションパスを一元管理する。
 * クライアント / Admin 双方から参照する文字列のみを提供（SDK 非依存）。
 */
export const paths = {
  users: () => "users",
  user: (uid: string) => `users/${uid}`,

  goals: (uid: string) => `users/${uid}/goals`,
  goal: (uid: string, goalId: string) => `users/${uid}/goals/${goalId}`,

  dailyTasks: (uid: string) => `users/${uid}/dailyTasks`,
  dailyTask: (uid: string, taskId: string) =>
    `users/${uid}/dailyTasks/${taskId}`,

  reflections: (uid: string) => `users/${uid}/reflections`,
  reflection: (uid: string, reflectionId: string) =>
    `users/${uid}/reflections/${reflectionId}`,

  conversations: (uid: string) => `users/${uid}/conversations`,
  conversation: (uid: string, conversationId: string) =>
    `users/${uid}/conversations/${conversationId}`,
} as const;
