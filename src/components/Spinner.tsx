export default function Spinner({ label }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-1 items-center justify-center gap-3 py-12 text-fg-subtle"
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
