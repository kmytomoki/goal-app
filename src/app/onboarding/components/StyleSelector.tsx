"use client";

import { CheckIcon, CompassIcon, SparklesIcon } from "@/components/icons";
import type { AiStyle } from "@/types";
import type { ReactNode } from "react";

const OPTIONS: {
  value: AiStyle;
  title: string;
  desc: string;
  icon: ReactNode;
}[] = [
  {
    value: "future_self",
    title: "未来の自分モード",
    desc: "5年後の理想を実現したあなた自身が語りかけます。確信を持って背中を押すスタイル。",
    icon: <SparklesIcon size={18} />,
  },
  {
    value: "coach",
    title: "コーチモード",
    desc: "伴走者として隣で支えます。問いかけながら主体性を引き出すスタイル。",
    icon: <CompassIcon size={18} />,
  },
];

export default function StyleSelector({
  value,
  onSelect,
}: {
  value?: AiStyle;
  onSelect: (style: AiStyle) => void;
}) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label="AIの語り口">
      {OPTIONS.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(o.value)}
            className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 ${
              selected
                ? "border-primary bg-primary-soft ring-2 ring-primary/15"
                : "border-border bg-surface hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
            }`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                selected
                  ? "bg-primary text-white"
                  : "bg-muted text-fg-muted"
              }`}
            >
              {o.icon}
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                {o.title}
                {selected && (
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-white">
                    <CheckIcon size={10} />
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-fg-muted">
                {o.desc}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
