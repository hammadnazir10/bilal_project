import express, { Request, Response, Router } from 'express';
import Party from '../models/party';
import PartyLedger from '../models/partyLedger';

const router: Router = express.Router();

// GET all parties
router.get('/', async (_req: Request, res: Response) => {
  try {
    const parties = await Party.find().sort({ name: 1 });
    res.json(parties);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET single party
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) { res.status(404).json({ message: 'Party not found' }); return; }
    res.json(party);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create party
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, address, partyType, openingBalance, caseStartDate } = req.body;
    if (!name) { res.status(400).json({ message: 'Name is required' }); return; }
    const party = new Party({
      name: name.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      partyType: partyType || 'Customer',
      openingBalance: Number(openingBalance) || 0,
      caseStartDate: caseStartDate ? new Date(caseStartDate) : new Date(),
    });
    const saved = await party.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update party
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, phone, address, partyType, openingBalance, caseStartDate } = req.body;
    const party = await Party.findById(req.params.id);
    if (!party) { res.status(404).json({ message: 'Party not found' }); return; }
    if (name) party.name = name.trim();
    if (phone !== undefined) party.phone = phone?.trim();
    if (address !== undefined) party.address = address?.trim();
    if (partyType) party.partyType = partyType;
    if (openingBalance !== undefined) party.openingBalance = Number(openingBalance) || 0;
    if (caseStartDate) party.caseStartDate = new Date(caseStartDate);
    const updated = await party.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE party (also deletes their ledger entries)
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) { res.status(404).json({ message: 'Party not found' }); return; }
    await PartyLedger.deleteMany({ party: party._id });
    await party.deleteOne();
    res.json({ message: 'Party deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
