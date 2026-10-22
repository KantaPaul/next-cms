export function DualBars({
  daily,
  rangeDays,
  showPrevious = true,
}: {
  daily: { day: string; views: number; previousViews: number }[];
  rangeDays: number;
  /** When false, only draw the current series (compare off). */
  showPrevious?: boolean;
}) {
  const max = Math.max(
    1,
    ...daily.map(d =>
      showPrevious ? Math.max(d.views, d.previousViews) : d.views
    )
  );
  const slotWidth = Math.max(8, Math.floor(320 / rangeDays));
  const barWidth = showPrevious
    ? Math.max(3, Math.floor(slotWidth / 2) - 1)
    : Math.max(4, Math.floor(slotWidth * 0.6));
  const height = 96;
  const gap = 2;

  return (
    <svg
      viewBox={`0 0 ${rangeDays * slotWidth} ${height + 20}`}
      className="h-28 w-full"
      role="img"
      aria-label="Daily page views this period vs previous"
    >
      {daily.map((d, i) => {
        const hCurr = Math.round((d.views / max) * height);
        const hPrev = Math.round((d.previousViews / max) * height);
        const x = i * slotWidth;
        return (
          <g key={d.day}>
            {showPrevious && (
              <rect
                x={x}
                y={height - hPrev}
                width={barWidth}
                height={hPrev}
                rx={1.5}
                className="fill-steel-300 dark:fill-steel-600"
              >
                <title>
                  {d.day} (prev): {d.previousViews} view
                  {d.previousViews === 1 ? '' : 's'}
                </title>
              </rect>
            )}
            <rect
              x={showPrevious ? x + barWidth + gap : x + Math.floor((slotWidth - barWidth) / 2)}
              y={height - hCurr}
              width={barWidth}
              height={hCurr}
              rx={1.5}
              className="fill-indigo-500/80 dark:fill-indigo-400/80"
            >
              <title>
                {d.day}: {d.views} view{d.views === 1 ? '' : 's'}
                {showPrevious ? ` (prev: ${d.previousViews})` : ''}
              </title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}
