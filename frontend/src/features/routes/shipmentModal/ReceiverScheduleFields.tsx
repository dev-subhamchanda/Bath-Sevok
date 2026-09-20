import React from "react";

interface ReceiverScheduleFieldsProps {
  pickupTime: string;
  onPickupTimeChange: (val: string) => void;
  expectedDelivery: string;
  onExpectedDeliveryChange: (val: string) => void;
  receiverName: string;
  onReceiverNameChange: (val: string) => void;
  receiverFacility: string;
  onReceiverFacilityChange: (val: string) => void;
  receiverPhone: string;
  onReceiverPhoneChange: (val: string) => void;
  specialInstructions: string;
  onSpecialInstructionsChange: (val: string) => void;
}

export const ReceiverScheduleFields: React.FC<ReceiverScheduleFieldsProps> = ({
  pickupTime,
  onPickupTimeChange,
  expectedDelivery,
  onExpectedDeliveryChange,
  receiverName,
  onReceiverNameChange,
  receiverFacility,
  onReceiverFacilityChange,
  receiverPhone,
  onReceiverPhoneChange,
  specialInstructions,
  onSpecialInstructionsChange
}) => {
  return (
    <>
      {/* Pickup and Expected Delivery Schedules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#181c20] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#27638c]">calendar_today</span>
            <span>Pickup Date & Time</span>
          </label>
          <input
            type="datetime-local"
            required
            value={pickupTime}
            onChange={(e) => onPickupTimeChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#181c20] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#005148]">event_available</span>
            <span>Expected Delivery Date & Time</span>
          </label>
          <input
            type="datetime-local"
            required
            value={expectedDelivery}
            onChange={(e) => onExpectedDeliveryChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Receiver / Contact Details */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e5e8ee]">
        <label className="text-xs font-bold text-[#003356] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px] text-[#27638c]">contact_phone</span>
          <span>Receiver / Point of Contact Details</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            required
            value={receiverName}
            onChange={(e) => onReceiverNameChange(e.target.value)}
            placeholder="Receiver Officer Name"
            className="w-full h-9 px-3 rounded-lg bg-white text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:outline-none"
          />
          <input
            type="text"
            required
            value={receiverFacility}
            onChange={(e) => onReceiverFacilityChange(e.target.value)}
            placeholder="Receiving Facility / Unit"
            className="w-full h-9 px-3 rounded-lg bg-white text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:outline-none"
          />
          <input
            type="text"
            required
            value={receiverPhone}
            onChange={(e) => onReceiverPhoneChange(e.target.value)}
            placeholder="Contact Phone #"
            className="w-full h-9 px-3 rounded-lg bg-white text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:outline-none"
          />
        </div>
      </div>

      {/* Special Instructions */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-[#181c20] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#d97706]">assignment</span>
          <span>Special Instructions / Transit Protocols</span>
        </label>
        <textarea
          rows={2}
          value={specialInstructions}
          onChange={(e) => onSpecialInstructionsChange(e.target.value)}
          placeholder="e.g. Temperature monitoring requirements, hazardous materials protocol, road clearance permit note..."
          className="w-full p-3 rounded-xl bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none resize-none"
        />
      </div>
    </>
  );
};
