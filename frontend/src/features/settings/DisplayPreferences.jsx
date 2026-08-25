import Card from '../../components/ui/Card.jsx'
import Toggle from '../../components/ui/Toggle.jsx'
import { useSettings } from '../../hooks/useSettings.js'

export default function DisplayPreferences() {
  const { settings, updateSettings } = useSettings()

  return (
    <Card title="Display" subtitle="Applies immediately in this browser">
      <div className="divide-y divide-slate-100">
        <Toggle
          checked={settings.chartAnimations}
          onChange={(value) => updateSettings({ chartAnimations: value })}
          label="Chart animations"
          description="Animate charts as data loads"
        />
        <Toggle
          checked={settings.reducedMotion}
          onChange={(value) => updateSettings({ reducedMotion: value })}
          label="Reduced motion"
          description="Minimise animations and transitions across the app"
        />
      </div>
    </Card>
  )
}
