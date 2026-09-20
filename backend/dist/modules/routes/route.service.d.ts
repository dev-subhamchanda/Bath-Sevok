export interface Point {
    type: 'Point';
    coordinates: [number, number];
}
export interface AlternativeRoute {
    distanceKm: number;
    durationMinutes: number;
    coordinates: unknown;
    geometry: unknown;
}
export declare const getAlternativeRoutes: (origin: Point, destination: Point) => Promise<AlternativeRoute[]>;
//# sourceMappingURL=route.service.d.ts.map