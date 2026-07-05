/**
 * スコアを円形プログレスで表示する。色はスコア帯で変える（色だけに頼らず数値も併記）。
 */
export default function ScoreRing({
  score,
  size = 72,
}: {
  score: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = size >= 64 ? 6 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const color =
    clamped >= 80 ? "var(--color-accent)" : clamped >= 50 ? "var(--color-secondary)" : "var(--color-fg-subtle)";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`スコア ${score}点`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s var(--ease-out-soft)" }}
        />
      </svg>
      <span className="absolute inline-flex items-baseline font-display font-bold text-foreground">
        <span style={{ fontSize: size * 0.32 }}>{score}</span>
      </span>
    </div>
  );
}
