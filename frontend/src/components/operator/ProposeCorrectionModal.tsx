import React, { useState } from 'react';
import { Send, FileText } from 'lucide-react';
import { post } from '../../services/api';

export const ProposeCorrectionModal: React.FC<{
  recordId: string;
  onProposed: () => void;
  onClose: () => void;
}> = ({ recordId, onProposed, onClose }) => {
  const [justificationCode, setJustificationCode] = useState('LAB_CONFIRMATORY_OVERRIDE');
  const [reason, setReason] = useState('Laboratory grab sample gravimetric assay contradicts optical probe reading.');
  const [bodVal, setBodVal] = useState('8.4');
  const [codVal, setCodVal] = useState('42.0');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; err?: boolean } | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setFeedback({ msg: 'Reason is required for 21 CFR Part 11 audit journal.', err: true });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await post('/corrections/propose', {
        original_record_id: recordId,
        justification_code: justificationCode,
        reason: reason,
        corrected_parameters: {
          BOD: parseFloat(bodVal),
          COD: parseFloat(codVal),
        },
      });
      setFeedback({ msg: 'Correction proposal submitted. Awaiting Compliance Auditor dual-control review.', err: false });
      setTimeout(() => {
        onProposed();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setFeedback({ msg: err instanceof Error ? err.message : 'Failed to submit proposal.', err: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', maxWidth: '480px', width: '100%', padding: '1.25rem', color: '#e2e8f0' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={18} /> Propose Append-Only Record Correction
        </h3>
        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          Target Record: <code style={{ color: '#fff' }}>{recordId.slice(0, 8)}...</code>
        </p>

        {feedback && (
          <div style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', background: feedback.err ? '#450a0a' : '#064e3b', border: `1px solid ${feedback.err ? '#ef4444' : '#059669'}`, color: feedback.err ? '#fca5a5' : '#86efac', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
            {feedback.msg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.78rem' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Justification Standard Code</label>
            <select
              value={justificationCode}
              onChange={(e) => setJustificationCode(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#fff' }}
            >
              <option value="LAB_CONFIRMATORY_OVERRIDE">LAB_CONFIRMATORY_OVERRIDE (Grab sample gravimetric assay)</option>
              <option value="CALIBRATION_DRIFT_COMPENSATION">CALIBRATION_DRIFT_COMPENSATION (Optical probe recalibration)</option>
              <option value="TRANSIENT_POWER_GLITCH">TRANSIENT_POWER_GLITCH (UPS switchover telemetry spike)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Audit Reason</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#fff', fontSize: '0.78rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Corrected BOD (mg/L)</label>
              <input value={bodVal} onChange={(e) => setBodVal(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.2rem' }}>Corrected COD (mg/L)</label>
              <input value={codVal} onChange={(e) => setCodVal(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff' }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.4rem 0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '0.4rem 0.8rem', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Send size={13} /> {loading ? 'Submitting...' : 'Submit Correction Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
};
