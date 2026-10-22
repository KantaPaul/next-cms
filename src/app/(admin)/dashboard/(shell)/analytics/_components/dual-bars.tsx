export function DualBars({
  daily,
  rangeDays,
}: {
  daily: { day: string; views: number; previousViews: number }[];
  rangeDays: number;
}) {
  const max = Math.max(
    1,
    ...daily.map(d => Math.max(d.views, d.previousViews))
  );
  const slotWidth = Math.max(8, Math.floor(320 / rangeDays));
  const barWidth = Math.max(3, Math.floor(slotWidth / 2) - 1);
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
            <rect
              x={x + barWidth + gap}
              y={height - hCurr}
              width={barWidth}
              height={hCurr}
              rx={1.5}
              className="fill-indigo-500/80 dark:fill-indigo-400/80"
            >
              <title>
                {d.day}: {d.views} view{d.views === 1 ? '' : 's'} (prev:{' '}
                {d.previousViews})
              </title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}
