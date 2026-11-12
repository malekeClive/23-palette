import { useRef, useState } from 'react'
import { maxChroma, normHue, toHex } from '@/engine/color'
import { ROLE_KEYS, type RoleKey } from '@/engine/types'
import { usePalette } from '@/state/palette-context'
import { usePaletteStore } from '@/state/store'
import { explainId, SectionHeading } from '../help/InfoTip'
import { ROLE_LABEL } from './RoleCards'

const SIZE = 180
const R = 72

/** Interactive OKLCH hue wheel. Drag primary = rotate the whole palette; drag another = lock that role. */
export function HueWheel() {
  const { result } = usePalette()
  const setConfig = usePaletteStore((s) => s.setConfig)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<RoleKey | null>(null)
  const roles = ROLE_KEYS.filter((r) => result.roles[r])

  const angleFromEvent = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    return normHue((Math.atan2(y, x) * 180) / Math.PI + 90)
  }

  const setHue = (role: RoleKey, h: number) => {
    const c = result.roles[role]!
    const next = { l: c.l, c: Math.min(c.c, maxChroma(c.l, h, 'srgb')), h }
    const hex = toHex(next).slice(1)
    if (role === 'primary') {
      setConfig((cfg) => ({
        ...cfg,
        seed: hex,
        locks: cfg.locks.primary ? { ...cfg.locks, primary: hex } : cfg.locks,
        overrides: { light: {}, dark: {} },
      }))
    } else {
      setConfig((cfg) => ({
        ...cfg,
        locks: { ...cfg.locks, [role]: hex },
        overrides: { light: {}, dark: {} },
      }))
    }
  }

  const ringStops = Array.from({ length: 25 }, (_, i) => toHex({ l: 0.7, c: 0.13, h: i * 15 })).join(',')

  return (
    <section className="space-y-2">
      <SectionHeading id="wheel">Colour wheel</SectionHeading>
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${ringStops})`,
            mask: `radial-gradient(circle, transparent ${R - 12}px, #000 ${R - 11}px, #000 ${R + 11}px, transparent ${R + 12}px)`,
            WebkitMask: `radial-gradient(circle, transparent ${R - 12}px, #000 ${R - 11}px, #000 ${R + 11}px, transparent ${R + 12}px)`,
          }}
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute inset-0 touch-none"
          role="group"
          aria-label="Colour wheel"
          onPointerMove={(e) => dragging && setHue(dragging, angleFromEvent(e))}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
          aria-describedby={explainId('wheel')}
        >
          <title>Colour wheel</title>
          {roles.map((role) => {
            const c = result.roles[role]!
            const a = ((c.h - 90) * Math.PI) / 180
            return (
              <line
                key={`l-${role}`}
                x1={SIZE / 2}
                y1={SIZE / 2}
                x2={SIZE / 2 + R * Math.cos(a)}
                y2={SIZE / 2 + R * Math.sin(a)}
                stroke="currentColor"
                strokeOpacity={0.25}
              />
            )
          })}
          {[...roles].reverse().map((role) => {
            const c = result.roles[role]!
            const a = ((c.h - 90) * Math.PI) / 180
            const primary = role === 'primary'
            return (
              <circle
                key={role}
                role="slider"
                tabIndex={0}
                aria-label={`${ROLE_LABEL[role]} hue${primary ? ' (rotates the whole palette)' : ''}`}
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(c.h)}
                aria-valuetext={`${Math.round(c.h)} degrees`}
                cx={SIZE / 2 + R * Math.cos(a)}
                cy={SIZE / 2 + R * Math.sin(a)}
                r={primary ? 11 : 8}
                fill={toHex(c)}
                stroke="white"
                strokeWidth={2.5}
                className="cursor-grab drop-shadow focus-visible:outline-none [&:focus-visible]:stroke-black"
                onPointerDown={(e) => {
                  ;(e.target as Element).setPointerCapture?.(e.pointerId)
                  setDragging(role)
                }}
                onKeyDown={(e) => {
                  const d =
                    e.key === 'ArrowRight' || e.key === 'ArrowUp'
                      ? 5
                      : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
                        ? -5
                        : 0
                  if (!d) return
                  e.preventDefault()
                  setHue(role, normHue(c.h + d * (e.shiftKey ? 3 : 1)))
                }}
              />
            )
          })}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={26}
            fill={toHex(result.roles.primary!)}
            stroke="white"
            strokeWidth={2}
          />
        </svg>
      </div>
    </section>
  )
}
