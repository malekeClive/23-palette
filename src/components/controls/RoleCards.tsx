import { Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toHex } from '@/engine/color'
import { generate } from '@/engine/generate'
import { ROLE_KEYS, type RoleKey } from '@/engine/types'
import { cn } from '@/lib/utils'
import { usePalette } from '@/state/palette-context'
import { usePaletteStore } from '@/state/store'
import { SectionHeading } from '../help/InfoTip'
import { ColorPicker } from './ColorPicker'

export const ROLE_LABEL: Record<RoleKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  extra: 'Extra',
}

export function toggleLock(role: RoleKey) {
  const { config, setConfig } = usePaletteStore.getState()
  const locked = !!config.locks[role]
  if (locked) {
    const { [role]: _, ...rest } = config.locks
    setConfig({ locks: rest })
    toast(`${ROLE_LABEL[role]} unlocked`, { duration: 2000 })
    return
  }
  // lock the colour currently generated for this role
  const hex = role === 'primary' ? config.seed : toHex(generate(config).roles[role]!).slice(1)
  setConfig({ locks: { ...config.locks, [role]: hex } })
  toast(`${ROLE_LABEL[role]} locked — it stays while you shuffle`, { duration: 2000 })
}

export function setRoleColor(role: RoleKey, hex: string) {
  const { setConfig } = usePaletteStore.getState()
  if (role === 'primary') {
    setConfig((c) => ({
      ...c,
      seed: hex,
      locks: c.locks.primary ? { ...c.locks, primary: hex } : c.locks,
      overrides: { light: {}, dark: {} },
    }))
  } else {
    setConfig((c) => ({ ...c, locks: { ...c.locks, [role]: hex }, overrides: { light: {}, dark: {} } }))
  }
}

export function RoleCards() {
  const { result } = usePalette()
  const locks = usePaletteStore((s) => s.config.locks)
  const setUi = usePaletteStore((s) => s.setUi)
  const roles = ROLE_KEYS.filter((r) => result.roles[r])

  return (
    <section className="space-y-2">
      <SectionHeading id="roles">Brand colours</SectionHeading>
      <ul className="space-y-1.5">
        {roles.map((role) => {
          const c = result.roles[role]!
          const hex = toHex(c)
          const locked = !!locks[role]
          return (
            <li
              key={role}
              className="flex items-center gap-2 rounded-md border p-1.5"
              onMouseEnter={() => setUi({ hoveredRole: role })}
              onMouseLeave={() => setUi({ hoveredRole: null })}
              onFocus={() => setUi({ hoveredRole: role })}
            >
              <ColorPicker
                value={c}
                label={ROLE_LABEL[role]}
                onChange={(h) => setRoleColor(role, h)}
                size="sm"
              />
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-default rounded text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-describedby={`reason-${role}`}
                  >
                    <div className="text-sm font-medium">{ROLE_LABEL[role]}</div>
                    <div className="font-mono text-xs text-muted-foreground">{hex}</div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-64">
                  <p className="font-medium">Why this colour?</p>
                  <p id={`reason-${role}`}>{result.reasons[role]}</p>
                </TooltipContent>
              </Tooltip>
              <button
                type="button"
                aria-pressed={locked}
                aria-label={`${locked ? 'Unlock' : 'Lock'} ${ROLE_LABEL[role]} (L)`}
                title={locked ? 'Locked — stays while you shuffle' : 'Lock to keep while you shuffle'}
                onClick={() => toggleLock(role)}
                className={cn(
                  'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  locked && 'bg-muted text-foreground',
                )}
              >
                {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
