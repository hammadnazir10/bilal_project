import express, { Request, Response, Router } from 'express';
import PartyLedger from '../models/partyLedger';
import Party from '../models/party';

const router: Router = express.Router();

// GET timeline for a party — chronological with running balance
router.get('/party/:partyId', async (req: Request<{ partyId: string }>, res: Response) => {
  try {
    const party = await Party.findById(req.params.partyId);
    if (!party) { res.status(404).json({ message: 'Party not found' }); return; }

    const entries = await PartyLedger.find({ party: req.params.partyId })
      .sort({ transactionDate: 1, createdAt: 1 });

    // Running balance starts from opening balance
    let balance = party.openingBalance || 0;
    const withBalance = entries.map(e => {
      if (e.type === 'DEBIT') balance += e.amount;
      else balance -= e.amount;
      return {
        ...e.toObject(),
        runningBalance: balance,
        // systemTimestamp = createdAt (actual time of data entry)
        systemTimestamp: e.createdAt,
      };
    });

    res.json({
      party: {
        _id: party._id,
        name: party.name,
        phone: party.phone,
        address: party.address,
        partyType: party.partyType,
        openingBalance: party.openingBalance,
        caseStartDate: party.caseStartDate,
      },
      entries: withBalance,
      currentBalance: balance,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET summary for a party
router.get('/party/:partyId/summary', async (req: Request<{ partyId: string }>, res: Response) => {
  try {
    const party = await Party.findById(req.params.partyId);
    if (!party) { res.status(404).json({ message: 'Party not found' }); return; }

    const entries = await PartyLedger.find({ party: req.params.partyId });
    const totalDebits = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    const totalCredits = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    const balance = (party.openingBalance || 0) + totalDebits - totalCredits;

    res.json({
      openingBalance: party.openingBalance || 0,
      totalDebits,
      totalCredits,
      balance,
      transactionCount: entries.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET overview: all parties with balances
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const parties = await Party.find().sort({ name: 1 });
    const summaries = await Promise.all(parties.map(async (p) => {
      const entries = await PartyLedger.find({ party: p._id });
      const totalDebits = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
      const totalCredits = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
      const balance = (p.openingBalance || 0) + totalDebits - totalCredits;
      return {
        party: { _id: p._id, name: p.name, phone: p.phone, partyType: p.partyType, caseStartDate: p.caseStartDate },
        openingBalance: p.openingBalance || 0,
        totalDebits,
        totalCredits,
        balance,
      };
    }));
    res.json(summaries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST add a transaction
router.post('/transaction', async (req: Request, res: Response) => {
  try {
    const { party, transactionDate, type, amount, paymentMethod, notes } = req.body;
    if (!party || !type || !amount || !paymentMethod) {
      res.status(400).json({ message: 'party, type, amount, and paymentMethod are required' });
      return;
    }
    if (!['DEBIT', 'CREDIT'].includes(type)) {
      res.status(400).json({ message: 'type must be DEBIT or CREDIT' });
      return;
    }
    if (Number(amount) <= 0) {
      res.status(400).json({ message: 'Amount must be greater than 0' });
      return;
    }
    const partyExists = await Party.findById(party);
    if (!partyExists) { res.status(404).json({ message: 'Party not found' }); return; }

    const entry = new PartyLedger({
      party,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      type,
      amount: Number(amount),
      paymentMethod,
      notes,
    });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE a transaction
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const entry = await PartyLedger.findById(req.params.id);
    if (!entry) { res.status(404).json({ message: 'Entry not found' }); return; }
    await entry.deleteOne();
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
