'use client';

/** One-line notice for a hidden setting that still has a saved value, with a Clear button. */
export function HiddenValueHint({
  message,
  onClear,
}: {
  message: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-border/80 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 font-medium text-primary hover:underline"
      >
        Clear
      </button>
    </div>
  );
}
