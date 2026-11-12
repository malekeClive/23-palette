import { ChevronDown, X } from 'lucide-react'
import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { StateAlert, StateBadge } from './shared'

export const Forms = memo(function Forms() {
  return (
    <div className="grid min-h-[640px] gap-6 p-4 text-sm sm:p-6 lg:grid-cols-2">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Create account</CardTitle>
          <CardDescription>All fields are required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="pv-name">Full name</Label>
            <Input id="pv-name" defaultValue="Ada Lovelace" data-tokens="input border" data-explain="input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-email">Email (focused)</Label>
            <Input
              id="pv-email"
              placeholder="you@example.com"
              className="border-ring ring-[3px] ring-ring/50"
              data-tokens="ring"
              data-explain="ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 shadow-xs">
              Designer <ChevronDown className="size-4 opacity-50" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-pw">Password</Label>
            <Input
              id="pv-pw"
              type="password"
              defaultValue="short"
              aria-invalid
              className="border-destructive ring-[3px] ring-destructive/20"
            />
            <p className="text-xs text-destructive" data-tokens="destructive">
              Use at least 8 characters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pv-terms" defaultChecked data-tokens="primary" />
            <Label htmlFor="pv-terms" className="font-normal">
              I agree to the terms
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="pv-news" defaultChecked />
            <Label htmlFor="pv-news" className="font-normal">
              Product updates
            </Label>
            <Switch id="pv-news2" className="ml-4" />
            <Label htmlFor="pv-news2" className="font-normal text-muted-foreground">
              Off
            </Label>
          </div>
        </CardContent>
        <CardFooter className="gap-2 px-5">
          <Button variant="ghost">Cancel</Button>
          <Button className="ml-auto">Create account</Button>
        </CardFooter>
      </Card>

      <div className="space-y-3">
        <StateAlert state="success" title="Payment received">
          Your invoice #1024 has been paid.
        </StateAlert>
        <StateAlert state="warning" title="Storage almost full">
          You have used 92% of your plan.
        </StateAlert>
        <StateAlert state="destructive" title="Deployment failed">
          Build exited with code 1. Check the logs.
        </StateAlert>
        <StateAlert state="info" title="Scheduled maintenance">
          Sunday 02:00–03:00 UTC.
        </StateAlert>

        <div className="flex flex-wrap gap-2 pt-1">
          <StateBadge state="success">Active</StateBadge>
          <StateBadge state="warning">Pending</StateBadge>
          <StateBadge state="destructive">Blocked</StateBadge>
          <StateBadge state="info">Beta</StateBadge>
        </div>

        <div
          className="flex items-start gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
          data-tokens="popover popover-foreground"
          data-explain="popover"
        >
          <div className="flex-1">
            <p className="font-medium">Changes saved</p>
            <p className="text-muted-foreground">Your profile was updated.</p>
          </div>
          <Button size="sm" variant="outline">
            Undo
          </Button>
          <X className="size-4 text-muted-foreground" />
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-xl">
          <p className="text-base font-semibold">Delete project?</p>
          <p className="mt-1 text-muted-foreground">
            This permanently removes “Website redesign” and its 24 files.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button variant="destructive">Delete project</Button>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border p-3" aria-hidden>
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
})
