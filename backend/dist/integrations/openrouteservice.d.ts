export declare const getOpenRouteServiceConfig: () => {
    apiKey: string | undefined;
    directionsUrl: string;
};
export interface OpenRouteServicePoint {
    coordinates: [number, number];
}
export interface GenerateRouteOptions {
    alternativeRoutes?: {
        targetCount?: number;
        shareFactor?: number;
        weightFactor?: number;
    };
}
export declare const generateRoute: <TResponse = unknown>(origin: OpenRouteServicePoint, destination: OpenRouteServicePoint, options?: GenerateRouteOptions) => Promise<TResponse>;
//# sourceMappingURL=openrouteservice.d.ts.map