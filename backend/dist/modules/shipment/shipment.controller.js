import { Shipment } from '../../models/shipment.model.js';
import { Driver } from '../../models/driver.model.js';
import { Vehicle } from '../../models/vehicle.model.js';
import { User } from '../../models/auth.model.js';
import { uploadShipmentImage } from '../../config/cloudinary.js';
import { getVehicleLocation } from '../vehicles/vehicle-location.service.js';
import mongoose from 'mongoose';
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
        const { loadType, vehicleId, driverId, routeId, weightKg, priority, route: routeField, } = req.body;
        const origin = parseField(req.body.origin);
        const destination = parseField(req.body.destination);
        const route = parseField(routeField);
        const parsedWeightKg = typeof weightKg === 'string' ? Number(weightKg) : weightKg;
        if (!req.file) {
            res.status(400).json({ message: 'image is required' });
            return;
        }
        if (typeof loadType !== 'string' || loadType.trim().length === 0) {
            res.status(400).json({ message: 'loadType is required' });
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
        let targetVehicleId = vehicleId;
        let targetDriverId = driverId;
        let [vehicle, driver] = await Promise.all([
            mongoose.isValidObjectId(targetVehicleId) ? Vehicle.findById(targetVehicleId) : null,
            mongoose.isValidObjectId(targetDriverId) ? Driver.findById(targetDriverId) : null,
        ]);
        if (!vehicle) {
            vehicle = await Vehicle.findOne();
            if (!vehicle) {
                vehicle = await Vehicle.create({
                    vehicleNumber: 'AS-01-AX-1029',
                    type: 'Tata Prima 4028.S (Heavy Multi-Axle)',
                    capacityKg: 10000,
                    status: 'AVAILABLE',
                });
            }
            targetVehicleId = vehicle._id;
        }
        if (!driver) {
            driver = await Driver.findOne();
            if (!driver) {
                let driverUser = await User.findOne({ role: 'DRIVER' });
                if (!driverUser) {
                    driverUser = await User.create({
                        name: 'T. Sangma',
                        email: `driver-${Date.now()}@nerlogistics.in`,
                        passwordHash: 'seeded_hash',
                        role: 'DRIVER',
                        status: 'ACTIVE',
                        phone: '+91 94361 78921',
                    });
                }
                driver = await Driver.create({
                    userId: driverUser._id,
                    licenseNumber: `DL-NER-${Date.now().toString().slice(-6)}`,
                    phone: '+91 94361 78921',
                    status: 'AVAILABLE',
                });
            }
            targetDriverId = driver._id;
        }
        if (typeof parsedWeightKg !== 'number' || !Number.isFinite(parsedWeightKg) || parsedWeightKg < 0) {
            res.status(400).json({ message: 'weightKg must be a non-negative number' });
            return;
        }
        if (parsedWeightKg > vehicle.capacityKg) {
            res.status(400).json({ message: 'weightKg exceeds vehicle capacity' });
            return;
        }
        const upload = await uploadShipmentImage(req.file);
        const expectedDelivery = new Date(Date.now() + route.durationMinutes * 60 * 1000);
        const shipment = await Shipment.create({
            loadType: loadType.trim(),
            imageUrl: upload.secureUrl,
            imagePublicId: upload.publicId,
            origin,
            destination,
            vehicleId: targetVehicleId,
            driverId: targetDriverId,
            routeId: mongoose.isValidObjectId(routeId) ? routeId : undefined,
            route,
            weightKg: parsedWeightKg,
            priority: priority || 'NORMAL',
            expectedDelivery,
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