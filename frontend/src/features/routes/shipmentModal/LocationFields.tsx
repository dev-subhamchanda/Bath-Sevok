import React, { useState, useRef, useEffect } from "react";
import { searchLocations, type RegionalLocation } from "@/services/mock/driversData";

interface LocationFieldsProps {
  originText: string;
  onOriginChange: (val: string) => void;
  onSelectOrigin: (loc: RegionalLocation) => void;
  destinationText: string;
  onDestinationChange: (val: string) => void;
  onSelectDestination: (loc: RegionalLocation) => void;
}

export const LocationFields: React.FC<LocationFieldsProps> = ({
  originText,
  onOriginChange,
  onSelectOrigin,
  destinationText,
  onDestinationChange,
  onSelectDestination
}) => {
  const [originSuggestionsOpen, setOriginSuggestionsOpen] = useState(false);
  const [destinationSuggestionsOpen, setDestinationSuggestionsOpen] = useState(false);
  const originWrapperRef = useRef<HTMLDivElement>(null);
  const destinationWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (originWrapperRef.current && !originWrapperRef.current.contains(e.target as Node)) {
        setOriginSuggestionsOpen(false);
      }
      if (destinationWrapperRef.current && !destinationWrapperRef.current.contains(e.target as Node)) {
        setDestinationSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const originSuggestions = searchLocations(originText).slice(0, 6);
  const destinationSuggestions = searchLocations(destinationText).slice(0, 6);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e5e8ee]">
      {/* Start Location (Origin Hub) */}
      <div ref={originWrapperRef} className="relative flex flex-col gap-1.5">
        <label className="text-xs font-bold text-[#003356] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Start Location</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">Origin Hub</span>
        </label>

        <div className="relative">
          <input
            type="text"
            required
            value={originText}
            onChange={(e) => {
              onOriginChange(e.target.value);
              setOriginSuggestionsOpen(true);
            }}
            onFocus={() => setOriginSuggestionsOpen(true)}
            placeholder="Type city name (e.g. Guwahati)"
            className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-semibold text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:outline-none"
          />
          <span className="absolute right-2.5 top-2.5 material-symbols-outlined text-[18px] text-emerald-600 pointer-events-none">
            check
          </span>
        </div>

        {/* Origin Autocomplete Suggestions */}
        {originSuggestionsOpen && originSuggestions.length > 0 && (
          <div className="absolute top-[68px] left-0 right-0 z-30 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {originSuggestions.map((loc) => (
              <button
                key={`origin-${loc.name}`}
                type="button"
                onClick={() => {
                  onSelectOrigin(loc);
                  setOriginSuggestionsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
              >
                <div className="flex flex-col">
                  <strong className="text-slate-800 font-semibold">{loc.name}</strong>
                  <span className="text-[10px] text-slate-500 truncate">{loc.fullName}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                  {loc.state}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Destination Location (Terminal Hub) */}
      <div ref={destinationWrapperRef} className="relative flex flex-col gap-1.5">
        <label className="text-xs font-bold text-[#003356] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Destination</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">Terminal Hub</span>
        </label>

        <div className="relative">
          <input
            type="text"
            required
            value={destinationText}
            onChange={(e) => {
              onDestinationChange(e.target.value);
              setDestinationSuggestionsOpen(true);
            }}
            onFocus={() => setDestinationSuggestionsOpen(true)}
            placeholder="Type city name (e.g. Shillong)"
            className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-semibold text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:outline-none"
          />
          <span className="absolute right-2.5 top-2.5 material-symbols-outlined text-[18px] text-emerald-600 pointer-events-none">
            check
          </span>
        </div>

        {/* Destination Autocomplete Suggestions */}
        {destinationSuggestionsOpen && destinationSuggestions.length > 0 && (
          <div className="absolute top-[68px] left-0 right-0 z-30 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {destinationSuggestions.map((loc) => (
              <button
                key={`dest-${loc.name}`}
                type="button"
                onClick={() => {
                  onSelectDestination(loc);
                  setDestinationSuggestionsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
              >
                <div className="flex flex-col">
                  <strong className="text-slate-800 font-semibold">{loc.name}</strong>
                  <span className="text-[10px] text-slate-500 truncate">{loc.fullName}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                  {loc.state}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
