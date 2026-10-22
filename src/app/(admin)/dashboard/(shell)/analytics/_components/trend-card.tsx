export function TrendCard({
  label,
  value,
  change,
  previous,
  hidePrevious = false,
}: {
  label: string;
  value: number;
  change: string | null;
  previous: number;
  /** When true, omit the "prev N" line (compare is off). */
  hidePrevious?: boolean;
}) {
  const positive =
    change === 'New' || (change != null && change.startsWith('+'));
  const negative = change != null && change.startsWith('-');

  return (
    <div className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300">
      <div className="text-xs uppercase tracking-wide text-steel-400">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {change != null && (
          <span
            className={`text-sm font-medium ${
              positive
                ? 'text-emerald-600 dark:text-emerald-400'
                : negative
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-steel-500'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      {!hidePrevious && (
        <div className="mt-0.5 text-xs text-steel-400">prev {previous}</div>
      )}
    </div>
  );
}
