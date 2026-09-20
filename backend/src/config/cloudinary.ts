import { v2 as cloudinary } from 'cloudinary';

if (process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

export const uploadShipmentImage = (file: Express.Multer.File): Promise<{ secureUrl: string; publicId: string }> => {
    if (!process.env.CLOUDINARY_CLOUD_NAME
        || !process.env.CLOUDINARY_API_KEY
        || !process.env.CLOUDINARY_API_SECRET) {
        return Promise.reject(new Error('Cloudinary is not configured'));
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'nexora/shipments',
                resource_type: 'image',
            },
            (error, result) => {
                if (error || !result) {
                    reject(error ?? new Error('Cloudinary upload failed'));
                    return;
                }

                resolve({ secureUrl: result.secure_url, publicId: result.public_id });
            },
        );

        uploadStream.end(file.buffer);
    });
};