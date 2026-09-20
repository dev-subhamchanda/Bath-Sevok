import React, { useState } from "react";
import { useRoadStore } from "@/stores/roadStore";
import { TabSwitcher } from "@/components/common/TabSwitcher";
import { KpiCard } from "@/components/common/KpiCard";

export const AnalyticsPage: React.FC = () => {
  const [timeHorizon, setTimeHorizon] = useState<"24h" | "7d" | "30d" | "monsoon">("7d");
  const roads = useRoadStore((s) => s.roads);

  const accessibleCount = roads.filter((r) => r.status === "accessible").length || 42;
  const atRiskCount = roads.filter((r) => r.status === "at_risk" || r.status === "under_observation").length || 7;
  const blockedCount = roads.filter((r) => r.status === "blocked").length || 2;
  const totalCorridors = accessibleCount + atRiskCount + blockedCount;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto pb-12">
      {/* Top Command & Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 p-6 bg-white rounded-xl border border-[#e5e8ee] shadow-xs">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2 text-[#72777f] text-xs uppercase tracking-wider font-semibold">
            <span>Sector 4</span>
            <span>/</span>
            <span className="sm:hidden text-[#003356] font-bold">Risk Engine #902</span>
            <span className="hidden sm:inline">Regional Terrain & Arterial Telemetry</span>
            <span className="hidden sm:inline">/</span>
            <span className="hidden sm:inline text-[#003356] font-bold">Predictive Risk Engine #902</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#003356] tracking-tight">
            <span className="sm:hidden">Risk Intelligence</span>
            <span className="hidden sm:inline">Analytics & Risk Intelligence</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#42474e] leading-relaxed">
            <span className="sm:hidden">Vulnerability analysis & delivery SLA forecasts.</span>
            <span className="hidden sm:inline">Operational corridor vulnerabilities, weather-impact forecasts, delivery SLA variance, and fleet risk distribution across North Eastern transit gateways.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Time Horizon Selector */}
          <TabSwitcher<"24h" | "7d" | "30d" | "monsoon">
            tabs={[
              { id: "24h", shortLabel: "24h", label: "Last 24 Hours" },
              { id: "7d", shortLabel: "7d", label: "7 Days" },
              { id: "30d", shortLabel: "30d", label: "30 Days" },
              { id: "monsoon", shortLabel: "Monsoon", label: "Monsoon Season" }
            ]}
            activeTab={timeHorizon}
            onTabChange={setTimeHorizon}
          />

          <button
            type="button"
            onClick={() => alert("Generating Intelligence Analytics Report...")}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Report (PDF/CSV)</span>
          </button>
        </div>
      </div>

      {/* Section 1: Accessibility Summary & Corridor Posture (KPIs) */}
      <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
        <KpiCard
          label="Monitored Corridors"
          value={totalCorridors}
          unit="Total Arterials"
          footerIcon="hub"
          footerIconColor="text-[#005148]"
          footerText="8 States Real-time Grid"
        />
        <KpiCard
          label="Accessible Corridors"
          value={accessibleCount}
          subtitle="Clear Flow"
          badgeText="82.4%"
          badgeVariant="success"
          footerIcon="check_circle"
          footerIconColor="text-[#2e7d32]"
          footerText="Standard travel times recorded"
        />
        <KpiCard
          label="At Risk / Degrading"
          value={atRiskCount}
          subtitle="Under Advisory"
          badgeText="13.7%"
          badgeVariant="warning"
          footerIcon="warning"
          footerIconColor="text-[#d97706]"
          footerText="Speed caps & single lane flow"
        />
        <KpiCard
          label="Blocked / Critical"
          value={blockedCount}
          subtitle="Passes Severed"
          badgeText="3.9%"
          badgeVariant="danger"
          footerIcon="block"
          footerIconColor="text-[#ba1a1a]"
          footerText="Emergency clearing active"
        />
        <KpiCard
          label="Avg Disruption Resolution"
          value="5.4"
          unit="hours"
          footerIcon="trending_down"
          footerIconColor="text-[#005148]"
          footerText="-1.2h vs monsoon baseline"
        />
      </section>

      {/* Section 2: Route Risk Distribution Bar */}
      <section className="bg-white p-6 rounded-xl border border-[#e5e8ee] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#e5e8ee]">
          <div>
            <h2 className="text-base font-semibold text-[#003356]">
              Route Risk Distribution ({timeHorizon.toUpperCase()} Assessment)
            </h2>
            <p className="text-xs text-[#72777f]">
              Real-time arterial susceptibility index evaluated across gradient stability, catchment runoff, and vehicle gross weight.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#f1f4fa] text-xs text-[#72777f]">
            Updated 14 mins ago
          </span>
        </div>

        <div className="p-4 rounded-lg bg-[#f8fafc] border border-[#e5e8ee] mb-4">
          <div className="h-3 w-full rounded-full flex overflow-hidden gap-1 mb-3">
            <div className="bg-[#2e7d32] h-full" style={{ width: "67%" }} title="Low Risk: 67%" />
            <div className="bg-[#d97706] h-full" style={{ width: "16%" }} title="Moderate Risk: 16%" />
            <div className="bg-[#dc2626] opacity-75 h-full" style={{ width: "13%" }} title="High Risk: 13%" />
            <div className="bg-[#93000a] h-full" style={{ width: "4%" }} title="Critical Risk: 4%" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#2e7d32]" />
              <span className="font-semibold text-[#181c20]">Low Risk: 34 Corridors (67%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#d97706]" />
              <span className="font-semibold text-[#181c20]">Moderate: 8 Corridors (16%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#dc2626]" />
              <span className="font-semibold text-[#181c20]">High Risk: 7 Corridors (13%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#93000a]" />
              <span className="font-semibold text-[#181c20]">Critical: 2 Corridors (4%)</span>
            </div>
          </div>
        </div>

        {/* Corridor Vulnerability Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f1f4fa] uppercase text-[11px] text-[#72777f] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Highway Corridor</th>
                <th className="py-2.5 px-3">Top Vulnerability Trigger</th>
                <th className="py-2.5 px-3">Historical Disruptions (Monsoon)</th>
                <th className="py-2.5 px-3">SLA Impact</th>
                <th className="py-2.5 px-3">AI Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ee]">
              <tr>
                <td className="py-3 px-3 font-semibold text-[#003356]">NH-13 (Bomdila Pass)</td>
                <td className="py-3 px-3 text-[#ba1a1a]">Steep slope mudslides & rockfalls</td>
                <td className="py-3 px-3">14 incidents / 30 days</td>
                <td className="py-3 px-3 font-semibold text-[#ba1a1a]">+180 min delay</td>
                <td className="py-3 px-3 text-[#181c20]">Route via Tezpur lowlands recommended</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[#003356]">NH-6 (Guwahati-Shillong)</td>
                <td className="py-3 px-3 text-[#d97706]">Catchment waterlogging & culvert overflows</td>
                <td className="py-3 px-3">6 incidents / 30 days</td>
                <td className="py-3 px-3 font-semibold text-[#d97706]">+45 min delay</td>
                <td className="py-3 px-3 text-[#181c20]">Jowai southern bypass alternate active</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[#003356]">NH-29 (Dimapur-Kohima)</td>
                <td className="py-3 px-3 text-[#d97706]">Slope saturation & axle load constraints</td>
                <td className="py-3 px-3">9 incidents / 30 days</td>
                <td className="py-3 px-3 font-semibold text-[#d97706]">+60 min delay</td>
                <td className="py-3 px-3 text-[#181c20]">Staging at Zubza checkpoint enforced</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[#003356]">NH-10 (Sevoke-Teesta-Gangtok)</td>
                <td className="py-3 px-3 text-[#d97706]">River valley erosion & mist</td>
                <td className="py-3 px-3">8 incidents / 30 days</td>
                <td className="py-3 px-3 font-semibold text-[#d97706]">+75 min delay</td>
                <td className="py-3 px-3 text-[#181c20]">Escorted convoy transit protocol</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
