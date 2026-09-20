# NER Logistics Intelligence — Frontend Documentation (SIH PS 26002)

Intelligent Logistics & Multi-Modal Cartography for challenging North East India terrain corridors.

---

## Architecture Flow

```text
Frontend (React + Vite, Port 3000)
       ↓
Axios Centralized API Layer (withCredentials: true, Bearer Auth)
       ↓
Backend API (Express 5 + TypeScript, Port 3001)
       ↓
MongoDB (Shipments, Users, Incidents, Vehicles, Drivers)
Redis (Live Vehicle GPS Telemetry)
OpenRouteService (Terrain & Road Network Geometry)
Cloudinary (Consignment & Driver Photo Assets)
```

---

## 1. Backend Connection Details

- **Backend Base URL**: `http://localhost:3001/api/v1` (also supports root `/` endpoints).
- **Client Origin**: `http://localhost:3000` with credentialed CORS enabled.
- **Vite Proxy**: Local development proxy forwards API requests from port `3000` to port `3001` dynamically.

---

## 2. Authentication Mechanism

- **Transport**: Supports both **HttpOnly Cookie** (`token`) and **Bearer Token** (`Authorization: Bearer <jwt>`).
- **Registration**: `POST /api/v1/auth/register` (requires `name`, `email`, `password`, `role`, `phone`).
  - Accepted roles: `ADMIN`, `DISPATCHER`, `DRIVER`, `USER`.
  - Frontend auto-maps UI roles: `operator` ➔ `DISPATCHER`, `admin` ➔ `ADMIN`, `officer` ➔ `DRIVER`.
- **Login**: `POST /api/v1/auth/login` (requires `email`, `password`).
- **Session**: Client stores token in `localStorage` (`ner_auth_token`) and automatically attaches it on protected routes.
- **Logout**: Clears client token and resets active application state.

---

## 3. Centralized API Modules (`src/services/api/`)

| File | Primary Responsibility | Backend Endpoints |
|---|---|---|
| `httpClient.ts` | Base Axios client, timeout, credentials, request/response interceptors, error formatting | All routes |
| `authService.ts` | Login, user registration, token persistence, role mapping | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/register` |
| `shipmentService.ts` | Consignment creation with multipart images, listing, status tracking | `POST /api/v1/shipments/create`<br>`GET /api/v1/shipments/list`<br>`POST /api/v1/shipments/tracking` |
| `routeService.ts` | Route calculation, alternative generation, coordinate geometry conversion | `POST /api/v1/routes/alternatives` |
| `fleetService.ts` | Live vehicle location lookup | `GET /api/v1/vehicles/:vehicleId/location` |
| `incidentService.ts` | Ground incident reporting, verification, and active incident feed | `POST /api/v1/incidents/report`<br>`GET /api/v1/incidents/for-ai`<br>`PATCH /api/v1/incidents/:id/verify` |
| `telemetryService.ts` | Connectivity testing, health pinging, fallback snapshots | `/`, `/api/v1/auth/test` |

---

## 4. Key Data Flows

### A. Consignment Dispatch Flow
1. Operator inputs origin (e.g. Guwahati) and destination (e.g. Shillong). Coordinates are handled internally as GeoJSON `[longitude, latitude]`.
2. Operator captures/uploads driver photo (automatically compressed to <= 45 KB).
3. System fetches route summary and geometry from backend `POST /api/v1/routes/alternatives`.
4. Dispatches `multipart/form-data` to `POST /api/v1/shipments/create` with:
   - `image`: driver/consignment image
   - `loadType`: commodity classification
   - `origin` & `destination`: GeoJSON Point strings
   - `route`: calculated route summary string
   - `vehicleId` & `driverId`: valid MongoDB identifiers
   - `weightKg`: consignment payload weight
   - `priority`: `LOW` | `NORMAL` | `HIGH` | `URGENT`
5. Backend responds with `201 Created` and generated tracking number (`NXR-YYYYMMDD-XXXXXXXX`).
6. Frontend updates `useShipmentStore` and redirects to Dashboard map.

### B. Map & Routing Flow
1. Leaflet map renders OpenStreetMap tiles centered closely around Assam (`26.15° N, 91.80° E`).
2. Active consignment triggers `routeAlternativesApi.fetchParsedAlternatives` with GeoJSON `origin` and `destination`.
3. Backend calls OpenRouteService and returns route alternatives with GeoJSON `geometry.coordinates` `[longitude, latitude]`.
4. `extractLeafletCoordinates` converts coordinates to Leaflet `[latitude, longitude]` and plots the polyline on the map.

### C. Incident & Hazard Telemetry Flow
1. Field Officer captures incident details with live GPS coordinates.
2. Dispatches `POST /api/v1/incidents/report` with `type`, `title`, `location`, `severity`, and `source`.
3. Dispatches appear in `IncidentsAlertsPage` via `GET /api/v1/incidents/for-ai`.

---

## 5. Environment Variables

Create `.env` based on `.env.example`:

```env
# Data source: 'live' or 'mock'
VITE_DATA_SOURCE=live

# Backend API base URL
VITE_API_BASE_URL=http://localhost:3001

# Realtime WebSocket / Socket.IO URL
VITE_WS_URL=ws://localhost:3001

# Map default focus (Assam, North East India)
VITE_MAP_DEFAULT_CENTER_LAT=26.1500
VITE_MAP_DEFAULT_CENTER_LNG=91.8000
VITE_MAP_DEFAULT_ZOOM=8.5

# Direct backend reference for Vite dev proxy
VITE_API_BACKEND_URL=http://localhost:3001
```

---

## 6. How to Run

### Step 1: Run Backend
```bash
cd "d:/Programming files vscode/SIH APP/Bath-Sevok/backend"
npm install
npm run dev
# Server will start on http://localhost:3001
```

### Step 2: Run Frontend (Development)
```bash
cd "d:/Programming files vscode/SIH APP/frontend"
npm install
npm run dev
# Frontend will be accessible at http://localhost:3000
```

---

## 7. Production Build & Deployment Guide

### A. Environment Configuration for Production
In production, set the environment variable pointing to your deployed backend:
```env
VITE_API_URL=https://bath-sevok-server-nlbg.onrender.com
VITE_WS_URL=wss://bath-sevok-server-nlbg.onrender.com
VITE_DATA_SOURCE=live
```

### B. Building for Production
```bash
cd frontend
npm run build
```
This produces an optimized production build in the `dist/` directory with:
- **Route-based Code Splitting**: Each page is asynchronously loaded on demand.
- **Vendor Chunking**: Dependencies are split into cached bundles (`vendor-react`, `vendor-leaflet`, `vendor-query`).
- **Clean Assets**: Minified CSS, HTML, SVG, and zero warnings.

### C. Previewing Production Locally
```bash
npm run preview
# Serves the actual production bundle on http://localhost:4173
```

### D. Deploying to Hosting Platforms

1. **Vercel**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Config: Already included via [`vercel.json`](file:///d:/Programming%20files%20vscode/SIH%20APP/frontend/vercel.json) for client-side SPA routing.

2. **Netlify / Cloudflare Pages / Render Static**:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Config: Client-side routing rewrite is automatically handled by [`public/_redirects`](file:///d:/Programming%20files%20vscode/SIH%20APP/frontend/public/_redirects).

3. **Backend CORS Requirement**:
   - Ensure the Express backend (`Bath-Sevok/backend`) environment variable `CLIENT_ORIGIN` is configured with your production frontend domain (e.g. `CLIENT_ORIGIN=https://your-frontend.vercel.app`), allowing credentialed requests (`credentials: true`).

