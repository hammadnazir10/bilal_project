import mongoose from 'mongoose';

const partyLedgerSchema = new mongoose.Schema({
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true,
    index: true,
  },
  // User-selected transaction date (business date)
  transactionDate: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['DEBIT', 'CREDIT'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Online Transfer', 'Cheque'],
    required: true,
  },
  notes: {
    type: String,
  },
}, {
  // timestamps.createdAt = system timestamp (actual server time of data entry)
  timestamps: true,
});

export default mongoose.model('PartyLedger', partyLedgerSchema);
