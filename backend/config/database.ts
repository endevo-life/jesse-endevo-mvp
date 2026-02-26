import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI ?? '');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`MongoDB connection error: ${message}`);
    process.exit(1);
  }
}
