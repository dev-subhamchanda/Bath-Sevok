import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const clientOptions = {
    serverApi: { version: '1', strict: true, deprecationErrors: true },
};
export async function runDB() {
    const uri = process.env.DB_URL;
    if (!uri) {
        throw new Error('MONGODB_URI or DB_URL is not defined');
    }
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(uri, clientOptions);
        console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);
    }
}
//# sourceMappingURL=database.js.map