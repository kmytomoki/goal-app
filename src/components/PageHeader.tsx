import { Link } from "react-router-dom";

export default function PageHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="flex items-center gap-3 px-1 pt-5 pb-2">
      <Link
        to="/"
        aria-label="ホームへ戻る"
        className="flex h-9 w-9 items-center justify-center rounded-full border hairline text-ink-400"
      >
        ←
      </Link>
      <div>
        {eyebrow && (
          <p className="font-display text-[11px] tracking-[0.25em] text-gold-300">{eyebrow}</p>
        )}
        <h1 className="font-display text-lg text-ink-100">{title}</h1>
      </div>
    </header>
  );
}
