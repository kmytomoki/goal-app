import { CheckIcon } from "@/components/icons";

/**
 * 複数ステップフローの現在地表示。
 * tone="night" は夜の振り返り用の藍色トーン。
 */
export default function StepIndicator({
  steps,
  current,
  tone = "day",
}: {
  steps: string[];
  current: number; // 0-indexed
  tone?: "day" | "night";
}) {
  const activeBg = tone === "night" ? "bg-night" : "bg-primary";
  const activeText = tone === "night" ? "text-night" : "text-primary";
  const doneBg = tone === "night" ? "bg-night/15 text-night" : "bg-primary-soft text-primary";

  return (
    <ol className="flex items-center gap-1.5" aria-label="進行状況">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 && <span className="h-px w-4 bg-border" aria-hidden />}
            <span
              aria-current={isActive ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-colors ${
                isActive
                  ? `${activeText} bg-surface border border-current/20 shadow-sm`
                  : isDone
                    ? doneBg
                    : "text-fg-subtle"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? `${activeBg} text-white`
                    : isDone
                      ? `${activeBg} text-white`
                      : "bg-muted text-fg-subtle"
                }`}
              >
                {isDone ? <CheckIcon size={11} /> : i + 1}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
