import express from 'express';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { runDB } from './config/database.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {
    closeLocationStore,
    connectLocationStore,
    getVehicleLocation,
    saveVehicleLocation,
} from './modules/vehicles/vehicle-location.service.js';
dotenv.config();

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
const httpServer = createServer(app);
const clientOrigin = process.env.CLIENT_ORIGIN as string | undefined;
const io = new SocketIOServer(httpServer, {
    cors: { origin: clientOrigin ?? '*' },
});
//middlewares
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
// app.use(cookieParser());
app.use(cors({ origin: clientOrigin ?? '*', credentials: true }));
//app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.get('/',(req,res)=>{
    res.json({
        "msg":"Hello World !"
    })
});

// ROUTES IMPORT;
import {authRouter} from './modules/auth/auth.route.js';
import { shipmentRouter } from './modules/shipment/shipment.route.js';
import { vehiclesRouter } from './modules/vehicles/vehicles.route.js';
import { routeRouter } from './modules/routes/route.route.js';
import { incidentRouter } from './modules/incidents/incident.route.js';

/* --- api/v1/auth/ --
    * --POST signup/
    * --POST signin/
*/
app.use('/auth',authRouter);
app.use('/api/v1/auth', authRouter);
app.use('/shipments', shipmentRouter);
app.use('/api/v1/shipments', shipmentRouter);
app.use('/vehicles', vehiclesRouter);
app.use('/api/v1/vehicles', vehiclesRouter);
app.use('/routes', routeRouter);
app.use('/api/v1/routes', routeRouter);
app.use('/incidents', incidentRouter);
app.use('/api/v1/incidents', incidentRouter);

const isValidLocation = (value: unknown): value is {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh: number;
    heading: number;
} => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const location = value as Record<string, unknown>;
    return typeof location.vehicleId === 'string'
        && location.vehicleId.length > 0
        && typeof location.latitude === 'number'
        && location.latitude >= -90
        && location.latitude <= 90
        && typeof location.longitude === 'number'
        && location.longitude >= -180
        && location.longitude <= 180
        && typeof location.speedKmh === 'number'
        && location.speedKmh >= 0
        && typeof location.heading === 'number'
        && location.heading >= 0
        && location.heading <= 360;
};

io.on('connection', (socket) => {
    socket.on('driver:location', async (location: unknown) => {
        if (!isValidLocation(location)) {
            socket.emit('vehicle:location:error', { message: 'Invalid vehicle location' });
            return;
        }

        try {
            const savedLocation = await saveVehicleLocation(location);
            io.to(`vehicle:${savedLocation.vehicleId}`).emit('vehicle:location:updated', savedLocation);
        } catch (error) {
            console.error('Error saving vehicle location:', error);
            socket.emit('vehicle:location:error', { message: 'Could not save vehicle location' });
        }
    });

    socket.on('vehicle:subscribe', async (vehicleId: unknown) => {
        if (typeof vehicleId !== 'string' || vehicleId.length === 0) {
            return;
        }

        const room = `vehicle:${vehicleId}`;
        await socket.join(room);

        const currentLocation = await getVehicleLocation(vehicleId);
        if (currentLocation) {
            socket.emit('vehicle:location:current', currentLocation);
        }
    });

    socket.on('vehicle:unsubscribe', async (vehicleId: unknown) => {
        if (typeof vehicleId === 'string' && vehicleId.length > 0) {
            await socket.leave(`vehicle:${vehicleId}`);
        }
    });
});





const startServer = async (): Promise<void> => {
    await runDB();
    await connectLocationStore();
    httpServer.listen(PORT,()=>console.log(`http://localhost:${PORT}/`));
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

const shutdown = async (): Promise<void> => {
    await closeLocationStore();
    httpServer.close();
};

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
