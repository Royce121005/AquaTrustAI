import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createFacilityApi } from '../api/facilities';
import { Building2, ArrowLeft, Plus } from 'lucide-react';

export const FacilityCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [facilityName, setFacilityName] = useState<string>('');
  const [facilityType, setFacilityType] = useState<string>('municipal_stp');
  const [capacity, setCapacity] = useState<string>('120');
  const [capacityUnit, setCapacityUnit] = useState<string>('MLD');
  const [locationJson, setLocationJson] = useState<string>('{\n  "city": "Lucknow",\n  "state": "Uttar Pradesh",\n  "river_basin": "Gomti"\n}');

  const createMutation = useMutation({
    mutationFn: () => {
      let parsedLoc = {};
      try {
        parsedLoc = JSON.parse(locationJson);
      } catch {
        // use empty
      }
      return createFacilityApi({
        facility_name: facilityName,
        facility_type: facilityType,
        capacity: capacity ? parseFloat(capacity) : undefined,
        capacity_unit: capacityUnit || undefined,
        location: parsedLoc,
        status: 'active',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      navigate(`/facilities/${data.facility_id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/facilities" className="hover:text-cyan-600 dark:hover:text-[#0EA5E9] inline-flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Facilities
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200 dark:border-[#1F293D] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Register New Treatment Facility
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Admin operation: registers new wastewater treatment plant in central platform catalog.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#111827] border border-slate-300 dark:border-[#1F293D] text-[10px] font-mono uppercase tracking-widest text-[#0EA5E9] font-bold">
          ADMIN ONLY
        </span>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-6 shadow-sm dark:shadow-xl space-y-4 transition-colors">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Facility Name
            </label>
            <input
              type="text"
              required
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              placeholder="e.g. Bharwara STP Lucknow Phase II"
              className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Facility Classification Type
            </label>
            <select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="municipal_stp">municipal_stp (Sewage Treatment Plant)</option>
              <option value="industrial_cetp">industrial_cetp (Common Effluent Treatment)</option>
              <option value="etp">etp (Industrial Effluent Treatment)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Design Capacity
              </label>
              <input
                type="number"
                step="any"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="120"
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Capacity Unit
              </label>
              <input
                type="text"
                value={capacityUnit}
                onChange={(e) => setCapacityUnit(e.target.value)}
                placeholder="MLD"
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg px-3.5 py-2.5 font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Geographic Location (JSON Object)
            </label>
            <textarea
              rows={4}
              value={locationJson}
              onChange={(e) => setLocationJson(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg p-3 font-mono text-slate-900 dark:text-white text-[11px] focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold uppercase tracking-wider text-xs shadow-sm dark:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Registering Facility...' : 'Register Facility'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
