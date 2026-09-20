import type {
  RoadSegment,
  Vehicle,
  Incident,
  Shipment,
  RouteOption,
  Alert,
  WeatherSnapshot,
  KpiSummary,
  DataSnapshot
} from "@/types/domain";

export const initialRoads: RoadSegment[] = [
  {
    id: "NH-27",
    name: "NH-27 (Guwahati to Nagaon / Lumding)",
    roadType: "national_highway",
    status: "accessible",
    accessibilityScore: 96,
    floodRisk: 0.08,
    landslideRisk: 0.04,
    trafficLevel: "medium",
    speedKph: 64,
    clearancePercent: "100%",
    sector: "Assam Central Basin",
    description: "Guwahati-Nagaon 4-lane Arterial Spine",
    geometry: [
      [26.1445, 91.7362],
      [26.2500, 92.1500],
      [26.3450, 92.6840],
      [25.7500, 93.1800]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.94,
    source: "seed"
  },
  {
    id: "NH-6",
    name: "NH-6 (Guwahati - Shillong Expressway)",
    roadType: "national_highway",
    status: "accessible",
    accessibilityScore: 98,
    floodRisk: 0.12,
    landslideRisk: 0.15,
    trafficLevel: "low",
    speedKph: 58,
    clearancePercent: "98%",
    sector: "Meghalaya Plateau Escarpment",
    description: "Guwahati-Shillong Primary 4-lane Corridor",
    geometry: [
      [26.1445, 91.7362],
      [25.9000, 91.8800],
      [25.7200, 91.8700],
      [25.5788, 91.8933]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.96,
    source: "seed"
  },
  {
    id: "NH-29",
    name: "NH-29 (Dimapur to Kohima Hill Pass)",
    roadType: "national_highway",
    status: "at_risk",
    accessibilityScore: 65,
    floodRisk: 0.42,
    landslideRisk: 0.58,
    trafficLevel: "high",
    speedKph: 26,
    clearancePercent: "65%",
    sector: "Nagaland Mountain Pass",
    description: "Dimapur-Kohima Mountain Pass (Rainfall warning)",
    geometry: [
      [25.9068, 93.7271],
      [25.7800, 93.9200],
      [25.6751, 94.1086]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.91,
    source: "field_report"
  },
  {
    id: "NH-10",
    name: "NH-10 (Siliguri - Sevoke - Teesta - Gangtok)",
    roadType: "national_highway",
    status: "at_risk",
    accessibilityScore: 70,
    floodRisk: 0.35,
    landslideRisk: 0.60,
    trafficLevel: "medium",
    speedKph: 31,
    clearancePercent: "70%",
    sector: "Teesta Gorge Sector",
    description: "High slope saturation with single-lane regulation",
    geometry: [
      [26.7271, 88.3953],
      [26.9000, 88.4700],
      [27.1200, 88.5200],
      [27.3389, 88.6065]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.89,
    source: "weather"
  },
  {
    id: "NH-13",
    name: "NH-13 (Trans-Arunachal Highway Bomdila-Tawang)",
    roadType: "national_highway",
    status: "blocked",
    accessibilityScore: 12,
    floodRisk: 0.88,
    landslideRisk: 0.95,
    trafficLevel: "high",
    speedKph: 0,
    clearancePercent: "0%",
    sector: "Arunachal Western Sector",
    description: "Active Mudslide KM 48 (Carriageway severed)",
    geometry: [
      [27.0844, 93.6053],
      [27.2600, 92.4200],
      [27.5800, 91.8600]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.98,
    source: "field_report"
  },
  {
    id: "NH-102B",
    name: "NH-102B (Singngat - Churachandpur Sector)",
    roadType: "national_highway",
    status: "blocked",
    accessibilityScore: 18,
    floodRisk: 0.72,
    landslideRisk: 0.80,
    trafficLevel: "low",
    speedKph: 0,
    clearancePercent: "0%",
    sector: "Manipur Southern Corridor",
    description: "Churachandpur Southern Detour Closed",
    geometry: [
      [24.8170, 93.9368],
      [24.3300, 93.6700],
      [24.1500, 93.4500]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.92,
    source: "field_report"
  },
  {
    id: "NH-6S",
    name: "NH-6 South (Jowai to Badarpur Bypass)",
    roadType: "national_highway",
    status: "under_observation",
    accessibilityScore: 82,
    floodRisk: 0.22,
    landslideRisk: 0.28,
    trafficLevel: "medium",
    speedKph: 38,
    clearancePercent: "85%",
    sector: "Barak-Meghalaya Frontier",
    description: "Jowai-Ratacherra Bridge Works (16T limit)",
    geometry: [
      [25.5788, 91.8933],
      [25.4500, 92.2000],
      [25.1000, 92.5000],
      [24.8170, 92.7978]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.90,
    source: "seed"
  },
  {
    id: "NH-37",
    name: "NH-37 Upper Assam (Nagaon - Jorhat - Dibrugarh)",
    roadType: "national_highway",
    status: "accessible",
    accessibilityScore: 94,
    floodRisk: 0.15,
    landslideRisk: 0.05,
    trafficLevel: "medium",
    speedKph: 62,
    clearancePercent: "100%",
    sector: "Upper Brahmaputra South Bank",
    description: "Brahmaputra South Bank Heavy Cargo Spine",
    geometry: [
      [26.3450, 92.6840],
      [26.7509, 94.2037],
      [27.4728, 94.9120]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.95,
    source: "seed"
  },
  {
    id: "NH-8",
    name: "NH-8 (Tripura Spine: Silchar - Karimganj - Agartala)",
    roadType: "national_highway",
    status: "accessible",
    accessibilityScore: 92,
    floodRisk: 0.18,
    landslideRisk: 0.10,
    trafficLevel: "low",
    speedKph: 52,
    clearancePercent: "95%",
    sector: "Tripura Logistics Gateway",
    description: "Agartala Bulk Cargo Artery",
    geometry: [
      [24.8170, 92.7978],
      [24.4500, 92.2500],
      [23.8315, 91.2868]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.93,
    source: "seed"
  },
  {
    id: "NH-306",
    name: "NH-306 (Silchar to Aizawl)",
    roadType: "national_highway",
    status: "at_risk",
    accessibilityScore: 72,
    floodRisk: 0.38,
    landslideRisk: 0.45,
    trafficLevel: "medium",
    speedKph: 29,
    clearancePercent: "72%",
    sector: "Mizoram Ridge Route",
    description: "Vairengte Escarpment - Heavy Mist & Saturated Slopes",
    geometry: [
      [24.8170, 92.7978],
      [24.3000, 92.7500],
      [23.7271, 92.7176]
    ],
    lastUpdated: new Date().toISOString(),
    confidence: 0.88,
    source: "weather"
  }
];

export const initialVehicles: Vehicle[] = [
  {
    id: "HV-09",
    name: "Freight Truck HV-09",
    cargoType: "medical",
    vehicleType: "heavy",
    driverName: "R. Boro",
    lat: 26.2500,
    lng: 92.1500,
    speedKph: 64,
    headingDeg: 82,
    status: "moving",
    currentCorridor: "NH-27",
    currentRouteId: "ROUTE-HV09",
    shipmentId: "SHP-002",
    cargoDescription: "Pharma & Cold Storage Vaccines",
    etaIso: new Date(Date.now() + 180 * 60000).toISOString(),
    delayMinutes: 0,
    batteryOrFuelPercent: 88,
    riskScore: 0.08,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "FW-18",
    name: "Medical Utility FW-18 (Flagship Unit)",
    cargoType: "medical",
    vehicleType: "four-wheeler",
    driverName: "T. Sangma",
    lat: 25.9000,
    lng: 91.8800,
    speedKph: 54,
    headingDeg: 172,
    status: "moving",
    currentCorridor: "NH-6",
    currentRouteId: "ROUTE-A",
    shipmentId: "SHP-001",
    cargoDescription: "High-Value Critical Medical Supplies",
    etaIso: new Date(Date.now() + 135 * 60000).toISOString(),
    delayMinutes: 0,
    batteryOrFuelPercent: 92,
    riskScore: 0.12,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "TW-04",
    name: "Courier Bike TW-04",
    cargoType: "medical",
    vehicleType: "two-wheeler",
    driverName: "K. Das",
    lat: 26.6500,
    lng: 92.8000,
    speedKph: 48,
    headingDeg: 95,
    status: "moving",
    currentCorridor: "NH-27 Bypass",
    currentRouteId: "ROUTE-TW04",
    shipmentId: "SHP-003",
    cargoDescription: "Medical Diagnostics Specimen",
    etaIso: new Date(Date.now() + 60 * 60000).toISOString(),
    delayMinutes: 4,
    batteryOrFuelPercent: 79,
    riskScore: 0.15,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "HV-31",
    name: "Heavy Container HV-31",
    cargoType: "construction",
    vehicleType: "heavy",
    driverName: "P. Gogoi",
    lat: 26.7509,
    lng: 94.2037,
    speedKph: 58,
    headingDeg: 65,
    status: "moving",
    currentCorridor: "NH-37",
    currentRouteId: "ROUTE-HV31",
    shipmentId: "SHP-004",
    cargoDescription: "Agricultural Machinery & Grid Spares",
    etaIso: new Date(Date.now() + 240 * 60000).toISOString(),
    delayMinutes: 12,
    batteryOrFuelPercent: 68,
    riskScore: 0.18,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "FW-07",
    name: "Light Cargo FW-07",
    cargoType: "food",
    vehicleType: "four-wheeler",
    driverName: "B. Debbarma",
    lat: 24.3000,
    lng: 92.0000,
    speedKph: 46,
    headingDeg: 215,
    status: "moving",
    currentCorridor: "NH-8",
    currentRouteId: "ROUTE-FW07",
    shipmentId: "SHP-006",
    cargoDescription: "Packaged Essential Food Provisions",
    etaIso: new Date(Date.now() + 95 * 60000).toISOString(),
    delayMinutes: 0,
    batteryOrFuelPercent: 85,
    riskScore: 0.10,
    lastUpdated: new Date().toISOString()
  }
];

export const initialShipments: Shipment[] = [
  {
    id: "SHP-001",
    origin: "Guwahati Central Depot",
    destination: "Shillong Civil Hospital",
    vehicleId: "FW-18",
    priority: 1,
    commodity: "Emergency Medicines & Trauma Kits",
    progressPercent: 45,
    etaIso: new Date(Date.now() + 135 * 60000).toISOString(),
    status: "on_time",
    currentRouteId: "ROUTE-A",
    riskScore: 0.12
  },
  {
    id: "SHP-002",
    origin: "Guwahati ICD",
    destination: "Dimapur Logistics Hub",
    vehicleId: "HV-09",
    priority: 1,
    commodity: "Temperature-Controlled Vaccine Consignment",
    progressPercent: 62,
    etaIso: new Date(Date.now() + 180 * 60000).toISOString(),
    status: "on_time",
    currentRouteId: "ROUTE-HV09",
    riskScore: 0.08
  },
  {
    id: "SHP-003",
    origin: "Tezpur Medical College",
    destination: "Nagaon Diagnostic Center",
    vehicleId: "TW-04",
    priority: 1,
    commodity: "Time-Sensitive Biological Pathology Specimens",
    progressPercent: 78,
    etaIso: new Date(Date.now() + 60 * 60000).toISOString(),
    status: "on_time",
    currentRouteId: "ROUTE-TW04",
    riskScore: 0.15
  },
  {
    id: "SHP-004",
    origin: "Silchar Sub-Station",
    destination: "Imphal Power Grid Facility",
    vehicleId: "HV-31",
    priority: 2,
    commodity: "High-Capacity Transformer Components",
    progressPercent: 30,
    etaIso: new Date(Date.now() + 320 * 60000).toISOString(),
    status: "at_risk",
    currentRouteId: "ROUTE-HV31",
    riskScore: 0.45
  },
  {
    id: "SHP-005",
    origin: "Guwahati FCI Godown",
    destination: "Aizawl Civil Supplies Warehouse",
    vehicleId: "HV-44",
    priority: 2,
    commodity: "Public Distribution Food Grain Rations",
    progressPercent: 52,
    etaIso: new Date(Date.now() + 410 * 60000).toISOString(),
    status: "delayed",
    currentRouteId: "ROUTE-HV44",
    riskScore: 0.65
  },
  {
    id: "SHP-006",
    origin: "Karimganj Border Depot",
    destination: "Agartala State Depot",
    vehicleId: "FW-07",
    priority: 1,
    commodity: "Essential Antibiotics & Saline Solutions",
    progressPercent: 84,
    etaIso: new Date(Date.now() + 95 * 60000).toISOString(),
    status: "on_time",
    currentRouteId: "ROUTE-FW07",
    riskScore: 0.10
  }
];

export const initialRoutes: RouteOption[] = [
  {
    id: "ROUTE-A",
    shipmentId: "SHP-001",
    name: "Route A — Direct NH-6 Expressway",
    distanceKm: 98,
    estimatedMinutes: 135,
    riskScore: 0.14,
    disruptionProbability: 0.15,
    recommended: true,
    via: "Guwahati ➔ Nongpoh ➔ Umiam ➔ Shillong",
    reason: "Shortest direct arterial path (Standard clearance)",
    geometry: [
      [26.1445, 91.7362],
      [25.9000, 91.8800],
      [25.7200, 91.8700],
      [25.5788, 91.8933]
    ]
  },
  {
    id: "ROUTE-B",
    shipmentId: "SHP-001",
    name: "Route B — Safe Lowland Bypass (Via Jowai)",
    distanceKm: 134,
    estimatedMinutes: 180,
    riskScore: 0.22,
    disruptionProbability: 0.05,
    recommended: false,
    via: "Guwahati ➔ Jagiroad ➔ Umsning Detour ➔ Jowai ➔ Shillong",
    reason: "+45 min transit, but 70% lower terrain disruption risk",
    geometry: [
      [26.1445, 91.7362],
      [26.1200, 92.2000],
      [25.8000, 92.1500],
      [25.5788, 91.8933]
    ]
  }
];

export const initialIncidents: Incident[] = [
  {
    id: "INC-4092",
    title: "Major Hillside Landslide — NH-13 Bomdila",
    type: "landslide",
    severity: "high",
    lat: 27.2600,
    lng: 92.4200,
    affectedRoadId: "NH-13",
    corridorName: "NH-13 Bomdila Sector KM 42+300",
    description: "Severe mudslide and rockfall spanning 65 meters across both carriageways following continuous 112mm precipitation. 2 heavy earthmovers on site under Project Vartak leadership. Estimated partial lane clearing window: 4 to 6 hours.",
    photoUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
    reportedBy: "Border Roads Organisation (Patrol Unit 7)",
    agency: "BRO Project Vartak",
    impact: "2 Heavy Commercial Convoys Halted. All traffic diverted via Tezpur.",
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    status: "verified",
    syncStatus: "synced"
  },
  {
    id: "INC-4089",
    title: "Slope Runoff & Culvert Overflow — NH-29",
    type: "flood",
    severity: "medium",
    lat: 25.7800,
    lng: 93.9200,
    affectedRoadId: "NH-29",
    corridorName: "NH-29 Kohima Bypass KM 18",
    description: "River water runoff overtopping low-level box culvert by 1.2 meters. Heavy commercial trucks staged at Zubza checkpoint until flow velocity subsides below safety thresholds.",
    photoUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
    reportedBy: "Nagaland State Disaster Response Force",
    agency: "Nagaland SDRF / Traffic Branch",
    impact: "Light vehicles escorted with single-file restriction. Trucks delayed.",
    createdAt: new Date(Date.now() - 19 * 60000).toISOString(),
    status: "verified",
    syncStatus: "synced"
  },
  {
    id: "INC-4075",
    title: "Bridge Axle Load Restriction — Umiam Checkpoint",
    type: "bridge_damage",
    severity: "low",
    lat: 25.6500,
    lng: 91.8800,
    affectedRoadId: "NH-6",
    corridorName: "NH-6 Nongpoh Valley Culvert KM 82",
    description: "Minor soil subsidence on shoulder embankment near KM 82. Steel plate bridging installed over culvert wing wall. Regulated single-file traffic passing under escort.",
    photoUrl: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=600&q=80",
    reportedBy: "National Highways & Infrastructure Development Corp (NHIDCL)",
    agency: "NHIDCL Engineering Unit",
    impact: "16 Metric Ton Gross Maximum. Multi-axle carriers diverted via Jowai.",
    createdAt: new Date(Date.now() - 34 * 60000).toISOString(),
    status: "verified",
    syncStatus: "synced"
  }
];

export const initialAlerts: Alert[] = [
  {
    id: "ALT-101",
    type: "road_blocked",
    severity: "critical",
    category: "blockade",
    title: "ROAD BLOCKED: NH-13 Bomdila Sector",
    message: "Landslide reported on NH-13 Bomdila Corridor. Highway closed. Alternate route via Tezpur active.",
    relatedRoadId: "NH-13",
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    acknowledged: false
  },
  {
    id: "ALT-102",
    type: "flood_risk",
    severity: "warning",
    category: "weather",
    title: "WEATHER WARNING: NH-29 Kohima Pass",
    message: "Heavy rainfall & slope erosion alert on NH-29 Kohima bypass. Speed capped to 20 km/h.",
    relatedRoadId: "NH-29",
    createdAt: new Date(Date.now() - 19 * 60000).toISOString(),
    acknowledged: false
  },
  {
    id: "ALT-103",
    type: "congestion",
    severity: "info",
    category: "load_cap",
    title: "BRIDGE LOAD CAP: Umiam Checkpoint",
    message: "16T gross limit enforced at Umiam bridge checkpoint. Multi-axle carriers must divert via Jowai.",
    relatedRoadId: "NH-6",
    createdAt: new Date(Date.now() - 34 * 60000).toISOString(),
    acknowledged: false
  }
];

export const initialWeather: WeatherSnapshot[] = [
  {
    location: "Guwahati (Kamrup Metro)",
    lat: 26.1445,
    lng: 91.7362,
    rainfallMm: 18.4,
    temperatureC: 28,
    windKph: 14,
    warningLevel: "none",
    forecastSummary: "Scattered light showers along river bank",
    timestamp: new Date().toISOString()
  },
  {
    location: "Shillong (East Khasi Hills)",
    lat: 25.5788,
    lng: 91.8933,
    rainfallMm: 34.2,
    temperatureC: 19,
    windKph: 22,
    warningLevel: "watch",
    forecastSummary: "Moderate mountain showers with low cloud base",
    timestamp: new Date().toISOString()
  },
  {
    location: "Kohima Pass",
    lat: 25.6751,
    lng: 94.1086,
    rainfallMm: 68.0,
    temperatureC: 17,
    windKph: 28,
    warningLevel: "warning",
    forecastSummary: "Heavy persistent rains, saturated terrain slopes",
    timestamp: new Date().toISOString()
  },
  {
    location: "Bomdila Pass (Arunachal)",
    lat: 27.2600,
    lng: 92.4200,
    rainfallMm: 112.5,
    temperatureC: 14,
    windKph: 35,
    warningLevel: "severe",
    forecastSummary: "Monsoon cloudburst; active slope instability",
    timestamp: new Date().toISOString()
  },
  {
    location: "Silchar (Barak Valley)",
    lat: 24.8170,
    lng: 92.7978,
    rainfallMm: 22.0,
    temperatureC: 30,
    windKph: 12,
    warningLevel: "none",
    forecastSummary: "Humid overcast with intermittent drizzle",
    timestamp: new Date().toISOString()
  }
];

export const initialKpis: KpiSummary = {
  activeVehicles: 148,
  activeIncidents: 3,
  atRiskRoutes: 4,
  blockedRoutes: 2,
  activeDeliveriesPercent: 96.4,
  corridorSlaPercent: 96.4,
  highPriorityShipments: 4
};

export const initialSnapshot: DataSnapshot = {
  vehicles: initialVehicles,
  roads: initialRoads,
  incidents: initialIncidents,
  shipments: initialShipments,
  routes: initialRoutes,
  alerts: initialAlerts,
  weather: initialWeather,
  kpis: initialKpis
};
