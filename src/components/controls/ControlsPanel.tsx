import { Hints } from '../help/Hints'
import { AdvancedControls } from './AdvancedControls'
import { HarmonyPicker } from './HarmonyPicker'
import { HueWheel } from './HueWheel'
import { RoleCards } from './RoleCards'

export function ControlsPanel() {
  return (
    <div className="space-y-6">
      <Hints />
      <HarmonyPicker />
      <RoleCards />
      <HueWheel />
      <AdvancedControls />
    </div>
  )
}
