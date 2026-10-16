'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Clock,
  Camera,
  CheckCircle2,
  XCircle,
  Navigation,
  Calendar,
  Route,
  TrendingUp,
  Users,
  Timer,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useDepotInventory,
  useProofPhotos,
  useVisits,
  type Visit,
} from '@/features/visits-management';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  checkedOut: 'bg-green-50 text-green-600 border-green-100',
  checkedIn: 'bg-blue-50 text-blue-600 border-blue-100',
  arrived: 'bg-blue-50 text-blue-600 border-blue-100',
  enRoute: 'bg-amber-50 text-amber-600 border-amber-100',
  pending: 'bg-gray-50 text-gray-500 border-gray-100',
  missed: 'bg-red-50 text-red-600 border-red-100',
};

const statusLabels: Record<string, string> = {
  checkedOut: 'Completed',
  checkedIn: 'Checked In',
  arrived: 'Arrived',
  enRoute: 'In Progress',
  pending: 'Scheduled',
  missed: 'Missed',
};

const fraudColors: Record<string, string> = {
  critical: 'border-l-4 border-l-red-600 bg-red-50/50',
  high: 'border-l-4 border-l-red-500 bg-red-50/30',
  medium: 'border-l-4 border-l-orange-400',
  low: 'border-l-4 border-l-yellow-400',
  none: '',
};

