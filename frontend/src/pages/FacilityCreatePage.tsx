import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createFacilityApi } from '../api/facilities';
import { ErrorState } from '../components/common/States';
import { Building2, ArrowLeft, CheckCircle2, Plus } from 'lucide-react';

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
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/facilities" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Facilities
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-600" />
          Register New Treatment Facility
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Admin operation: creates treatment plant entity in database boundary.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Facility Name
            </label>
            <input
              type="text"
              required
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              placeholder="e.g. Bharwara STP Lucknow Phase II"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Facility Classification Type
            </label>
            <select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
            >
              <option value="municipal_stp">municipal_stp (Sewage Treatment Plant)</option>
              <option value="industrial_cetp">industrial_cetp (Common Effluent Treatment)</option>
              <option value="etp">etp (Industrial Effluent Treatment)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Design Capacity
              </label>
              <input
                type="number"
                step="any"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="120"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Capacity Unit
              </label>
              <input
                type="text"
                value={capacityUnit}
                onChange={(e) => setCapacityUnit(e.target.value)}
                placeholder="MLD"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Geographic Location (JSON Object)
            </label>
            <textarea
              rows={4}
              value={locationJson}
              onChange={(e) => setLocationJson(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-[11px]"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? 'Registering Facility...' : 'Register Facility'}
          </button>
        </form>

        {createMutation.isError && <ErrorState error={createMutation.error} />}
      </div>
    </div>
  );
};
