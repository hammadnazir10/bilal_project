import mongoose from 'mongoose';

const partySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  partyType: {
    type: String,
    enum: ['Supplier', 'Customer', 'Other'],
    required: true,
    default: 'Customer',
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  caseStartDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('Party', partySchema);
