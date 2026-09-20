import React from "react";

interface DriverDetailsFieldsProps {
  driverName: string;
  onDriverNameChange: (val: string) => void;
  driverPhone: string;
  onDriverPhoneChange: (val: string) => void;
  driverLicenseId: string;
  onDriverLicenseIdChange: (val: string) => void;
}

export const DriverDetailsFields: React.FC<DriverDetailsFieldsProps> = ({
  driverName,
  onDriverNameChange,
  driverPhone,
  onDriverPhoneChange,
  driverLicenseId,
  onDriverLicenseIdChange
}) => {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#eff6ff]/70 border border-[#cfe4ff]">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#003356] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px] text-[#27638c]">badge</span>
          <span>Driver Details</span>
        </label>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#cfe4ff] text-[#001d34]">
          Manual Entry
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Driver Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#181c20]">
            Driver Name <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={driverName}
              onChange={(e) => onDriverNameChange(e.target.value)}
              placeholder="Enter driver name"
              className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-semibold text-[#181c20] border border-[#cfe4ff] focus:border-[#174a73] focus:outline-none"
            />
            <span className="absolute right-2.5 top-2.5 material-symbols-outlined text-[18px] text-slate-400 pointer-events-none">
              person
            </span>
          </div>
        </div>

        {/* Driver Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#181c20]">
            Driver Phone <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              required
              value={driverPhone}
              onChange={(e) => onDriverPhoneChange(e.target.value)}
              placeholder="Enter phone number"
              className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-semibold text-[#181c20] border border-[#cfe4ff] focus:border-[#174a73] focus:outline-none"
            />
            <span className="absolute right-2.5 top-2.5 material-symbols-outlined text-[18px] text-slate-400 pointer-events-none">
              call
            </span>
          </div>
        </div>

        {/* Driver License / ID */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#181c20]">
            Driver License / ID <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={driverLicenseId}
              onChange={(e) => onDriverLicenseIdChange(e.target.value)}
              placeholder="Enter driver license or ID"
              className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-semibold text-[#181c20] border border-[#cfe4ff] focus:border-[#174a73] focus:outline-none"
            />
            <span className="absolute right-2.5 top-2.5 material-symbols-outlined text-[18px] text-slate-400 pointer-events-none">
              badge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
