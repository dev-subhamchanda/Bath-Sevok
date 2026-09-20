import { Shipment } from '../../models/shipment.model.js';
import { Driver } from '../../models/driver.model.js';
import { Vehicle } from '../../models/vehicle.model.js';
import { uploadShipmentImage } from '../../config/cloudinary.js';
import { getVehicleLocation } from '../vehicles/vehicle-location.service.js';
import mongoose from 'mongoose';
const shipmentStatuses = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
const parseField = (value) => {
    if (typeof value !== 'string') {
        return value;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return undefined;
    }
};
const isPoint = (value) => {
    if (!value || typeof value !== 'object')
        return false;
    const point = value;
    return point.type === 'Point'
        && Array.isArray(point.coordinates)
        && point.coordinates.length === 2
        && point.coordinates.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate));
};
const isRouteSelection = (value) => {
    if (!value || typeof value !== 'object')
        return false;
    const route = value;
    return typeof route.distanceKm === 'number'
        && Number.isFinite(route.distanceKm)
        && route.distanceKm >= 0
        && typeof route.durationMinutes === 'number'
        && Number.isFinite(route.durationMinutes)
        && route.durationMinutes >= 0;
};
const createShipment = async (req, res) => {
    try {
        const { trackingNumber, status, expectedDelivery: expectedDeliveryField, loadType, vehicleUnit, fleetClassification, vehicleId, driverId, routeId, weightKg, priority, route: routeField, } = req.body;
        const origin = parseField(req.body.origin);
        const destination = parseField(req.body.destination);
        const route = parseField(routeField);
        const parsedWeightKg = typeof weightKg === 'string' ? Number(weightKg) : weightKg;
        const expectedDelivery = expectedDeliveryField ? new Date(expectedDeliveryField) : undefined;
        if (!req.file) {
            res.status(400).json({ message: 'image is required' });
            return;
        }
        if (typeof loadType !== 'string' || loadType.trim().length === 0) {
            res.status(400).json({ message: 'loadType is required' });
            return;
        }
        if (!['heavy', 'light', 'moderate'].includes(vehicleUnit)) {
            res.status(400).json({ message: 'vehicleUnit must be heavy, light, or moderate' });
            return;
        }
        if (fleetClassification !== 'transit') {
            res.status(400).json({ message: 'fleetClassification must be transit' });
            return;
        }
        if (status !== undefined && !shipmentStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid shipment status' });
            return;
        }
        const parsedStatus = status === undefined ? undefined : status;
        if (expectedDeliveryField && (!expectedDelivery || Number.isNaN(expectedDelivery.getTime()))) {
            res.status(400).json({ message: 'expectedDelivery must be a valid date' });
            return;
        }
        if (!isPoint(origin) || !isPoint(destination)) {
            res.status(400).json({ message: 'origin and destination must be GeoJSON Point objects' });
            return;
        }
        if (!isRouteSelection(route)) {
            res.status(400).json({ message: 'route must include distanceKm and durationMinutes from the alternatives endpoint' });
            return;
        }
        const [vehicle, driver] = await Promise.all([
            mongoose.isValidObjectId(vehicleId) ? Vehicle.findById(vehicleId) : null,
            mongoose.isValidObjectId(driverId) ? Driver.findById(driverId) : null,
        ]);
        if (typeof parsedWeightKg !== 'number' || !Number.isFinite(parsedWeightKg) || parsedWeightKg < 0) {
            res.status(400).json({ message: 'weightKg must be a non-negative number' });
            return;
        }
        if (vehicle && parsedWeightKg > vehicle.capacityKg) {
            res.status(400).json({ message: 'weightKg exceeds vehicle capacity' });
            return;
        }
        const upload = await uploadShipmentImage(req.file);
        const deliveryDate = expectedDelivery || new Date(Date.now() + route.durationMinutes * 60 * 1000);
        const shipment = await Shipment.create({
            ...(typeof trackingNumber === 'string' && trackingNumber.trim().length > 0
                ? { trackingNumber: trackingNumber.trim() }
                : {}),
            loadType: loadType.trim(),
            vehicleUnit,
            fleetClassification,
            imageUrl: upload.secureUrl,
            imagePublicId: upload.publicId,
            origin,
            destination,
            ...(vehicle ? { vehicleId: vehicle._id } : {}),
            ...(driver ? { driverId: driver._id } : {}),
            routeId: mongoose.isValidObjectId(routeId) ? routeId : undefined,
            route,
            weightKg: parsedWeightKg,
            priority,
            expectedDelivery: deliveryDate,
            ...(parsedStatus ? { status: parsedStatus } : {}),
        });
        const populatedShipment = await shipment.populate([
            { path: 'driverId', select: '-__v' },
            { path: 'vehicleId', select: '-__v' },
        ]);
        res.status(201).json({
            message: 'Shipment created successfully',
            shipment: populatedShipment,
        });
    }
    catch (error) {
        console.error('Error creating shipment:', error);
        if (error instanceof Error && error.message === 'Cloudinary is not configured') {
            res.status(503).json({ message: 'Image storage is not configured' });
            return;
        }
        if (error instanceof Error && error.name === 'ValidationError') {
            res.status(400).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};
const getShipments = async (req, res) => {
    try {
        const shipments = await Shipment.find();
        res.status(200).json({
            message: 'Shipments retrieved successfully',
            shipments,
        });
    }
    catch (error) {
        console.error('Error retrieving shipments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
const trackShipmentController = async (req, res) => {
    try {
        const { trackingNumber, vehicleId } = await req.body;
        const shipment = await Shipment.findOne({ trackingNumber, vehicleId });
        if (!shipment) {
            return res.status(404).json({ message: "Shipment not found" });
        }
        const currentLocation = await getVehicleLocation(String(vehicleId));
        if (!currentLocation) {
            return res.status(404).json({ message: 'Current vehicle location not found' });
        }
        return res.status(200).json({ shipment, currentLocation });
    }
    catch (error) {
        console.error('Error tracking shipment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export { createShipment, getShipments, trackShipmentController };
//# sourceMappingURL=shipment.controller.js.map