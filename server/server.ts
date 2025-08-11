import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import suppliersRouter from './routes/suppliers';

// Configure dotenv - try multiple paths
const envPath = path.resolve(__dirname, '.env');
const envPathAlt = path.resolve(process.cwd(), '.env');
console.log('Trying to load .env from:', envPath);
dotenv.config({ path: envPath });
if (!process.env.MONGODB_URI) {
  console.log('Trying alternative .env path:', envPathAlt);
  dotenv.config({ path: envPathAlt });
}
console.log('Environment variables loaded. PORT:', process.env.PORT, 'MONGODB_URI exists:', !!process.env.MONGODB_URI);

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000", 
  "https://bilal-project-kcbv.vercel.app" 
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware

app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shop_management';
console.log('Attempting to connect to MongoDB with URI:', mongoURI);
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/suppliers', suppliersRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
