import {
  LayoutDashboard,
  Network,
  Bell,
  Waves,
  BrainCircuit,
  FileCheck2,
  Boxes,
  Settings,
  ShieldCheck,
  Scale,
} from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Auditor Workspace', to: '/auditor', icon: ShieldCheck },
  { label: 'Regulator Console', to: '/regulator', icon: Scale },
  { label: 'Process Mimic', to: '/process', icon: Network },
  { label: 'Alarm Console', to: '/alarms', icon: Bell },
  { label: 'Monitoring', to: '/monitoring', icon: Waves },
  { label: 'AI Insights', to: '/insights', icon: BrainCircuit },
  { label: 'Compliance', to: '/compliance', icon: FileCheck2 },
  { label: 'Blockchain', to: '/blockchain', icon: Boxes },
  { label: 'Settings', to: '/settings', icon: Settings },
]
