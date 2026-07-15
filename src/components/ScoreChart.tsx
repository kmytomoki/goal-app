import { useState } from "react";
import type { Scores } from "../lib/types";

export interface DayScore {
  date: string; // yyyy-mm-dd
  scores: Scores | null;
}

const SERIES = [
  { key: "narikiri", label: "なりきり", color: "var(--color-series-narikiri)" },
  { key: "pace", label: "ペース", color: "var(--color-series-pace)" },
  { key: "motivation", label: "やる気", color: "var(--color-series-motivation)" },
] as const;

const W = 340;
const H = 120;
const PAD = { top: 10, right: 40, bottom: 18, left: 8 };

export default function ScoreChart({ days }: { days: DayScore[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length <= 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - v / 100) * plotH;

  const hasAny = days.some((d) => d.scores);

  // 系列ごとに、連続するデータ点をセグメントとして線を引く（欠測日は線を切る）
  const segments = SERIES.map((s) => {
    const segs: { i: number; v: number }[][] = [];
    let current: { i: number; v: number }[] = [];
    days.forEach((d, i) => {
      if (d.scores) {
        current.push({ i, v: d.scores[s.key] });
      } else if (current.length) {
        segs.push(current);
        current = [];
      }
    });
    if (current.length) segs.push(current);
    return { series: s, segs };
  });

  const sel = selected !== null ? days[selected] : null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>

      {!hasAny ? (
        <p className="card px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          夜の振り返りをするとスコアの推移が見えてきます。
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="直近7日間のスコア推移"
          >
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                />
                <text
                  x={W - PAD.right + 4}
                  y={y(v) + 3}
                  fontSize={9}
                  fill="var(--color-text-faint)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {v}
                </text>
              </g>
            ))}

            {segments.map(({ series, segs }) =>
              segs.map((seg, si) => (
                <g key={`${series.key}-${si}`}>
                  {seg.length > 1 && (
                    <polyline
                      points={seg.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
                      fill="none"
                      stroke={series.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {seg.map((p) => (
                    <circle
                      key={p.i}
                      cx={x(p.i)}
                      cy={y(p.v)}
                      r={selected === p.i ? 4 : 2.5}
                      fill={series.color}
                      stroke="var(--color-bg-page)"
                      strokeWidth={1.5}
                    />
                  ))}
                </g>
              )),
            )}

            {/* 日付ラベル（月/日） */}
            {days.map((d, i) => (
              <text
                key={d.date}
                x={x(i)}
                y={H - 4}
                fontSize={9}
                textAnchor="middle"
                fill={selected === i ? "var(--color-text-main)" : "var(--color-text-faint)"}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Number(d.date.slice(8, 10))}
              </text>
            ))}

            {/* タップ用の透明カラム（ヒットターゲット） */}
            {days.map((d, i) => (
              <rect
                key={`hit-${d.date}`}
                x={x(i) - plotW / (days.length * 2)}
                y={0}
                width={plotW / days.length}
                height={H}
                fill="transparent"
                onClick={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </svg>

          <p
            className="mt-1 min-h-5 text-xs text-[var(--color-text-secondary)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
            aria-live="polite"
          >
            {sel
              ? sel.scores
                ? `${Number(sel.date.slice(5, 7))}/${Number(sel.date.slice(8, 10))}　なりきり ${sel.scores.narikiri} ・ ペース ${sel.scores.pace} ・ やる気 ${sel.scores.motivation}`
                : `${Number(sel.date.slice(5, 7))}/${Number(sel.date.slice(8, 10))}　記録なし`
              : "点をタップすると値を表示"}
          </p>
        </>
      )}
    </div>
  );
}
