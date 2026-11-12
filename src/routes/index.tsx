import { createFileRoute } from '@tanstack/react-router'
import { PaletteApp } from '@/components/app/PaletteApp'
import { paletteSearchSchema } from '@/state/search-schema'

export const Route = createFileRoute('/')({
  validateSearch: paletteSearchSchema,
  component: PaletteApp,
})
