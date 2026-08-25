// PROVISIONAL — pending backend contract
// Report contents are illustrative placeholders, NOT official records.
import { respondWith } from './mockUtils.js'

const COMPLIANCE_SUMMARY = {
  overallStatus: 'at-risk',
  scorePct: 91,
  openFindings: 2,
  lastAuditAt: '2026-07-30T00:00:00Z',
  breakdown: [
    { id: 'area-sampling', area: 'Sampling', status: 'compliant', findingsCount: 0 },
    { id: 'area-reporting', area: 'Reporting', status: 'at-risk', findingsCount: 1 },
    { id: 'area-documentation', area: 'Documentation', status: 'action-required', findingsCount: 1 },
  ],
}

const REPORT_SUMMARIES = [
  { id: 'RPT-2026-001', title: 'Monthly summary - July 2026', periodStart: '2026-07-01', periodEnd: '2026-07-31', status: 'final', createdAt: '2026-08-02T09:15:00Z' },
  { id: 'RPT-2026-002', title: 'Weekly summary - Week 33', periodStart: '2026-08-10', periodEnd: '2026-08-16', status: 'submitted', createdAt: '2026-08-18T14:40:00Z' },
  { id: 'RPT-2026-003', title: 'Incident review - draft', periodStart: '2026-08-19', periodEnd: '2026-08-25', status: 'draft', createdAt: null },
]

const REPORT_DETAILS = {
  'RPT-2026-001': {
    ...REPORT_SUMMARIES[0],
    generatedBy: 'system',
    summaryText: 'Placeholder narrative: operations remained within expected bounds for the period.',
    sections: [
      { id: 'sec-overview', title: 'Overview', body: 'Placeholder body text for the overview section.' },
      { id: 'sec-readings', title: 'Readings review', body: 'Placeholder body text summarising reviewed readings.' },
      { id: 'sec-actions', title: 'Corrective actions', body: 'Placeholder body text listing follow-up actions.' },
    ],
    findings: [
      { id: 'find-001', severity: 'medium', status: 'open', description: 'Placeholder finding: one reporting deadline was missed.' },
    ],
  },
  'RPT-2026-002': {
    ...REPORT_SUMMARIES[1],
    generatedBy: 'operator',
    summaryText: 'Placeholder narrative: weekly operations summary awaiting final approval.',
    sections: [
      { id: 'sec-overview', title: 'Overview', body: 'Placeholder body text for the weekly overview.' },
      { id: 'sec-findings', title: 'Findings', body: 'Placeholder body text for weekly findings.' },
    ],
    findings: [],
  },
  'RPT-2026-003': {
    ...REPORT_SUMMARIES[2],
    generatedBy: 'system',
    summaryText: 'Placeholder narrative: incident review still in preparation.',
    sections: [
      { id: 'sec-timeline', title: 'Incident timeline', body: 'Placeholder body text for the incident timeline.' },
    ],
    findings: [
      { id: 'find-002', severity: 'low', status: 'investigating', description: 'Placeholder finding: root cause under investigation.' },
    ],
  },
}

export async function getComplianceSummary() {
  return respondWith(COMPLIANCE_SUMMARY)
}

export async function getReports() {
  return respondWith(REPORT_SUMMARIES)
}

export async function getReportById(reportId) {
  const detail = REPORT_DETAILS[reportId]
  if (!detail) {
    throw new Error(`Report "${reportId}" not found`)
  }
  return respondWith(detail)
}
