import axios from 'axios';

const getAiService = () => {
    const serviceUri = process.env.AI_SERVICE_URI ?? process.env.AI_BASE_URI;
    if (!serviceUri) {
        throw new Error('AI_SERVICE_URI is not configured');
    }

    return axios.create({
        baseURL: serviceUri,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const getPreferableRoute = async (
    routeData:object,
) => {
    try {
        const response = await getAiService().post('/dispatch', routeData);
        return response.data;
    } catch (error) {
        console.error('Error fetching preferable route:', error);
        throw error;
    }
}