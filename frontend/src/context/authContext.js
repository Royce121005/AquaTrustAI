import { createContext } from 'react'

export const ROLES = {
  OPERATOR: 'operator',
  AUDITOR: 'auditor',
  REGULATOR: 'regulatory_stakeholder',
  ADMIN: 'admin',
}

export const ROLE_METADATA = {
  [ROLES.OPERATOR]: {
    label: 'Plant Operator',
    badgeTone: 'info',
    description: 'Manages STP plant telemetry, monitors anomalies, and submits correction requests.',
    scope: 'Single Facility (Koramangala STP-01)',
  },
  [ROLES.AUDITOR]: {
    label: 'Independent Auditor',
    badgeTone: 'warning',
    description: 'Verifies SHA-256 hashes against Hyperledger Fabric, inspects tamper lab, and authorizes corrections.',
    scope: 'Multi-Facility Audit Scope',
  },
  [ROLES.REGULATOR]: {
    label: 'Environmental Regulator (CPCB)',
    badgeTone: 'success',
    description: 'Enforces CPCB / NGT effluent standards, reviews compliance certifications, and audits ledger proof.',
    scope: 'National Regulatory Jurisdiction',
  },
  [ROLES.ADMIN]: {
    label: 'System Administrator',
    badgeTone: 'danger',
    description: 'Full administrative access to manage users, facilities, system configuration, and audit logs.',
    scope: 'Enterprise Root Administration',
  },
}

export const AuthContext = createContext(null)
export { default as useAuth } from '../hooks/useAuth.js'
