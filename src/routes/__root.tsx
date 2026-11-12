import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRoute({
  component: () => (
    <TooltipProvider delayDuration={300}>
      <Outlet />
      <Toaster position="bottom-center" />
    </TooltipProvider>
  ),
})
