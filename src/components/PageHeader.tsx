import { Link } from "react-router-dom";

export default function PageHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="flex items-center gap-3 px-1 pt-5 pb-2">
      <Link
        to="/"
        aria-label="ホームへ戻る"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-text-secondary)]"
      >
        ←
      </Link>
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--color-text-secondary)]">{eyebrow}</p>
        )}
        <h1 className="text-lg font-semibold text-[var(--color-text-main)]">{title}</h1>
      </div>
    </header>
  );
}
