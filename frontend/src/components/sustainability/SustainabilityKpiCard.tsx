/**
 * AquaTrust AI — Sustainability & Resource Conservation KPI Card
 * Displays water circularity, freshwater saved, avoided carbon emissions,
 * and chemical waste prevention from Member 2 Phase 5 formulas.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Droplets, Leaf, Zap, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { getSustainabilitySummaryApi } from '../../api/sustainability';

interface SustainabilityKpiCardProps {
  facilityId?: string;
}

export const SustainabilityKpiCard: React.FC<SustainabilityKpiCardProps> = ({ facilityId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['sustainability-summary', facilityId],
    queryFn: () => getSustainabilitySummaryApi(facilityId),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-800/40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const s = data;

  return (
    <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F293D]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sustainability & Circularity KPIs</h3>
            <p className="text-xs text-slate-400">
              Verifiable ESG Impact across {s?.facilities_reporting ?? 1} facility
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-[#10B981]/15 text-emerald-400 border border-[#10B981]/30 rounded-full font-mono">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Verifiable ESG Proof</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Circularity Ratio */}
        <div className="bg-[#161F30]/60 border border-[#1F293D] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono">
            <span>Water Circularity</span>
            <Droplets className="h-4 w-4 text-[#0EA5E9]" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {s?.water_circularity_ratio_pct != null ? `${s.water_circularity_ratio_pct}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {s?.treated_water_reused_kl_day?.toLocaleString() ?? 0} kL/day reused
          </p>
        </div>

        {/* Metric 2: Freshwater Saved */}
        <div className="bg-[#161F30]/60 border border-[#1F293D] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono">
            <span>Freshwater Saved</span>
            <ArrowUpRight className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {s?.freshwater_saved_kl_day?.toLocaleString() ?? 0}
            <span className="text-xs text-slate-400 font-normal ml-1">kL/d</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Potable demand offset</p>
        </div>

        {/* Metric 3: Avoided Carbon */}
        <div className="bg-[#161F30]/60 border border-[#1F293D] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono">
            <span>Avoided Carbon</span>
            <Leaf className="h-4 w-4 text-lime-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {s?.carbon_avoided_kg_co2_day?.toLocaleString() ?? 0}
            <span className="text-xs text-slate-400 font-normal ml-1">kg CO₂e</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Stoichiometric mitigation</p>
        </div>

        {/* Metric 4: Chemical Waste Prevented */}
        <div className="bg-[#161F30]/60 border border-[#1F293D] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono">
            <span>Chemicals Prevented</span>
            <Zap className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {s?.chemical_waste_prevented_kg_day?.toFixed(1) ?? '0.0'}
            <span className="text-xs text-slate-400 font-normal ml-1">kg/d</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Coagulant optimization</p>
        </div>
      </div>

      {s?.esg_verifiable_claim && (
        <div className="mt-3.5 text-xs text-slate-300 bg-[#10B981]/10 border border-[#10B981]/30 p-2.5 rounded-lg flex items-start gap-2 font-mono">
          <span className="text-emerald-400 font-semibold shrink-0">DLT Proof Claim:</span>
          <span>{s.esg_verifiable_claim}</span>
        </div>
      )}
    </div>
  );
};
