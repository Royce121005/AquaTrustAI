import Card from '../ui/Card.jsx'

export default function ChartCard({ title, subtitle, actions, heightClass = 'h-72', className = '', children }) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={className}
      bodyClassName={`relative w-full ${heightClass}`}
    >
      {children}
    </Card>
  )
}