export default function VisitsPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: visitsData, isLoading, error } = useVisits({
    pageNumber: 1,
    pageSize: 50,
    date: new Date().toISOString().split('T')[0]
  });

  const visits = visitsData?.items || [];
  
  // Calculate stats
  const completed = visits.filter(v => v.status === 'checkedOut').length;
  const inProgress = visits.filter(v => ['enRoute', 'arrived', 'checkedIn'].includes(v.status)).length;
  const total = visits.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Today's Visits", value: total.toString(), total: '', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', progress: 100 },
          { label: 'Completed', value: completed.toString(), total: total.toString(), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', progress: completionRate },
          { label: 'In Progress', value: inProgress.toString(), total: total.toString(), icon: Timer, color: 'text-amber-600', bg: 'bg-amber-50', progress: total > 0 ? (inProgress / total) * 100 : 0 },
          { label: 'Completion Rate', value: `${completionRate}%`, total: '', icon: TrendingUp, color: 'text-sky-600', bg: 'bg-sky-50', progress: completionRate },
        ].map((s, i) => (
          <Card key={s.label} className="p-5 border-gray-100 card-shadow hover:card-shadow-hover transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.bg}`}>
                <s.icon size={18} className={s.color} />
              </div>
              {s.total && <span className="text-[11px] text-gray-400">of {s.total}</span>}
            </div>
            <p className="text-[12px] text-gray-400 font-500 mb-1" style={{ fontWeight: 500 }}>{s.label}</p>
            <p className="text-[24px] font-700 text-gray-900 mb-3" style={{ fontWeight: 700 }}>{s.value}</p>
            <div className="h-1.5 rounded-full bg-gray-50 overflow-hidden">
              <div className="h-full rounded-full gradient-primary transition-all duration-1000" style={{ width: `${s.progress}%` }} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Visit Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-700 text-gray-900" style={{ fontWeight: 700 }}>Today&apos;s Visit Cards</h2>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-[12px]"
              onClick={() => router.push('/planning/map')}
            >
              <Route size={14} className="mr-1.5" /> Daily Route
            </Button>
          </div>
          
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <p className="text-[12px]">Loading visits...</p>
            </div>
          )}
          
          {error && !isLoading && (
            <div className="py-12 text-center text-red-500 text-[13px]">
              Failed to load visits. Please try again.
            </div>
          )}

          {!isLoading && !error && visits.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-[13px]">
              No visits planned for today.
            </div>
          )}

          {!isLoading && !error && visits.map((visit, i) => {
            const hasFraud = visit.fraudSeverity && visit.fraudSeverity !== 'none';
            const fraudClass = hasFraud ? fraudColors[visit.fraudSeverity!] : '';
            
            return (
            <Card key={visit.id || `row-${i}`} className={`p-5 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up opacity-0 ${fraudClass}`} style={{ borderRadius: '18px', animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>{visit.customerName || visit.customerId}</p>
                    <p className="text-[11px] text-gray-400">{visit.repName || visit.repId}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-600 border flex-shrink-0 ${statusColors[visit.status]}`} style={{ fontWeight: 600 }}>
                  {statusLabels[visit.status] || visit.status}
                </span>
              </div>
              
              {hasFraud && (
                <div className="mt-3 p-2 rounded-lg bg-red-50/50 text-red-700 text-[11px] flex items-start gap-2 border border-red-100">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-600 block mb-0.5">Fraud Alert ({visit.fraudSeverity})</span>
                    <span className="opacity-80">Flags: {visit.fraudCodes?.join(', ') || 'Unknown'}</span>
                    {visit.hasOverride && visit.overrideReason && (
                      <span className="block mt-1 pt-1 border-t border-red-200/50 font-medium">Override Reason: {visit.overrideReason}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Check In</p>
                  <p className="text-[12px] font-600 text-gray-700" style={{ fontWeight: 600 }}>{visit.checkedInAt ? format(new Date(visit.checkedInAt), 'hh:mm a') : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Check Out</p>
                  <p className="text-[12px] font-600 text-gray-700" style={{ fontWeight: 600 }}>{visit.checkedOutAt ? format(new Date(visit.checkedOutAt), 'hh:mm a') : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Planned</p>
                  <p className="text-[12px] font-600 text-gray-700 flex items-center gap-1" style={{ fontWeight: 600 }}>
                    <Clock size={11} /> {visit.plannedArrival ? format(new Date(visit.plannedArrival), 'hh:mm a') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">GPS Distance</p>
                  <p className="text-[12px] font-600 text-blue-500 flex items-center gap-1" style={{ fontWeight: 600 }}>
                    <Navigation size={11} /> {visit.reportedDistanceMetres != null ? `${visit.reportedDistanceMetres}m` : 'Unknown'}
                  </p>
                </div>
              </div>
              {visit.hasProofPhoto && (
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === visit.id ? null : visit.id)}
                  className="mt-3 flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors"
                  aria-expanded={expandedId === visit.id}
                >
                  <Camera size={14} />
                  <span className="text-[11px]">
                    {expandedId === visit.id ? 'Hide photos & stock audit' : 'Photo attached · view evidence'}
                  </span>
                </button>
              )}
              {expandedId === visit.id && <VisitEvidence visitId={visit.id} />}
            </Card>
          )})}
        </div>

        {/* Timeline */}
        <div className="space-y-5">
          <Card className="p-5 border-gray-100 card-shadow animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <h3 className="text-[14px] font-700 text-gray-900 mb-4" style={{ fontWeight: 700 }}>Activity Timeline</h3>
            
            {isLoading && (
               <div className="py-8 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
            )}

            {!isLoading && visits.length === 0 && (
               <div className="py-8 text-center text-[12px] text-gray-400">No activity yet.</div>
            )}

            {!isLoading && visits.length > 0 && (
              <div className="space-y-1">
                {visits.filter(v => v.checkedInAt).slice(0, 5).map((visit, i) => (
                  <div key={visit.id || `event-${i}`} className="flex gap-3 animate-fade-in-up opacity-0" style={{ animationDelay: `${250 + i * 50}ms`, animationFillMode: 'forwards' }}>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${visit.status === 'checkedOut' ? 'bg-blue-50' : 'bg-green-50'}`}>
                        {visit.status === 'checkedOut' ? <XCircle size={14} className="text-blue-500" /> : <CheckCircle2 size={14} className="text-green-500" />}
                      </div>
                      {i < 4 && <div className="w-px h-6 bg-gray-100" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-[11px] text-gray-400">{format(new Date(visit.checkedInAt!), 'hh:mm a')}</p>
                      <p className="text-[12px] font-600 text-gray-800 mt-0.5" style={{ fontWeight: 600 }}>{visit.status === 'checkedOut' ? 'Checked out' : 'Checked in'} at {visit.customerName || visit.customerId}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{visit.repName || visit.repId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const bandColors: Record<string, string> = {
  low: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-amber-50 text-amber-600 border-amber-100',
  high: 'bg-green-50 text-green-600 border-green-100',
};

/** Proof photos and the stock audit captured at one visit. */
function VisitEvidence({ visitId }: { visitId: string }) {
  const { data: photos, isLoading: photosLoading } = useProofPhotos(visitId);
  const { data: inventory, isLoading: inventoryLoading } = useDepotInventory(visitId);

  if (photosLoading || inventoryLoading) {
    return (
      <div className="mt-3 py-4 flex justify-center text-gray-400">
        <Loader2 className="animate-spin" size={16} />
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-50 space-y-3">
      {photos && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) =>
            photo.contentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={photo.contentUrl}
                alt="Visit proof photo"
                className="w-full aspect-[4/3] object-cover rounded-xl border border-gray-100"
              />
            ) : null
          )}
        </div>
      )}
      {inventory && inventory.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1.5">Stock audit</p>
          <div className="flex flex-wrap gap-1.5">
            {inventory.map((item) => (
              <span
                key={item.itemId}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${bandColors[item.band]}`}
                title={String((item as { name?: string }).name ?? item.itemId)}
              >
                {String((item as { name?: string }).name ?? item.itemId)} · {item.band}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
