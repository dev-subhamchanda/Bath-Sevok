import React, { useState, useId } from "react";
import { FormProvider, useForm } from "react-hook-form";
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
import { SchemaFields } from "./shipmentModal/SchemaFields";
import type { ShipmentFormValues } from "./shipmentModal/formTypes";

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

  // Generate unique initial consignment ID
  const generateNewId = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `SHP-2026-${randomNum}`;
  };

  const formMethods = useForm<ShipmentFormValues>({
    mode: "onBlur",
    defaultValues: {
      trackingNumber: generateNewId(),
      vehicleId: "",
      driverId: "",
      routeId: "",
      status: "PENDING",
      origin: "Guwahati",
      destination: "Shillong",
      commodity: cargoCommodityPresets[0],
      weightKg: 1200,
      priority: 1,
      vehicleUnit: "moderate",
      fleetClassification: "transit",
      driverName: "T. Sangma",
      driverPhone: "+91 94361 78921",
      driverLicenseId: "DL-01-2024-8841",
      pickupTime: new Date().toISOString().slice(0, 16),
      expectedDelivery: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16),
      receiverName: "Dr. M. Saikia",
      receiverFacility: "Shillong Civil Hospital Medical Depot",
      receiverPhone: "+91 94360 88210",
      specialInstructions: "Maintain cold chain temperature 2°C - 8°C. Expedite transit clearance across GS Road / NH-6 corridor."
    }
  });
  const { watch } = formMethods;
  const formValues = watch();

  // Origin Location state: display name + [longitude, latitude] coordinates
  const [originText, setOriginText] = useState("Guwahati");
  const [originCoords, setOriginCoords] = useState<[number, number]>([91.7362, 26.1445]);

  // Destination Location state: display name + [longitude, latitude] coordinates
  const [destinationText, setDestinationText] = useState("Shillong");
  const [destinationCoords, setDestinationCoords] = useState<[number, number]>([91.8933, 25.5788]);

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
      const sample = await generateSampleDriverPhoto(formValues.driverName, formValues.driverLicenseId);
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
  const handleValidSubmit = async (values: ShipmentFormValues) => {
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

    // 2. Validate that both origin and destination have valid [longitude, latitude] coordinates
    if (!originCoords || originCoords.length !== 2 || isNaN(originCoords[0]) || isNaN(originCoords[1])) {
      setSubmissionError("Invalid Start Location. Please enter or select a valid North East location.");
      return;
    }
    if (!destinationCoords || destinationCoords.length !== 2 || isNaN(destinationCoords[0]) || isNaN(destinationCoords[1])) {
      setSubmissionError("Invalid Destination. Please enter or select a valid North East location.");
      return;
    }
    if (new Date(values.expectedDelivery).getTime() <= new Date(values.pickupTime).getTime()) {
      formMethods.setError("expectedDelivery", { type: "validate", message: "Expected delivery must be after pickup" });
      setSubmissionError("Expected delivery must be after pickup time.");
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

      const targetRouteId = orsRoute?.id || `ROUTE-${values.trackingNumber}`;

      // 5. Dispatch shipment creation to backend endpoint with all required fields
      const createdShipment = await shipmentApi.create({
        origin: originGeoJson,
        destination: destinationGeoJson,
        priority: values.priority,
        commodity: values.commodity.trim(),
        loadType: values.commodity.trim(),
        weightKg: values.weightKg,
        vehicleUnit: values.vehicleUnit,
        fleetClassification: values.fleetClassification,
        trackingNumber: values.trackingNumber.trim(),
        routeId: values.routeId.trim() || targetRouteId,
        vehicleId: values.vehicleId.trim() || undefined,
        driverId: values.driverId.trim() || undefined,
        status: values.status,
        image: selectedImage.file || selectedImage.blob,
        driverPhoto: selectedImage.file || selectedImage.blob,
        driverName: values.driverName.trim(),
        driverPhone: values.driverPhone.trim(),
        driverLicenseId: values.driverLicenseId.trim(),
        driverPhotoUrl: selectedImage.dataUrl,
        vehicleType: values.vehicleUnit,
        pickupTimeIso: new Date(values.pickupTime).toISOString(),
        expectedDeliveryIso: new Date(values.expectedDelivery).toISOString(),
        receiverContact: `${values.receiverName} (${values.receiverFacility}) - ${values.receiverPhone}`,
        specialInstructions: values.specialInstructions.trim(),
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
      createdShipment.id = values.trackingNumber.trim() || createdShipment.id;
      createdShipment.driverName = values.driverName.trim();
      createdShipment.driverPhone = values.driverPhone.trim();
      createdShipment.vehicleType = values.vehicleUnit;
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
          riskScore: values.priority === 1 ? 0.08 : 0.16,
          disruptionProbability: 0.09,
          geometry: orsRoute.coordinates, // [lat, lng] for Leaflet
          recommended: true,
          via: orsRoute.via || `${originText} ➔ ${destinationText}`
        };
      }

      // 7. Keep the form-created shipment in local state without reloading the backend list.
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
        <FormProvider {...formMethods}>
        <form id={formId} onSubmit={formMethods.handleSubmit(handleValidSubmit)} className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
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
          <VehicleCommodityFields />

          <SchemaFields />

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
          <DriverDetailsFields />

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
          <ReceiverScheduleFields />
        </form>
        </FormProvider>

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
