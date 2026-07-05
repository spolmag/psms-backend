import mongoose from "mongoose";
import colors from "colors";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🟢 MongoDB Connected: ${conn.connection.host}`.bold);
  } catch (error) {
    console.error(`🔴 Error connect to MongoDB: ${error.message}`.bold);
    process.exit(1);
  }
};
