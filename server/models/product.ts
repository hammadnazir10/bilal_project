import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    // Will store full name like "PX3 CHINA 30 BORE"
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },  costPrice: {
    type: Number,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: false  // Optional field
  },
  category: {
    type: String,
    required: true,
    enum: ['Pistol', 'Rifle']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Product', productSchema);
