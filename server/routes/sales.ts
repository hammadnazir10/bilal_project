import express, { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import Sale from '../models/sale';
import Product from '../models/product';

interface SaleProduct {
  product: string;
  quantity: number;
  salePrice: number;
}

interface SaleRequestBody {
  voucherNumber: string;
  products: SaleProduct[];
  date?: Date;
  customer?: string;
}

const router: Router = express.Router();

// Get all sales
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const sales = await Sale.find().populate('products.product');
    if(!sales || sales.length === 0) {
      res.status(404).json({ message: 'No sales found' });
      return;
    }
    res.json(sales);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Get monthly sales report
router.get('/monthly/:year/:month', async (req: Request<{ year: string; month: string }>, res: Response): Promise<void> => {
  try {
    const startDate = new Date(parseInt(req.params.year), parseInt(req.params.month) - 1, 1);
    const endDate = new Date(parseInt(req.params.year), parseInt(req.params.month), 0);

    const sales = await Sale.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('products.product');

    const totalSales = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const totalProfit = sales.reduce((acc, sale) => acc + sale.profit, 0);

    res.json({
      sales,
      summary: {
        totalSales,
        totalProfit,
        numberOfSales: sales.length
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Add new sale
router.post('/', async (req: Request<ParamsDictionary, any, SaleRequestBody>, res: Response): Promise<void> => {
  try {
    // Validation
    const { voucherNumber, products } = req.body;
    
    if (!voucherNumber || !products || products.length === 0) {
      res.status(400).json({ 
        message: 'Missing required fields: voucherNumber and at least one product are required' 
      });
      return;
    }

    if (voucherNumber.trim().length < 1) {
      res.status(400).json({ message: 'Voucher number cannot be empty' });
      return;
    }

    // Check if voucher number already exists
    const existingVoucher = await Sale.findOne({ voucherNumber: voucherNumber.trim() });
    if (existingVoucher) {
      res.status(400).json({ 
        message: `Sale with voucher number "${voucherNumber}" already exists. Please use a different voucher number.` 
      });
      return;
    }

    let totalAmount = 0;
    let profit = 0;

    // Validate all products first before making any changes
    for (const item of req.body.products) {
      if (!item.product || !item.quantity || !item.salePrice) {
        res.status(400).json({ message: 'Each product must have product ID, quantity, and sale price' });
        return;
      }

      if (item.quantity <= 0) {
        res.status(400).json({ message: 'Quantity must be greater than 0' });
        return;
      }

      if (item.salePrice <= 0) {
        res.status(400).json({ message: 'Sale price must be greater than 0' });
        return;
      }

      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404).json({ message: `Product not found` });
        return;
      }

      if (product.quantity < item.quantity) {
        res.status(400).json({ 
          message: `Insufficient stock for product "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}` 
        });
        return;
      }
    }    // If all validations pass, proceed with the sale
    for (const item of req.body.products) {
      const product = await Product.findById(item.product);
      if (product) {
        console.log(`=== PRODUCT UPDATE DEBUG ===`);
        console.log(`Product: ${product.name}`);
        console.log(`Current quantity: ${product.quantity}`);
        console.log(`Selling quantity: ${item.quantity}`);
        console.log(`New quantity should be: ${product.quantity - item.quantity}`);
        
        // Update product quantity
        const oldQuantity = product.quantity;
        product.quantity -= item.quantity;
        await product.save();
        
        console.log(`Quantity after save: ${product.quantity}`);
        console.log(`Update successful: ${oldQuantity} -> ${product.quantity}`);
        console.log(`==============================`);

        // Calculate amount and profit
        totalAmount += item.salePrice * item.quantity;
        profit += (item.salePrice - product.costPrice) * item.quantity;
      }
    }

    const sale = new Sale({
      ...req.body,
      voucherNumber: voucherNumber.trim(),
      totalAmount,
      profit
    });

    const newSale = await sale.save();
    res.status(201).json(newSale);
  } catch (error: any) {
    console.error('Error creating sale:', error);
    
    if (error.code === 11000) {
      // MongoDB duplicate key error
      res.status(400).json({ 
        message: 'A sale with this voucher number already exists. Please use a different voucher number.' 
      });
    } else if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: `Validation error: ${messages.join(', ')}` });
    } else {
      res.status(500).json({ message: 'Failed to create sale. Please try again.' });
    }
  }
});

// Delete a sale
router.delete('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (sale) {
      // Restore product quantities
      for (const item of sale.products) {
        const product = await Product.findById(item.product);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }

      await sale.deleteOne();
      res.json({ message: 'Sale deleted successfully' });
    } else {
      res.status(404).json({ message: 'Sale not found' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

export default router;
