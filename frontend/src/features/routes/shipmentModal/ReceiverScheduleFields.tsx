import React from "react";
import { useFormContext } from "react-hook-form";
import type { ShipmentFormValues } from "./formTypes";

export const ReceiverScheduleFields: React.FC = () => {
  const { register, formState: { errors } } = useFormContext<ShipmentFormValues>();
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
            {...register("pickupTime", { required: "Pickup time is required" })}
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none"
          />
        </div>

          {errors.pickupTime && <span className="text-[10px] text-rose-600">{errors.pickupTime.message}</span>}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#181c20] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#005148]">event_available</span>
            <span>Expected Delivery Date & Time</span>
          </label>
          <input
            type="datetime-local"
            {...register("expectedDelivery", { required: "Expected delivery is required" })}
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Receiver / Contact Details */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e5e8ee]">
        {errors.expectedDelivery && <span className="text-[10px] text-rose-600">{errors.expectedDelivery.message}</span>}

        <label className="text-xs font-bold text-[#003356] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px] text-[#27638c]">contact_phone</span>
          <span>Receiver / Point of Contact Details</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            {...register("receiverName", { required: "Receiver name is required" })}
            placeholder="Receiver Officer Name"
            className="w-full h-9 px-3 rounded-lg bg-white text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:outline-none"
          />
          <input
            type="text"
            {...register("receiverFacility", { required: "Receiving facility is required" })}
            placeholder="Receiving Facility / Unit"
            className="w-full h-9 px-3 rounded-lg bg-white text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:outline-none"
          />
          <input
            type="text"
            {...register("receiverPhone", { required: "Receiver phone is required", pattern: { value: /^[+\d][\d\s-]{7,19}$/, message: "Enter a valid phone number" } })}
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
          {...register("specialInstructions", { maxLength: { value: 1000, message: "Keep instructions under 1000 characters" } })}
          placeholder="e.g. Temperature monitoring requirements, hazardous materials protocol, road clearance permit note..."
          className="w-full p-3 rounded-xl bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none resize-none"
        />
      </div>
    </>
  );
};
