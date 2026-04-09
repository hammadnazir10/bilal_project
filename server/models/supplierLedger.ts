import mongoose from 'mongoose';

const supplierLedgerSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['PURCHASE', 'PAYMENT'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reference: String,
  notes: String,
}, { timestamps: true });

export default mongoose.model('SupplierLedger', supplierLedgerSchema);
