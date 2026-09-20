/**
 * Centralized API Gateway & Barrel Export
 *
 * Provides a unified entry point for all API services while maintaining
 * 100% backward compatibility with existing imports across the application.
 *
 * Dedicated modular domain services:
 * - httpClient: Base Axios client, interceptors, error formatting
 * - authService: Signin, registration, session, and JWT handling
 * - shipmentService: Shipment creation, listing, status updates, rerouting
 * - routeService: Route calculation, alternatives, coordinate parsing
 * - fleetService: Vehicle telemetry, driver registry, road segments
 * - incidentService: Ground incident reporting and listing
 * - telemetryService: INSAT weather, system health, KPIs, and demo triggers
 */

export * from "./httpClient";
export * from "./authService";
export * from "./shipmentService";
export * from "./routeService";
export * from "./fleetService";
export * from "./incidentService";
export * from "./telemetryService";
