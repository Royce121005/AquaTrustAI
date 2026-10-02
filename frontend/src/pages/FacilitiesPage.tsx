import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listFacilitiesApi } from '../api/facilities';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { StatusBadge } from '../components/common/Badges';
import { Building2, Plus, ArrowRight, Gauge } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FacilitiesPage: React.FC = () => {
  const { user } = useAuth();
  const { data: facilities, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Registered Treatment Facilities
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Wastewater treatment plants, monitoring stations, and municipal discharge infrastructure.
          </p>
        </div>
        {user?.role === 'admin' && (
          <Link
            to="/admin/facilities/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Facility
          </Link>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Fetching registered facilities..." />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !facilities || facilities.length === 0 ? (
        <EmptyState
          title="No Facilities Registered"
          message="No wastewater treatment facilities are registered in the system."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((fac) => (
            <div
              key={fac.facility_id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-50 text-brand-600 rounded-md">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                        {fac.facility_name}
                      </h2>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {fac.facility_type}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={fac.status} />
                </div>

                <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Facility ID:</span>
                    <span className="font-mono text-slate-700 select-all">
                      {fac.facility_id.slice(0, 13)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Design Capacity:</span>
                    <span className="font-mono text-slate-700">
                      {fac.capacity !== null ? `${fac.capacity} ${fac.capacity_unit || ''}` : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered:</span>
                    <span className="text-slate-700">
                      {new Date(fac.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/facilities/${fac.facility_id}`}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
                >
                  Inspect Facility & Sensors
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/readings?facility_id=${fac.facility_id}`}
                  className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
                >
                  View Telemetry
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
