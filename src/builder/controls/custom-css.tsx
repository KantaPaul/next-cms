'use client';

export function CustomCssControl({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-steel-500 dark:text-steel-400">
        Add custom CSS for this element. Use <code className="font-mono bg-steel-100 px-1 py-0.5 rounded text-foreground dark:bg-dark-200">selector</code> to target the wrapper element.
      </p>
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        rows={6}
        maxLength={10000}
        placeholder="selector {&#10;  outline: 2px solid red;&#10;}&#10;selector h2 {&#10;  color: #4f46e5;&#10;}"
        className="w-full font-mono text-xs rounded-md border border-steel-200 bg-slate-50 p-2.5 text-foreground dark:border-dark-300 dark:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex justify-between text-[11px] text-steel-400">
        <span>Scaped to this block</span>
        <span>{value?.length ?? 0} / 10,000</span>
      </div>
    </div>
  );
}
