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
import partiesRouter from './routes/parties';
import partyLedgerRouter from './routes/partyLedger';
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
  "https://bilal-project.onrender.com",
  "https://adilarms.onrender.com"
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Handle preflight requests for all routes
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));

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
app.use('/api/ledger',        requireAuth, ledgerRouter);
app.use('/api/parties',       requireAuth, partiesRouter);
app.use('/api/party-ledger',  requireAuth, partyLedgerRouter);

app.listen(port, () => console.log(`Server running on port ${port}`));
