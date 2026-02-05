import express from 'express';
import Product from '../models/product';
import Sale from '../models/sale';
import Supplier from '../models/supplier';

const router = express.Router();

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await Product.countDocuments();
    
    // Get today's sales (current date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySales = await Sale.aggregate([
      {
        $match: {
          date: {
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const todaySalesAmount = todaySales.length > 0 ? todaySales[0].totalAmount : 0;
    
    // Get monthly orders count (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const monthlyOrders = await Sale.countDocuments({
      date: {
        $gte: currentMonth,
        $lt: nextMonth
      }
    });
    
    // Get active suppliers count
    const activeSuppliers = await Supplier.countDocuments();
    
    res.json({
      totalProducts,
      todaySales: todaySalesAmount,
      monthlyOrders,
      activeSuppliers
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Failed to fetch dashboard statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
