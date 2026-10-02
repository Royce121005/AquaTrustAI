import React, { useState } from 'react';
import { ArrowRight, History } from 'lucide-react';

export interface ChainNode {
  record_id: string;
  record_version: number;
  record_state: string;
  compliance_status: string;
  canonical_hash?: string | null;
  supersedes_record_id?: string | null;
  created_at: string;
}

export const CorrectionLineageTree: React.FC<{ chain: ChainNode[] }> = ({ chain }) => {
  const [selectedNode, setSelectedNode] = useState<ChainNode | null>(chain[0] || null);

  if (!chain || chain.length === 0) return null;

  return (
    <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <History size={16} /> 21 CFR Part 11 Append-Only Correction Lineage Tree
        </h4>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
          Original Records Preserved • No In-Place Mutation
        </span>
      </div>

      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
        When laboratory assays or calibration adjustments occur, original records are immutably preserved as <code style={{ color: '#fbbf24' }}>superseded_by_correction</code>, while versioned successors (v+1) are anchored to Hyperledger Fabric.
      </div>

      {/* Visual Lineage Nodes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflowX: 'auto', padding: '0.5rem 0' }}>
        {chain.map((node, index) => {
          const isSuperseded = node.record_state === 'superseded_by_correction';
          const isSelected = selectedNode?.record_id === node.record_id;

          return (
            <React.Fragment key={node.record_id}>
              <div
                onClick={() => setSelectedNode(node)}
                style={{
                  background: isSelected ? '#1e293b' : '#0f172a',
                  border: `2px solid ${isSelected ? '#38bdf8' : isSuperseded ? '#f59e0b' : '#22c55e'}`,
                  borderRadius: '6px',
                  padding: '0.6rem 0.8rem',
                  minWidth: '180px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>
                    VERSION {node.record_version}
                  </span>
                  <span
                    style={{
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      background: isSuperseded ? '#451a03' : '#052e16',
                      color: isSuperseded ? '#fbbf24' : '#4ade80',
                    }}
                  >
                    {isSuperseded ? 'SUPERSEDED' : 'VALID / ACTIVE'}
                  </span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#f8fafc', marginBottom: '0.2rem' }}>
                  {node.record_id.slice(0, 8)}...
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Hash: {node.canonical_hash ? `${node.canonical_hash.slice(0, 8)}...` : 'N/A'}
                </div>
              </div>

              {index < chain.length - 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#38bdf8' }}>
                  <ArrowRight size={18} />
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Supersedes</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div style={{ marginTop: '1rem', background: '#030712', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.75rem', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: '#94a3b8' }}>Full Record UUID: <code style={{ color: '#38bdf8' }}>{selectedNode.record_id}</code></span>
            <span style={{ color: '#94a3b8' }}>Compliance: <strong style={{ color: '#4ade80' }}>{selectedNode.compliance_status.toUpperCase()}</strong></span>
          </div>
          <div style={{ color: '#94a3b8', wordBreak: 'break-all' }}>
            Canonical SHA-256 Digest: <code style={{ color: '#f8fafc' }}>{selectedNode.canonical_hash || 'SHA-256 PENDING'}</code>
          </div>
        </div>
      )}
    </div>
  );
};
