import { ArrowRight, Check, Gauge, Palette, ShieldCheck } from 'lucide-react'
import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const features = [
  { icon: Gauge, t: 'Fast by default', d: 'Ship pages that load in under a second on any network.' },
  { icon: ShieldCheck, t: 'Secure', d: 'SOC 2 compliant with encryption at rest and in transit.' },
  { icon: Palette, t: 'On brand', d: 'Every component follows your design tokens automatically.' },
]

const tiers = [
  { n: 'Starter', p: '$0', f: ['1 project', 'Community support'] },
  { n: 'Pro', p: '$29', f: ['Unlimited projects', 'Priority support', 'Analytics'], hl: true },
  { n: 'Team', p: '$99', f: ['Everything in Pro', 'SSO', 'Audit log'] },
]

export const Marketing = memo(function Marketing() {
  return (
    <div className="min-h-[640px] text-sm">
      <nav className="flex items-center gap-4 border-b px-6 py-3">
        <span className="font-semibold">Acme</span>
        <span className="text-muted-foreground">Product</span>
        <span className="text-muted-foreground">Pricing</span>
        <span
          className="text-primary underline underline-offset-4"
          data-tokens="primary background"
          data-explain="primary (link)"
        >
          Docs
        </span>
        <Button size="sm" variant="outline" className="ml-auto" data-tokens="input border">
          Sign in
        </Button>
      </nav>
      <section className="mx-auto max-w-2xl px-6 py-14 text-center">
        <Badge variant="secondary" className="mb-4" data-tokens="secondary secondary-foreground">
          New · v2.0 is here
        </Badge>
        <h3
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          data-tokens="foreground background"
          data-explain="foreground"
        >
          Build beautiful products, faster
        </h3>
        <p className="mt-4 text-base text-muted-foreground" data-tokens="muted-foreground">
          The toolkit for teams who care about craft. Start free, scale when you are ready.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" data-tokens="primary primary-foreground" data-explain="primary">
            Get started <ArrowRight />
          </Button>
          <Button size="lg" variant="outline">
            Book a demo
          </Button>
        </div>
      </section>
      <section className="grid gap-4 px-6 pb-12 sm:grid-cols-3">
        {features.map(({ icon: Icon, t, d }) => (
          <Card key={t} className="gap-3 py-5">
            <CardHeader className="px-5">
              <span
                className="mb-2 inline-flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground"
                data-tokens="accent accent-foreground"
                data-explain="accent"
              >
                <Icon className="size-5" />
              </span>
              <CardTitle>{t}</CardTitle>
              <CardDescription>{d}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
      <section className="bg-muted/50 px-6 py-12" data-tokens="muted">
        <h4 className="mb-6 text-center text-2xl font-semibold">Simple pricing</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.n}
              className={cn('gap-4 py-5', t.hl && 'border-primary shadow-lg ring-1 ring-primary')}
              data-tokens={t.hl ? 'primary' : undefined}
            >
              <CardHeader className="px-5">
                <div className="flex items-center justify-between">
                  <CardTitle>{t.n}</CardTitle>
                  {t.hl && <Badge>Popular</Badge>}
                </div>
                <p className="text-3xl font-bold">
                  {t.p}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-2 px-5">
                {t.f.map((f) => (
                  <p key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> {f}
                  </p>
                ))}
              </CardContent>
              <CardFooter className="px-5">
                <Button className="w-full" variant={t.hl ? 'default' : 'outline'}>
                  Choose {t.n}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
      <footer className="flex flex-wrap gap-4 border-t px-6 py-6 text-xs text-muted-foreground">
        <span>© 2026 Acme Inc.</span>
        <span>Privacy</span>
        <span>Terms</span>
        <span className="ml-auto">Made with care</span>
      </footer>
    </div>
  )
})
