interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4">
      <section className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg-page)] p-4 shadow-lg">
        <h3 className="text-base font-semibold text-[var(--color-text-main)]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[var(--color-line)] py-2 text-sm text-[var(--color-text-secondary)]"
          >
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1 rounded-xl py-2 text-sm font-semibold">
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
