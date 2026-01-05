/**
 * Generate Random Fees Script
 * 
 * Script này tạo ngẫu nhiên các khoản phí (transactions) cho tất cả các căn hộ
 * với các loại phí khác nhau trong hệ thống.
 * 
 * Tính năng:
 *   - Tạo transactions cho tất cả apartments với tất cả fees
 *   - Tính toán totalAmount dựa trên unit của fee (m2, khẩu, hộ, kWh, m3)
 *   - Tạo transactions cho nhiều tháng/năm khác nhau
 *   - Tránh duplicate transactions (Service fees chỉ 1 lần/tháng)
 *   - Cho phép Contribution fees có thể đóng nhiều lần
 * 
 * Usage:
 *   npx ts-node scripts/generate-random-fees.ts
 * 
 * Environment Variables:
 *   MONGO_URI - MongoDB connection string (required)
 *   MONTHS_BACK - Số tháng tạo transactions về trước (default: 6)
 *   TRANSACTION_RATE - Tỷ lệ tạo transaction (0-1, default: 0.8 = 80%)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.config';
import Apartment from '../src/models/apartment.model';
import Fee, { FeeType, FeeUnit } from '../src/models/fee.model';
import Transaction, { TransactionStatus } from '../src/models/transaction.model';
import Resident from '../src/models/resident.model';
import User from '../src/models/user.model';

const MONTHS_BACK = parseInt(process.env.MONTHS_BACK || '6');
const TRANSACTION_RATE = parseFloat(process.env.TRANSACTION_RATE || '0.8');

const log = (step: string, message: string) => {
  console.log(`[${step}] ${message}`);
};

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const randomBool = (probability: number = 0.5): boolean => {
  return Math.random() < probability;
};
const calculateAmount = async (
  fee: any,
  apartment: any
): Promise<{ totalAmount: number; quantity: number; usage?: number }> => {
  let totalAmount = 0;
  let quantity = 0;
  let usage: number | undefined = undefined;

  switch (fee.unit) {
    case FeeUnit.Area:
      quantity = apartment.area || 0;
      totalAmount = fee.amount * quantity;
      break;

    case FeeUnit.Person:
      const memberCount = apartment.members?.length || 0;
      quantity = memberCount;
      totalAmount = fee.amount * quantity;
      break;

    case FeeUnit.Apartment:
      quantity = 1;
      totalAmount = fee.amount;
      break;

    case FeeUnit.KWh:
      usage = randomInt(50, 300);
      quantity = usage;
      totalAmount = fee.amount * usage;
      break;

    case FeeUnit.WaterCube:
      usage = randomInt(5, 25);
      quantity = usage;
      totalAmount = fee.amount * usage;
      break;

    default:
      quantity = 1;
      totalAmount = fee.amount;
  }

  return { totalAmount: Math.round(totalAmount), quantity, usage };
};

const generateDates = (): Array<{ month: number; year: number; date: Date }> => {
  const dates: Array<{ month: number; year: number; date: Date }> = [];
  const now = new Date();
  
  for (let i = 0; i < MONTHS_BACK; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, randomInt(1, 28));
    dates.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      date
    });
  }
  
  return dates;
};

const getRandomPayerName = (apartment: any): string => {
  const names = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'];
  return names[randomInt(0, names.length - 1)];
};

async function generateRandomFees() {
  try {
    log('DB', 'Connecting to database...');
    await connectDB();
    log('DB', '✓ Connected');

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      log('ERROR', 'No admin user found. Please create root admin first.');
      process.exit(1);
    }

    log('DATA', 'Fetching apartments...');
    const apartments = await Apartment.find().populate('members');
    log('DATA', `Found ${apartments.length} apartments`);

    if (apartments.length === 0) {
      log('ERROR', 'No apartments found. Please seed apartments first.');
      process.exit(1);
    }

    log('DATA', 'Fetching fees...');
    const fees = await Fee.find({ isActive: true });
    log('DATA', `Found ${fees.length} active fees`);

    if (fees.length === 0) {
      log('ERROR', 'No active fees found. Please create fees first.');
      process.exit(1);
    }

    const dates = generateDates();
    log('DATA', `Generating transactions for ${dates.length} months`);
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    log('GENERATE', `\nStarting transaction generation...`);
    log('GENERATE', `Transaction rate: ${(TRANSACTION_RATE * 100).toFixed(0)}%`);

    for (const apartment of apartments) {
      if (!randomBool(TRANSACTION_RATE)) {
        totalSkipped++;
        continue;
      }

      for (const fee of fees) {
        const shouldCreateMultiple = fee.type === FeeType.Contribution && randomBool(0.3);

        for (const dateInfo of dates) {
          if (fee.type === FeeType.Service) {
            const existing = await Transaction.findOne({
              apartmentId: apartment._id,
              feeId: fee._id,
              month: dateInfo.month,
              year: dateInfo.year
            });

            if (existing) {
              continue;
            }
          }

          if (fee.type === FeeType.Contribution && !shouldCreateMultiple && !randomBool(0.7)) {
            continue;
          }

          try {
            const { totalAmount, quantity, usage } = await calculateAmount(fee, apartment);

            if (totalAmount <= 0) {
              continue;
            }
            const transaction = await Transaction.create({
              apartmentId: apartment._id,
              feeId: fee._id,
              totalAmount,
              payerName: getRandomPayerName(apartment),
              createdBy: adminUser._id,
              date: dateInfo.date,
              month: dateInfo.month,
              year: dateInfo.year,
              usage,
              unitPrice: fee.amount,
              status: TransactionStatus.Completed
            });

            totalCreated++;
            
            if (totalCreated % 50 === 0) {
              process.stdout.write(`\r  Created: ${totalCreated} transactions...`);
            }
          } catch (error: any) {
            if (error.code === 11000) {
              totalSkipped++;
            } else {
              totalErrors++;
              log('ERROR', `Failed to create transaction: ${error.message}`);
            }
          }
        }
      }
    }

    console.log('\n');
    console.log('\n' + '═'.repeat(60));
    log('SUMMARY', 'Transaction generation completed!');
    console.log('═'.repeat(60));
    console.log(`\n📊 STATISTICS:`);
    console.log(`   ✓ Created: ${totalCreated.toLocaleString()} transactions`);
    console.log(`   ○ Skipped: ${totalSkipped.toLocaleString()} (duplicates or filtered)`);
    console.log(`   ✗ Errors: ${totalErrors.toLocaleString()}`);
    const revenueStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
          avgAmount: { $avg: '$totalAmount' }
        }
      }
    ]);

    if (revenueStats.length > 0) {
      const stats = revenueStats[0];
      console.log(`\n💰 REVENUE STATISTICS:`);
      console.log(`   Total Revenue: ${stats.totalRevenue.toLocaleString('vi-VN')} VND`);
      console.log(`   Total Transactions: ${stats.totalTransactions.toLocaleString()}`);
      console.log(`   Average Amount: ${Math.round(stats.avgAmount).toLocaleString('vi-VN')} VND`);
    }
    const feeTypeStats = await Transaction.aggregate([
      {
        $lookup: {
          from: 'fees',
          localField: 'feeId',
          foreignField: '_id',
          as: 'fee'
        }
      },
      {
        $unwind: '$fee'
      },
      {
        $group: {
          _id: '$fee.type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    if (feeTypeStats.length > 0) {
      console.log(`\n📋 BY FEE TYPE:`);
      for (const stat of feeTypeStats) {
        console.log(`   ${stat._id}: ${stat.count.toLocaleString()} transactions, ${stat.totalAmount.toLocaleString('vi-VN')} VND`);
      }
    }
    const monthStats = await Transaction.aggregate([
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 6
      }
    ]);

    if (monthStats.length > 0) {
      console.log(`\n📅 RECENT MONTHS:`);
      for (const stat of monthStats) {
        console.log(`   ${stat._id.month}/${stat._id.year}: ${stat.count.toLocaleString()} transactions, ${stat.totalAmount.toLocaleString('vi-VN')} VND`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    log('DONE', 'Script completed successfully!');
    console.log('═'.repeat(60) + '\n');

    process.exit(0);
  } catch (error: any) {
    log('FATAL', `Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run script
generateRandomFees();

