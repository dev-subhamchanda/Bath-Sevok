# Nexora API

Nexora is a logistics API for authentication, shipment tracking, vehicle locations, route alternatives, and verified road incidents.

## Contents

- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API conventions](#api-conventions)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Real-time vehicle updates](#real-time-vehicle-updates)
- [Data types](#data-types)
- [Error responses](#error-responses)
- [Implementation status](#implementation-status)

## Getting started

### Requirements

- Node.js 18 or later
- MongoDB
- Redis
- An OpenRouteService API key for route alternatives

### Install and run

```bash
npm install
npm run build
npm start
```

The server listens on `http://localhost:3001` by default.

For development, rebuild after source changes:

```bash
npx tsc
npm start
```

## Configuration

Create a `.env` file in the project root:

```env
PORT=3001
DB_URL=mongodb://127.0.0.1:27017/nexora
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:3000
ORS_API_KEY=your-openrouteservice-key
ORS_URL=https://api.openrouteservice.org
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NODE_ENV=development
```

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `3001`. |
| `DB_URL` | Yes | MongoDB connection string. |
| `REDIS_URL` | Yes | Redis connection string used for live vehicle locations. |
| `JWT_SECRET` | Yes for auth | Secret used to sign and verify JWTs. |
| `CLIENT_ORIGIN` | No | Allowed browser origin for credentialed CORS. |
| `ORS_API_KEY` | Yes for routes | OpenRouteService API key. |
| `ORS_URL` | No | OpenRouteService base URL. Defaults to `https://api.openrouteservice.org`. |
| `CLOUDINARY_CLOUD_NAME` | Yes for shipment images | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Yes for shipment images | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes for shipment images | Cloudinary API secret. |
| `NODE_ENV` | No | Cookies are marked `secure` only when this is `production`. |

## API conventions

### Base URLs

The preferred API base URL is:

```text
http://localhost:3001/api/v1
```

The server also exposes the same resources without `/api/v1` for backward compatibility:

```text
http://localhost:3001
```

For example, `/api/v1/shipments/list` and `/shipments/list` resolve to the same handler.

### Content type

Requests with a body must use:

```http
Content-Type: application/json
```

Coordinates use GeoJSON `Point` objects. GeoJSON order is always `[longitude, latitude]`, not `[latitude, longitude]`:

```json
{
	"type": "Point",
	"coordinates": [77.5946, 12.9716]
}
```

### Authentication transport

Successful sign-up and sign-in responses set an HttpOnly `token` cookie valid for one hour. Browser clients must include credentials on both the login request and later protected requests:

```ts
fetch('http://localhost:3001/api/v1/auth/login', {
	method: 'POST',
	credentials: 'include',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ email, password }),
});
```

Non-browser clients may instead send the token returned in the response body:

```http
Authorization: Bearer <jwt>
```

The middleware accepts either the `token` cookie or a Bearer token.

## Authentication

### Register

`POST /api/v1/auth/register`

Alias: `POST /api/v1/auth/signup`

Creates an active user and immediately issues a JWT.

#### Request body

```json
{
	"name": "Asha Kumar",
	"email": "asha@example.com",
	"password": "strong-password",
	"role": "DISPATCHER",
	"phone": "+919876543210"
}
```

All five fields are required. Valid roles are `ADMIN`, `DISPATCHER`, `DRIVER`, and `USER`.

#### Response `201 Created`

```json
{
	"message": "User created successfully",
	"token": "eyJ..."
}
```

### Login

`POST /api/v1/auth/login`

Alias: `POST /api/v1/auth/signin`

#### Request body

```json
{
	"email": "asha@example.com",
	"password": "strong-password"
}
```

#### Response `200 OK`

```json
{
	"message": "Login successful",
	"token": "eyJ..."
}
```

The response also includes `Set-Cookie: token=...; HttpOnly`.

### Auth test

`GET /api/v1/auth/test`

This diagnostic endpoint is public and returns:

```json
{
	"msg": "Auth Route is working !"
}
```

## Endpoints

The following endpoints require authentication unless marked **Public**.

### Shipments

#### Create a shipment

`POST /api/v1/shipments/create`

**Authentication:** Required

#### Request body

Use `multipart/form-data`. The required `image` field must be an image no larger than 50 KB. Pass the selected route object returned by `POST /api/v1/routes/alternatives`; its `durationMinutes` is used to calculate `expectedDelivery` on the server.

```json
{
	"image": "<binary image file, 30-45 KB>",
	"loadType": "FRAGILE",
	"origin": {
		"type": "Point",
		"coordinates": [77.5946, 12.9716]
	},
	"destination": {
		"type": "Point",
		"coordinates": [72.8777, 19.0760]
	},
	"vehicleId": "665f1a2b3c4d5e6f78901234",
	"driverId": "665f1a2b3c4d5e6f78901235",
	"weightKg": 1250,
	"priority": "HIGH",
	"route": {
		"distanceKm": 18.4,
		"durationMinutes": 42.5,
		"geometry": { "type": "LineString", "coordinates": [] }
	}
}
```

`origin`, `destination`, `loadType`, `route`, `vehicleId`, `driverId`, `weightKg`, and `image` are required. In multipart requests, send `origin`, `destination`, and `route` as JSON strings. `weightKg` must be a non-negative number and cannot exceed vehicle capacity. Valid priorities are `LOW`, `NORMAL`, `HIGH`, and `URGENT`. The tracking number, image URL, and expected delivery are generated by the server.

#### Response `201 Created`

```json
{
	"message": "Shipment created successfully",
	"shipment": {
		"_id": "665f1a2b3c4d5e6f78901237",
		"trackingNumber": "NXR-20260907-A1B2C3D4",
		"origin": { "type": "Point", "coordinates": [77.5946, 12.9716] },
		"destination": { "type": "Point", "coordinates": [72.8777, 19.076] },
		"weightKg": 1250,
		"priority": "HIGH",
		"status": "PENDING",
		"createdAt": "2026-09-07T10:00:00.000Z",
		"updatedAt": "2026-09-07T10:00:00.000Z"
	}
}
```

#### List shipments

`GET /api/v1/shipments/list`

**Authentication:** Required

#### Response `200 OK`

```json
{
	"message": "Shipments retrieved successfully",
	"shipments": []
}
```

#### Track a shipment

`POST /api/v1/shipments/tracking`

**Authentication:** Required

#### Request body

```json
{
	"trackingNumber": "NXR-20260907-A1B2C3D4",
	"vehicleId": "665f1a2b3c4d5e6f78901234"
}
```

Both values are used to locate the shipment. A current Redis vehicle location must also exist.

#### Response `200 OK`

```json
{
	"shipment": {},
	"currentLocation": {
		"vehicleId": "665f1a2b3c4d5e6f78901234",
		"latitude": 12.9716,
		"longitude": 77.5946,
		"speedKmh": 42.5,
		"heading": 180,
		"updatedAt": "2026-09-07T10:00:00.000Z"
	}
}
```

### Vehicles

#### Get the current vehicle location

`GET /api/v1/vehicles/:vehicleId/location`

**Authentication:** Required

#### Response `200 OK`

```json
{
	"location": {
		"vehicleId": "665f1a2b3c4d5e6f78901234",
		"latitude": 12.9716,
		"longitude": 77.5946,
		"speedKmh": 42.5,
		"heading": 180,
		"updatedAt": "2026-09-07T10:00:00.000Z"
	}
}
```

### Routes

#### Get alternative routes

`POST /api/v1/routes/alternatives`

**Authentication:** Public in the current implementation.

#### Request body

```json
{
	"origin": {
		"type": "Point",
		"coordinates": [77.5946, 12.9716]
	},
	"destination": {
		"type": "Point",
		"coordinates": [72.8777, 19.0760]
	}
}
```

Coordinates must contain valid longitude and latitude values. This endpoint requires `ORS_API_KEY`.

#### Response `200 OK`

```json
{
	"routes": [
		{
			"distanceKm": 982.34,
			"durationMinutes": 1210.5,
			"geometry": {}
		}
	]
}
```

The service requests up to three alternatives from OpenRouteService. `geometry` contains the provider's GeoJSON geometry.

For origin and destination pairs more than approximately 100 km apart, OpenRouteService does not support its alternative-routes algorithm. The API automatically requests a standard route instead, so the response contains one route with coordinates rather than multiple alternatives.

### Incidents

#### Report an incident

`POST /api/v1/incidents/report`

**Authentication:** Required

#### Request body

```json
{
	"type": "ACCIDENT",
	"title": "Collision near ring road",
	"description": "Two lanes are affected.",
	"location": {
		"type": "Point",
		"coordinates": [77.5946, 12.9716]
	},
	"severity": "HIGH",
	"source": "driver-report",
	"startedAt": "2026-09-07T10:00:00.000Z"
}
```

Required fields are `type`, `title`, `location`, `severity`, and `source`.

Valid incident types are `ACCIDENT`, `ROAD_CLOSURE`, `CONSTRUCTION`, `WEATHER`, `TRAFFIC`, and `OTHER`.

Valid severities are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`. Road status is derived automatically: `LOW` produces `OPEN`, `MEDIUM` produces `PARTIALLY_AVAILABLE`, and `HIGH` or `CRITICAL` produces `BLOCKED`.

#### Response `201 Created`

```json
{
	"message": "Incident report created and is waiting for verification",
	"incident": {}
}
```

New incidents start with `verificationStatus: "PENDING"` and `status: "ACTIVE"`.

#### Verify an incident

`PATCH /api/v1/incidents/:incidentId/verify`

**Authentication:** Required

The request body is optional. A `verifiedBy` string may be supplied:

```json
{
	"verifiedBy": "dispatcher-123"
}
```

The server sets `verificationStatus` to `VERIFIED` and records `verifiedAt`. If omitted, `verifiedBy` defaults to `system`.

#### Response `200 OK`

```json
{
	"message": "Incident verified",
	"incident": {}
}
```

#### Get verified active incidents

`GET /api/v1/incidents/for-ai`

**Authentication:** Required

#### Response `200 OK`

```json
{
	"incidents": []
}
```

Only incidents with `verificationStatus: "VERIFIED"` and `status: "ACTIVE"` are returned, newest first.

## Real-time vehicle updates

The server also exposes Socket.IO on the same HTTP origin.

### Connect

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');
```

### Driver location event

Emit `driver:location` with:

```json
{
	"vehicleId": "665f1a2b3c4d5e6f78901234",
	"latitude": 12.9716,
	"longitude": 77.5946,
	"speedKmh": 42.5,
	"heading": 180
}
```

Validation rules:

- `vehicleId` must be a non-empty string.
- `latitude` must be between `-90` and `90`.
- `longitude` must be between `-180` and `180`.
- `speedKmh` must be zero or greater.
- `heading` must be between `0` and `360`.

### Vehicle subscription events

| Event | Direction | Payload |
| --- | --- | --- |
| `vehicle:subscribe` | Client to server | Vehicle ID string |
| `vehicle:unsubscribe` | Client to server | Vehicle ID string |
| `vehicle:location:current` | Server to client | Current location object, when available |
| `vehicle:location:updated` | Server to subscribers | Saved location object |
| `vehicle:location:error` | Server to client | `{ "message": "Invalid vehicle location" }` |

When a client subscribes, it joins `vehicle:<vehicleId>` and receives the latest stored location if one exists.

## Data types

### User roles

`ADMIN` | `DISPATCHER` | `DRIVER` | `USER`

### Shipment statuses

`PENDING` | `ASSIGNED` | `IN_TRANSIT` | `DELIVERED` | `CANCELLED`

### Shipment priorities

`LOW` | `NORMAL` | `HIGH` | `URGENT`

### Incident statuses

- Verification: `PENDING` | `VERIFIED` | `REJECTED`
- Lifecycle: `ACTIVE` | `RESOLVED`
- Road status: `OPEN` | `PARTIALLY_AVAILABLE` | `BLOCKED`

### Date and identifier formats

- Dates are serialized as ISO 8601 strings.
- MongoDB identifiers are 24-character hexadecimal ObjectId strings.
- JWT access tokens expire after one hour.
- Shipment tracking numbers follow `NXR-YYYYMMDD-XXXXXXXX`.

## Error responses

Errors use a consistent JSON message shape:

```json
{
	"message": "Unauthorized: token is missing"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Invalid or missing request data. |
| `401` | Missing, invalid, expired, or unauthorized token. |
| `404` | Requested user, shipment, location, or incident was not found. |
| `500` | Internal server or configuration error. |
| `502` | OpenRouteService could not provide route data. |

Protected requests without a cookie or Bearer token return `401` with `Unauthorized: token is missing`.

## Implementation status

The following endpoints are planned in the project specification but are not currently implemented:

- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Do not build client dependencies on these endpoints until they are added to the server.
