import express, { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import Product from '../models/product';
import SupplierLedger from '../models/supplierLedger';

interface ProductRequestBody {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
  category: string;
  supplier?: string;  // Optional supplier ID
}

const router: Router = express.Router();

// Get all products
router.get('/', async (_req: Request, res: Response) => {  try {
    const products = await Product.find().populate('supplier');
    res.json(products);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Get a single product
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Add a new product
router.post('/', async (req: Request<ParamsDictionary, any, ProductRequestBody>, res: Response) => {
  try {
    // Validation
    const { productId, name, quantity, costPrice, category } = req.body;
    
    if (!productId || !name || quantity === undefined || costPrice === undefined || !category) {
      res.status(400).json({ 
        message: 'Missing required fields: productId, name, quantity, costPrice, and category are required' 
      });
      return;
    }

    if (quantity < 0) {
      res.status(400).json({ message: 'Quantity cannot be negative' });
      return;
    }

    if (costPrice <= 0) {
      res.status(400).json({ message: 'Cost price must be greater than 0' });
      return;
    }

    if (!['Pistol', 'Rifle'].includes(category)) {
      res.status(400).json({ message: 'Category must be either "Pistol" or "Rifle"' });
      return;
    }

    // Check if product with same ID already exists
    const existingProduct = await Product.findOne({ productId });
    if (existingProduct) {
      res.status(400).json({ 
        message: `Product with ID "${productId}" already exists. Please use a different Product ID.` 
      });
      return;
    }

    // Check if product with same name already exists
    const existingName = await Product.findOne({ name });
    if (existingName) {
      res.status(400).json({ 
        message: `Product with name "${name}" already exists. Please use a different name.` 
      });
      return;
    }

    const product = new Product(req.body);
    const newProduct = await product.save();

    // Auto-create purchase ledger entry if supplier assigned and quantity > 0
    if (req.body.supplier && newProduct.quantity > 0) {
      await SupplierLedger.create({
        supplier: req.body.supplier,
        date: new Date(),
        type: 'PURCHASE',
        amount: newProduct.quantity * newProduct.costPrice,
        reference: newProduct.name,
        notes: `Initial stock: ${newProduct.quantity} units @ PKR ${newProduct.costPrice}`,
      });
    }

    res.status(201).json(newProduct);
  } catch (error: any) {
    console.error('Error adding product:', error);
    
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({ 
        message: `A product with this ${field} already exists. Please use a different ${field}.` 
      });
    } else if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: `Validation error: ${messages.join(', ')}` });
    } else {
      res.status(500).json({ message: 'Failed to add product. Please try again.' });
    }
  }
});

// Update a product
router.put('/:id', async (req: Request<{ id: string }, any, ProductRequestBody>, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      const oldQuantity = product.quantity;
      Object.assign(product, req.body);
      const updatedProduct = await product.save();

      // Auto-create purchase ledger entry if quantity increased and supplier is set
      const addedQty = updatedProduct.quantity - oldQuantity;
      if (addedQty > 0 && updatedProduct.supplier) {
        await SupplierLedger.create({
          supplier: updatedProduct.supplier,
          date: new Date(),
          type: 'PURCHASE',
          amount: addedQty * updatedProduct.costPrice,
          reference: updatedProduct.name,
          notes: `Stock addition: ${addedQty} units @ PKR ${updatedProduct.costPrice}`,
        });
      }

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
});

// Delete a product
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

export default router;
