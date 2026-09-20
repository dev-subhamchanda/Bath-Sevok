import React from "react";
import { useRoadStore } from "@/stores/roadStore";
import { StatusBadge } from "@/components/common/StatusBadge";

export const ArterialMatrixTable: React.FC = () => {
  const roads = useRoadStore((s) => s.roads);
  const selectRoad = useRoadStore((s) => s.selectRoad);
  const selectedRoadId = useRoadStore((s) => s.selectedRoadId);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,51,86,0.05)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base font-bold text-[#003356]">
            Priority Arterial Status Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Live telemetry from border control checkpoints, IMD synoptic feeds & BRO patrol sectors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-slate-100 text-xs font-bold text-[#003356] border border-slate-200/60">
            {roads.length} Key Highways Tracked
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 uppercase text-[11px] text-slate-500 font-bold tracking-wider rounded-xl">
            <tr>
              <th className="py-3.5 px-4 rounded-l-xl">Highway</th>
              <th className="py-3.5 px-4">Arterial Corridor</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Accessibility Score</th>
              <th className="py-3.5 px-4">Speed / Flow</th>
              <th className="py-3.5 px-4">Terrain Risk</th>
              <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roads.map((road) => {
              const isSelected = selectedRoadId === road.id;
              const isBlocked = road.status === "blocked";
              const isAtRisk = road.status === "at_risk" || road.status === "under_observation";

              return (
                <tr
                  key={road.id}
                  onClick={() => selectRoad(road.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-sky-50/60 font-medium"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <td className="py-3.5 px-4">
                    {/* Highway Shield Badge */}
                    <div className="inline-flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                          isBlocked
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : isAtRisk
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-white text-[#15803d] border-[#15803d]"
                        }`}
                      >
                        {road.id}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-900">
                    <div className="font-bold">{road.name}</div>
                    <div className="text-[11px] text-slate-500">{road.sector || road.description}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge type="road" status={road.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            road.accessibilityScore >= 80
                              ? "bg-emerald-600"
                              : road.accessibilityScore >= 50
                              ? "bg-amber-500"
                              : "bg-rose-600"
                          }`}
                          style={{ width: `${road.accessibilityScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        {road.accessibilityScore}/100
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="font-semibold text-slate-800 font-mono">
                      {road.speedKph ? `${road.speedKph} km/h` : "Halted (0 km/h)"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[11px] text-slate-600">
                      Flood:{" "}
                      <strong className={road.floodRisk > 0.6 ? "text-rose-600" : "text-slate-800"}>
                        {Math.round(road.floodRisk * 100)}%
                      </strong>
                      {" • "}
                      Slope:{" "}
                      <strong className={road.landslideRisk > 0.6 ? "text-rose-600" : "text-slate-800"}>
                        {Math.round(road.landslideRisk * 100)}%
                      </strong>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-[#003356] transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
