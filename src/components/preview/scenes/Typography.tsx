import { memo } from 'react'

function Sample({ surface, label }: { surface: string; label: string }) {
  return (
    <div className={`space-y-3 rounded-lg border p-5 ${surface}`}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <h3 className="text-2xl font-bold tracking-tight">The quick brown fox</h3>
      <h4 className="text-lg font-semibold">Jumps over the lazy dog</h4>
      <p className="leading-relaxed">
        Good typography makes reading effortless. Body text needs strong contrast against its surface, while{' '}
        <span
          className="cursor-pointer font-medium text-primary underline underline-offset-4"
          data-tokens="primary"
        >
          links
        </span>{' '}
        should stand out without shouting.
      </p>
      <p className="text-sm text-muted-foreground" data-tokens="muted-foreground">
        Muted text is for captions, timestamps and helper text — secondary, but still readable.
      </p>
      <p className="text-sm">
        Run <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em]">bun run build</code> before
        shipping.
      </p>
      <blockquote className="border-l-4 border-primary pl-4 text-muted-foreground italic">
        “Colour is a power which directly influences the soul.”
      </blockquote>
    </div>
  )
}

export const Typography = memo(function Typography() {
  return (
    <div className="grid min-h-[640px] gap-4 p-4 text-base sm:p-6 xl:grid-cols-3">
      <Sample surface="bg-background text-foreground" label="On background" />
      <Sample surface="bg-card text-card-foreground" label="On card" />
      <Sample surface="bg-muted text-foreground" label="On muted" />
    </div>
  )
})
