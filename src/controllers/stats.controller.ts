import { Request, Response, NextFunction } from 'express';
import Resident from '../models/resident.model';
import Apartment from '../models/apartment.model';
import Transaction from '../models/transaction.model';

/**
 * Get Dashboard Stats
 * @route GET /api/stats/dashboard
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const [totalResidents, totalApartments, totalRevenueData, monthlyRevenueData, recentTransactions] = await Promise.all([
      // 1. Total Residents (excluding moved out)
      Resident.countDocuments({ status: { $ne: 'Đã chuyển đi' } }),
      
      // 2. Total Apartments
      Apartment.countDocuments({}),
      
      // 3. Total Revenue
      Transaction.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // 4. Monthly Revenue
      Transaction.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),

      // 5. Recent Transactions
      Transaction.find()
        .sort({ date: -1 })
        .limit(5)
        .populate('apartmentId', 'name')
        .populate('feeId', 'title')
    ]);

    const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].total : 0;
    const currentMonthRevenue = monthlyRevenueData.length > 0 ? monthlyRevenueData[0].total : 0;

    // Format recent transactions
    const formattedTransactions = recentTransactions.map(t => ({
      apartment: (t.apartmentId as any)?.name || 'Unknown',
      fee: (t.feeId as any)?.title || 'Unknown',
      amount: t.totalAmount,
      date: t.date
    }));

    res.status(200).json({
      success: true,
      data: {
        totalResidents,
        totalApartments,
        totalRevenue,
        currentMonthRevenue,
        recentTransactions: formattedTransactions
      }
    });

  } catch (error) {
    next(error);
  }
};
