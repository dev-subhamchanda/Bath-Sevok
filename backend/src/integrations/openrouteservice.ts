export const getOpenRouteServiceConfig = () => {
    const openRouteServiceUrl = process.env.ORS_URL ?? 'https://api.openrouteservice.org';

    return {
        apiKey: process.env.ORS_API_KEY,
        directionsUrl: `${openRouteServiceUrl}/v2/directions/driving-car/geojson`,
    };
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

export const generateRoute = async <TResponse = unknown>(
    origin: OpenRouteServicePoint,
    destination: OpenRouteServicePoint,
    options: GenerateRouteOptions = {},
): Promise<TResponse> => {
    const { apiKey, directionsUrl } = getOpenRouteServiceConfig();
    if (!apiKey) {
        throw new Error('ORS_API_KEY is not configured');
    }

    const { alternativeRoutes } = options;
    const response = await fetch(directionsUrl, {
        method: 'POST',
        headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            coordinates: [origin.coordinates, destination.coordinates],
            geometry_simplify: true,
            ...(alternativeRoutes && {
                alternative_routes: {
                    target_count: alternativeRoutes.targetCount ?? 3,
                    share_factor: alternativeRoutes.shareFactor ?? 0.6,
                    weight_factor: alternativeRoutes.weightFactor ?? 1.4,
                },
            }),
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenRouteService request failed with status ${response.status}`);
    }

    return await response.json() as TResponse;
};
