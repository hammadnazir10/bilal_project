import express, { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import Supplier from '../models/supplier';

interface SupplierRequestBody {
  name: string;
  contact: string;
  address?: string;
  email?: string;
  phone?: string;
}

const router: Router = express.Router();

// Get all suppliers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const suppliers = await Supplier.find().populate('products');
    res.json(suppliers);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Get a single supplier
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id).populate('products');
    if (supplier) {
      res.json(supplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

// Add a new supplier
router.post('/', async (req: Request<ParamsDictionary, any, SupplierRequestBody>, res: Response) => {
  try {
    // Validation
    const { name, contact } = req.body;
    
    if (!name || !contact) {
      res.status(400).json({ 
        message: 'Missing required fields: name and contact are required' 
      });
      return;
    }

    if (name.trim().length < 2) {
      res.status(400).json({ message: 'Supplier name must be at least 2 characters long' });
      return;
    }

    if (contact.trim().length < 5) {
      res.status(400).json({ message: 'Contact must be at least 5 characters long' });
      return;
    }

    // Check if supplier with same name already exists
    const existingSupplier = await Supplier.findOne({ name: name.trim() });
    if (existingSupplier) {
      res.status(400).json({ 
        message: `Supplier with name "${name}" already exists. Please use a different name.` 
      });
      return;
    }

    // Check if supplier with same contact already exists
    const existingContact = await Supplier.findOne({ contact: contact.trim() });
    if (existingContact) {
      res.status(400).json({ 
        message: `Supplier with contact "${contact}" already exists. Please use a different contact.` 
      });
      return;
    }

    const supplier = new Supplier({
      ...req.body,
      name: name.trim(),
      contact: contact.trim()
    });
    const newSupplier = await supplier.save();
    res.status(201).json(newSupplier);
  } catch (error: any) {
    console.error('Error adding supplier:', error);
    
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({ 
        message: `A supplier with this ${field} already exists. Please use a different ${field}.` 
      });
    } else if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: `Validation error: ${messages.join(', ')}` });
    } else {
      res.status(500).json({ message: 'Failed to add supplier. Please try again.' });
    }
  }
});

// Update a supplier
router.put('/:id', async (req: Request<{ id: string }, any, SupplierRequestBody>, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
      Object.assign(supplier, req.body);
      const updatedSupplier = await supplier.save();
      res.json(updatedSupplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
});

// Delete a supplier
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
      await supplier.deleteOne();
      res.json({ message: 'Supplier deleted successfully' });
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
});

export default router;
