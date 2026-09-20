import React, { useState, useId } from "react";
import { useNavigate } from "react-router-dom";
import { useShipmentStore } from "@/stores/shipmentStore";
import {
  shipmentApi,
  routeAlternativesApi,
  authApi,
  formatAxiosError,
  type GeoJsonPoint,
  type ParsedAlternativeRoute
} from "@/services/api/apiClient";
import {
  registeredDrivers,
  findLocationByText,
  cargoCommodityPresets,
  type RegionalLocation
} from "@/services/mock/driversData";
import {
  compressImageFile,
  generateSampleDriverPhoto,
  type CompressedImageResult
} from "./imageCompression";
import type { RouteOption } from "@/types/domain";

import { LocationFields } from "./shipmentModal/LocationFields";
import { DriverDetailsFields } from "./shipmentModal/DriverDetailsFields";
import { DriverPhotoUpload } from "./shipmentModal/DriverPhotoUpload";
import { VehicleCommodityFields } from "./shipmentModal/VehicleCommodityFields";
import { ReceiverScheduleFields } from "./shipmentModal/ReceiverScheduleFields";

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (shipmentId: string) => void;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const navigate = useNavigate();
  const formId = useId();
  const addShipment = useShipmentStore((s) => s.addShipment);
  const selectShipment = useShipmentStore((s) => s.selectShipment);
  const setShipments = useShipmentStore((s) => s.setShipments);

  // Generate unique initial consignment ID
  const generateNewId = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `SHP-2026-${randomNum}`;
  };

  const [shipmentId, setShipmentId] = useState(generateNewId);

  // Origin Location state: display name + [longitude, latitude] coordinates
  const [originText, setOriginText] = useState("Guwahati");
  const [originCoords, setOriginCoords] = useState<[number, number]>([91.7362, 26.1445]);

  // Destination Location state: display name + [longitude, latitude] coordinates
  const [destinationText, setDestinationText] = useState("Shillong");
  const [destinationCoords, setDestinationCoords] = useState<[number, number]>([91.8933, 25.5788]);

  // Driver Details (Manual Entry)
  const [driverName, setDriverName] = useState("T. Sangma");
  const [driverPhone, setDriverPhone] = useState("+91 94361 78921");
  const [driverLicenseId, setDriverLicenseId] = useState("DL-01-2024-8841");

  // Vehicle selection
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    registeredDrivers[0].backendVehicleId || registeredDrivers[0].vehicleId
  );
  const [commodity, setCommodity] = useState(cargoCommodityPresets[0]);
  const [priority, setPriority] = useState<1 | 2 | 3>(1);
  const [weightKg, setWeightKg] = useState<number>(1200);

  // Date-time defaults (Pickup: now, Delivery: +8 hours)
  const [pickupTime, setPickupTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [expectedDelivery, setExpectedDelivery] = useState(() =>
    new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16)
  );

  const [receiverName, setReceiverName] = useState("Dr. M. Saikia");
  const [receiverFacility, setReceiverFacility] = useState("Shillong Civil Hospital Medical Depot");
  const [receiverPhone, setReceiverPhone] = useState("+91 94360 88210");
  const [specialInstructions, setSpecialInstructions] = useState(
    "Maintain cold chain temperature 2°C - 8°C. Expedite transit clearance across GS Road / NH-6 corridor."
  );

  // Image Upload / Capture state (Required, max 45 KB)
  const [selectedImage, setSelectedImage] = useState<CompressedImageResult | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Authentication status
  const [authOverride, setAuthOverride] = useState(false);
  const isAuthenticated = authOverride || authApi.hasToken();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedVehicleInfo =
    registeredDrivers.find(
      (d) => (d.backendVehicleId || d.vehicleId) === selectedVehicleId
    ) || registeredDrivers[0];

  // Image processing with automatic compression to <= 45 KB
  const processImageFile = async (file: File) => {
    setImageError(null);
    setIsCompressingImage(true);
    try {
      const result = await compressImageFile(file, 45 * 1024, file.name);
      setSelectedImage(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compress image below 45 KB limit.";
      setImageError(msg);
      setSelectedImage(null);
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleGenerateSampleImage = async () => {
    setImageError(null);
    setIsCompressingImage(true);
    try {
      const sample = await generateSampleDriverPhoto(driverName, driverLicenseId);
      setSelectedImage(sample);
    } catch {
      setImageError("Could not generate sample driver photo.");
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageError(null);
  };

  // Quick Sign In helper for instant pre-creation authentication
  const handleQuickSignIn = async () => {
    setIsSigningIn(true);
    setSubmissionError(null);
    try {
      await authApi.signin({ email: "test@test.com", password: "password123" });
      setAuthOverride(true);
    } catch (err) {
      setSubmissionError(formatAxiosError(err, "Sign in failed. Please verify credentials."));
    } finally {
      setIsSigningIn(false);
    }
  };

  // Location search input handlers
  const handleOriginChange = (val: string) => {
    setOriginText(val);
    const matched = findLocationByText(val);
    if (matched) {
      setOriginCoords(matched.coordinates);
    }
  };

  const handleSelectOrigin = (loc: RegionalLocation) => {
    setOriginText(loc.name);
    setOriginCoords(loc.coordinates);
  };

  const handleDestinationChange = (val: string) => {
    setDestinationText(val);
    const matched = findLocationByText(val);
    if (matched) {
      setDestinationCoords(matched.coordinates);
    }
  };

  const handleSelectDestination = (loc: RegionalLocation) => {
    setDestinationText(loc.name);
    setDestinationCoords(loc.coordinates);
  };

  // Form submission: Validate -> Format GeoJSON -> ORS Route -> Backend POST -> State Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);
    setImageError(null);

    // 0. Ensure user is authenticated before creation
    if (!authApi.hasToken()) {
      try {
        await authApi.signin({ email: "test@test.com", password: "password123" });
        setAuthOverride(true);
      } catch {
        setSubmissionError("Authentication required: You must log in before creating a shipment.");
        return;
      }
    }

    // 1. Validate Image (Required, max 45 KB)
    if (!selectedImage) {
      setImageError("Driver photo is required before creation (maximum 45 KB).");
      setSubmissionError("Please upload or generate a driver photo before submitting.");
      return;
    }
    if (selectedImage.sizeBytes > 45 * 1024) {
      setImageError(`Driver photo size (${selectedImage.sizeKb} KB) exceeds the strict 45 KB maximum limit.`);
      setSubmissionError("Driver photo size must not exceed 45 KB.");
      return;
    }

    // 1b. Validate manual driver details
    if (!driverName.trim()) {
      setSubmissionError("Please enter driver name.");
      return;
    }
    if (!driverPhone.trim()) {
      setSubmissionError("Please enter driver phone number.");
      return;
    }
    if (!driverLicenseId.trim()) {
      setSubmissionError("Please enter driver license or ID.");
      return;
    }

    // 2. Validate that both origin and destination have valid [longitude, latitude] coordinates
    if (!originCoords || originCoords.length !== 2 || isNaN(originCoords[0]) || isNaN(originCoords[1])) {
      setSubmissionError("Invalid Start Location. Please enter or select a valid North East location.");
      return;
    }
    if (!destinationCoords || destinationCoords.length !== 2 || isNaN(destinationCoords[0]) || isNaN(destinationCoords[1])) {
      setSubmissionError("Invalid Destination. Please enter or select a valid North East location.");
      return;
    }

    setIsSubmitting(true);

    try {
      const originGeoJson: GeoJsonPoint = {
        type: "Point",
        coordinates: [Number(originCoords[0]), Number(originCoords[1])]
      };
      const destinationGeoJson: GeoJsonPoint = {
        type: "Point",
        coordinates: [Number(destinationCoords[0]), Number(destinationCoords[1])]
      };

      // 3. Fetch route calculated by backend OpenRouteService integration
      let orsRoute: ParsedAlternativeRoute | null = null;
      try {
        const routes = await routeAlternativesApi.fetchParsedAlternatives({
          origin: originGeoJson,
          destination: destinationGeoJson
        });
        if (routes && routes.length > 0) {
          orsRoute = routes[0];
        }
      } catch (err) {
        console.warn("Backend OpenRouteService calculation encountered an issue:", err);
      }

      // 4. Vehicle & Driver IDs
      const targetDriverId = "6a9a3c1010f836940a45ab2a";
      const targetVehicleId = selectedVehicleInfo.backendVehicleId || selectedVehicleId || "6a9a3b6510f836940a45ab23";
      const targetRouteId = orsRoute?.id || `ROUTE-${shipmentId}`;

      // 5. Dispatch shipment creation to backend endpoint with all required fields
      const createdShipment = await shipmentApi.create({
        origin: originGeoJson,
        destination: destinationGeoJson,
        priority,
        commodity: commodity.trim(),
        loadType: commodity.trim(),
        weightKg: Number(weightKg) || 1200,
        vehicleId: targetVehicleId,
        driverId: targetDriverId,
        routeId: targetRouteId,
        image: selectedImage.file || selectedImage.blob,
        driverPhoto: selectedImage.file || selectedImage.blob,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        driverLicenseId: driverLicenseId.trim(),
        driverPhotoUrl: selectedImage.dataUrl,
        vehicleNumber: selectedVehicleInfo.vehicleNumber,
        vehicleType: selectedVehicleInfo.vehicleType,
        pickupTimeIso: new Date(pickupTime).toISOString(),
        expectedDeliveryIso: new Date(expectedDelivery).toISOString(),
        receiverContact: `${receiverName} (${receiverFacility}) • ${receiverPhone}`,
        specialInstructions: specialInstructions.trim(),
        route: orsRoute
          ? {
              distanceKm: orsRoute.distanceKm,
              durationMinutes: orsRoute.durationMinutes
            }
          : undefined
      });

      // Preserve user display names and GeoJSON coordinates
      createdShipment.origin = originText.trim();
      createdShipment.destination = destinationText.trim();
      createdShipment.originCoordinates = [originCoords[0], originCoords[1]];
      createdShipment.destinationCoordinates = [destinationCoords[0], destinationCoords[1]];
      createdShipment.id = shipmentId.trim() || createdShipment.id;
      createdShipment.driverName = driverName.trim();
      createdShipment.driverPhone = driverPhone.trim();
      createdShipment.vehicleNumber = selectedVehicleInfo.vehicleNumber;
      createdShipment.vehicleType = selectedVehicleInfo.vehicleType;
      if (selectedImage?.dataUrl) {
        createdShipment.driverPhotoUrl = selectedImage.dataUrl;
      }

      // 6. Build RouteOption for Leaflet map if ORS returned route coordinates
      let newRouteOption: RouteOption | undefined = undefined;
      if (orsRoute && orsRoute.coordinates.length > 0) {
        newRouteOption = {
          id: `ROUTE-${createdShipment.id}`,
          shipmentId: createdShipment.id,
          name: `${originText} ➔ ${destinationText} Corridor (${orsRoute.distanceKm} km)`,
          distanceKm: orsRoute.distanceKm,
          estimatedMinutes: orsRoute.durationMinutes,
          riskScore: priority === 1 ? 0.08 : 0.16,
          disruptionProbability: 0.09,
          geometry: orsRoute.coordinates, // [lat, lng] for Leaflet
          recommended: true,
          via: orsRoute.via || `${originText} ➔ ${destinationText}`
        };
      }

      // 7. Refresh GET /shipments/list from backend
      try {
        const refreshed = await shipmentApi.getAll();
        if (refreshed && refreshed.length > 0) {
          setShipments(refreshed);
        }
      } catch (err) {
        console.warn("Could not refresh shipments list after creation:", err);
      }

      // 8. Add to shipment store and select it
      addShipment(createdShipment, newRouteOption);
      selectShipment(createdShipment.id);

      if (onCreated) {
        onCreated(createdShipment.id);
      }

      onClose();

      // Automatically navigate to Dashboard to view the newly created route on the map
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error("Failed to create shipment:", err);
      const errMsg = formatAxiosError(err, "Server error while creating shipment. Please try again.");
      setSubmissionError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,51,86,0.25)] border border-[#e5e8ee] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e8ee] bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#003356] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#003356] tracking-tight">
                  Create Consignment & Dispatch
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#cfe4ff] text-[#001d34] text-[10px] font-bold uppercase">
                  NER Logistics
                </span>
              </div>
              <p className="text-xs text-[#72777f]">
                Assign driver, vehicle, critical freight parameters & transit schedules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form id={formId} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Authentication Required Warning Banner */}
          {!isAuthenticated && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0">lock</span>
                <div>
                  <strong className="block text-amber-950 font-bold">Authentication Required:</strong>
                  <span>You must log in to create a shipment on the live backend server.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickSignIn}
                disabled={isSigningIn}
                className="px-3.5 py-1.5 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">login</span>
                    <span>Sign In (test@test.com)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Submission Error Banner */}
          {submissionError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
              <span className="font-semibold">{submissionError}</span>
            </div>
          )}

          {/* Section 1: Consignment ID, Commodity, Weight, Priority, Vehicle Selection */}
          <VehicleCommodityFields
            shipmentId={shipmentId}
            onNewShipmentId={() => setShipmentId(generateNewId())}
            onShipmentIdChange={setShipmentId}
            commodity={commodity}
            onCommodityChange={setCommodity}
            weightKg={weightKg}
            onWeightKgChange={setWeightKg}
            priority={priority}
            onPriorityChange={setPriority}
            selectedVehicleId={selectedVehicleId}
            onVehicleIdChange={setSelectedVehicleId}
            selectedVehicleInfo={selectedVehicleInfo}
          />

          {/* Section 2: Origin & Destination Corridor with Autocomplete */}
          <LocationFields
            originText={originText}
            onOriginChange={handleOriginChange}
            onSelectOrigin={handleSelectOrigin}
            destinationText={destinationText}
            onDestinationChange={handleDestinationChange}
            onSelectDestination={handleSelectDestination}
          />

          {/* Section 3: Driver Details (Manual Entry) */}
          <DriverDetailsFields
            driverName={driverName}
            onDriverNameChange={setDriverName}
            driverPhone={driverPhone}
            onDriverPhoneChange={setDriverPhone}
            driverLicenseId={driverLicenseId}
            onDriverLicenseIdChange={setDriverLicenseId}
          />

          {/* Section 4: Driver Photo (Required, max 45 KB) */}
          <DriverPhotoUpload
            selectedImage={selectedImage}
            isCompressing={isCompressingImage}
            imageError={imageError}
            onProcessFile={processImageFile}
            onGenerateSample={handleGenerateSampleImage}
            onRemoveImage={handleRemoveImage}
          />

          {/* Section 5: Transit Schedules, Receiver Details, and Instructions */}
          <ReceiverScheduleFields
            pickupTime={pickupTime}
            onPickupTimeChange={setPickupTime}
            expectedDelivery={expectedDelivery}
            onExpectedDeliveryChange={setExpectedDelivery}
            receiverName={receiverName}
            onReceiverNameChange={setReceiverName}
            receiverFacility={receiverFacility}
            onReceiverFacilityChange={setReceiverFacility}
            receiverPhone={receiverPhone}
            onReceiverPhoneChange={setReceiverPhone}
            specialInstructions={specialInstructions}
            onSpecialInstructionsChange={setSpecialInstructions}
          />
        </form>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#e5e8ee] bg-[#f8fafc]">
          <div className="flex items-center gap-2 text-[11px] text-[#72777f]">
            <span className="material-symbols-outlined text-[16px] text-[#005148]">verified</span>
            <span>Auto-linked with OpenRouteService Engine</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl border border-[#c2c7cf] hover:bg-[#ebeef4] text-[#42474e] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-[#003356] hover:bg-[#174a73] text-white font-bold text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Calculating & Dispatching...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                  <span>Create Shipment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
