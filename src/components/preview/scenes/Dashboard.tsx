import { BarChart3, Bell, CreditCard, Home, Plus, Settings, Trash2, Users } from 'lucide-react'
import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StateBadge } from './shared'

const bars = [42, 68, 55, 80, 62, 90, 74]
const line = [30, 45, 38, 60, 52, 70, 66]

function Chart() {
  const w = 320
  const h = 140
  const bw = w / bars.length
  const pts = line.map((v, i) => `${i * bw + bw / 2},${h - (v / 100) * h}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h + 4}`}
      className="h-40 w-full"
      role="img"
      aria-label="Revenue chart"
      data-tokens="chart-1 chart-2 chart-3 chart-4 chart-5"
      data-explain="chart-1…5"
    >
      {bars.map((v, i) => (
        <rect
          key={i}
          x={i * bw + 6}
          y={h - (v / 100) * h}
          width={bw - 12}
          height={(v / 100) * h}
          rx={3}
          fill={`var(--chart-${(i % 3) + 1})`}
        />
      ))}
      <polyline points={pts} fill="none" stroke="var(--chart-4)" strokeWidth={2.5} strokeLinejoin="round" />
      {line.map((v, i) => (
        <circle
          key={i}
          cx={i * bw + bw / 2}
          cy={h - (v / 100) * h}
          r={3.5}
          fill="var(--chart-5)"
          stroke="var(--card)"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  )
}

const nav = [
  { icon: Home, label: 'Overview', active: true },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Users, label: 'Customers' },
  { icon: CreditCard, label: 'Billing' },
  { icon: Settings, label: 'Settings' },
]

export const Dashboard = memo(function Dashboard() {
  return (
    <div className="flex min-h-[640px] text-sm">
      <aside
        className="hidden w-48 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground sm:flex"
        data-tokens="sidebar sidebar-foreground"
        data-explain="sidebar"
      >
        <div className="mb-3 flex items-center gap-2 px-2 font-semibold">
          <span className="size-6 rounded-md bg-sidebar-primary" data-tokens="primary" />
          Acme
        </div>
        {nav.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/80'}`}
          >
            <Icon className="size-4" />
            {label}
          </div>
        ))}
      </aside>
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h3 className="text-lg font-semibold" data-tokens="foreground">
              Overview
            </h3>
            <p
              className="text-muted-foreground"
              data-tokens="muted-foreground"
              data-explain="muted-foreground"
            >
              Last 7 days · updated just now
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell />
          </Button>
          <Button variant="secondary" data-tokens="secondary secondary-foreground">
            Export
          </Button>
          <Button variant="destructive" data-tokens="destructive destructive-foreground">
            <Trash2 /> Delete
          </Button>
          <Button data-tokens="primary primary-foreground" data-explain="primary">
            <Plus /> New report
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: 'Revenue', v: '$48,210', d: '+12.4%', s: 'success' as const },
            { t: 'Active users', v: '3,942', d: '−2.1%', s: 'destructive' as const },
            { t: 'Churn risk', v: '18', d: 'Review', s: 'warning' as const },
          ].map((k) => (
            <Card
              key={k.t}
              className="gap-2 py-4"
              data-tokens="card card-foreground border"
              data-explain="card"
            >
              <CardHeader className="px-4">
                <CardDescription>{k.t}</CardDescription>
                <CardTitle className="text-2xl">{k.v}</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <StateBadge state={k.s}>{k.d}</StateBadge>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle>Revenue by week</CardTitle>
            <CardDescription>Bars: plans · Line: forecast</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <Chart />
          </CardContent>
        </Card>
        <Card className="py-0" data-tokens="border" data-explain="border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60" data-tokens="muted muted-foreground">
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Olivia Martin', 'Pro', 'success', 'Paid', '$1,999'],
                ['Jackson Lee', 'Team', 'warning', 'Pending', '$399'],
                ['Isabella Nguyen', 'Pro', 'destructive', 'Failed', '$299'],
                ['William Kim', 'Starter', 'info', 'Trial', '$0'],
              ].map(([n, p, s, l, a]) => (
                <TableRow key={n}>
                  <TableCell className="font-medium">{n}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p}</Badge>
                  </TableCell>
                  <TableCell>
                    <StateBadge state={s as 'success'}>{l}</StateBadge>
                  </TableCell>
                  <TableCell className="text-right">{a}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  )
})
