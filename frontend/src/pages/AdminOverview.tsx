import React, { useState } from 'react';
import { UserProvisioningModal, FacilityRegistrationCard, SigningKeyTable } from '../components/admin/AdminComponents';
import { Shield, UserPlus, Server } from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const [showUserModal, setShowUserModal] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={18} /> IT/OT Infrastructure & Security Administration
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
            Provision user roles, onboard wastewater treatment nodes, monitor Hyperledger Fabric peer gateway, and inspect cryptographic keys.
          </p>
        </div>
        <button
          onClick={() => setShowUserModal(true)}
          style={{ padding: '0.4rem 0.9rem', background: '#e11d48', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <UserPlus size={14} /> Provision New Account
        </button>
      </div>

      {/* DLT Gateway & Network Health Card */}
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Server size={16} /> Hyperledger Fabric DLT Gateway Health (Bridge :8099)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Channel</div>
            <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>aquatrust-channel</strong>
          </div>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Chaincode</div>
            <strong style={{ color: '#38bdf8', fontSize: '0.85rem' }}>aquatrust-records_1.0.1</strong>
          </div>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Latest Ledger Block</div>
            <strong style={{ color: '#4ade80', fontSize: '0.85rem' }}>Block #104 (Committed)</strong>
          </div>
          <div style={{ background: '#030712', padding: '0.6rem', borderRadius: '4px' }}>
            <div style={{ color: '#64748b' }}>Consensus MSPs</div>
            <strong style={{ color: '#a855f7', fontSize: '0.85rem' }}>Org1MSP & Org2MSP (2-of-2)</strong>
          </div>
        </div>
      </div>

      {/* Facility Onboarding */}
      <FacilityRegistrationCard onCreated={() => {}} />

      {/* Cryptographic Key Table */}
      <SigningKeyTable />

      {showUserModal && <UserProvisioningModal onClose={() => setShowUserModal(false)} />}
    </div>
  );
};
