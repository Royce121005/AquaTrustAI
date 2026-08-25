import PageHeader from '../../components/ui/PageHeader.jsx'
import AnchoredRecordsTable from '../../features/blockchain/AnchoredRecordsTable.jsx'

export default function BlockchainPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Blockchain"
        subtitle="Anchored records and verification status"
      />
      <AnchoredRecordsTable />
    </div>
  )
}
