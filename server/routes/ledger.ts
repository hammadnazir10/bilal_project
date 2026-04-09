import express, { Request, Response, Router } from 'express';
import SupplierLedger from '../models/supplierLedger';
import Supplier from '../models/supplier';

const router: Router = express.Router();

// Get all transactions for a supplier with running balance (newest first)
router.get('/supplier/:supplierId', async (req: Request<{ supplierId: string }>, res: Response) => {
  try {
    const entries = await SupplierLedger.find({ supplier: req.params.supplierId })
      .sort({ date: 1, createdAt: 1 });

    let balance = 0;
    const withBalance = entries.map(e => {
      if (e.type === 'PURCHASE') balance += e.amount;
      else balance -= e.amount;
      return { ...e.toObject(), runningBalance: balance };
    });

    res.json(withBalance.reverse()); // newest first for display
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get summary for a supplier (totals + balance)
router.get('/supplier/:supplierId/summary', async (req: Request<{ supplierId: string }>, res: Response) => {
  try {
    const entries = await SupplierLedger.find({ supplier: req.params.supplierId });

    const totalPurchases = entries
      .filter(e => e.type === 'PURCHASE')
      .reduce((s, e) => s + e.amount, 0);
    const totalPaid = entries
      .filter(e => e.type === 'PAYMENT')
      .reduce((s, e) => s + e.amount, 0);

    const payments = entries.filter(e => e.type === 'PAYMENT').sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const all = [...entries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json({
      totalPurchases,
      totalPaid,
      balance: totalPurchases - totalPaid,
      lastPaymentDate: payments[0]?.date || null,
      lastTransactionDate: all[0]?.date || null,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get overview: all suppliers with outstanding balances
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const suppliers = await Supplier.find();
    const summaries = await Promise.all(suppliers.map(async (s) => {
      const entries = await SupplierLedger.find({ supplier: s._id });
      const totalPurchases = entries
        .filter(e => e.type === 'PURCHASE')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalPaid = entries
        .filter(e => e.type === 'PAYMENT')
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        supplier: { _id: s._id, name: s.name, contact: s.contact },
        totalPurchases,
        totalPaid,
        balance: totalPurchases - totalPaid,
      };
    }));
    res.json(summaries.filter(s => s.totalPurchases > 0 || s.totalPaid > 0));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Record a manual payment
router.post('/payment', async (req: Request, res: Response) => {
  try {
    const { supplier, amount, date, notes, reference } = req.body;
    if (!supplier || !amount) {
      res.status(400).json({ message: 'Supplier and amount are required' });
      return;
    }
    if (Number(amount) <= 0) {
      res.status(400).json({ message: 'Amount must be greater than 0' });
      return;
    }
    const entry = new SupplierLedger({
      supplier,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      type: 'PAYMENT',
      notes,
      reference,
    });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a payment entry (purchase entries cannot be manually deleted)
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const entry = await SupplierLedger.findById(req.params.id);
    if (!entry) {
      res.status(404).json({ message: 'Entry not found' });
      return;
    }
    if (entry.type === 'PURCHASE') {
      res.status(400).json({ message: 'Purchase entries are auto-generated and cannot be deleted.' });
      return;
    }
    await entry.deleteOne();
    res.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
