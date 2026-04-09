import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import suppliersRouter from './routes/suppliers';
import dashboardRouter from './routes/dashboard';
import authRouter from './routes/auth';
import ledgerRouter from './routes/ledger';
import { requireAuth } from './middleware/auth';

// Configure dotenv
const envPath = path.resolve(__dirname, '.env');
const envPathAlt = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });
if (!process.env.MONGODB_URI) dotenv.config({ path: envPathAlt });

const app = express();
const port = process.env.PORT || 8000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://bilal-project.onrender.com/api",
  "https://bilal-project.onrender.com",
  "https://adilarms.onrender.com"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("CORS not allowed for this origin"));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myshop';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/products',  requireAuth, productsRouter);
app.use('/api/sales',     requireAuth, salesRouter);
app.use('/api/suppliers', requireAuth, suppliersRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/ledger',    requireAuth, ledgerRouter);

app.listen(port, () => console.log(`Server running on port ${port}`));
