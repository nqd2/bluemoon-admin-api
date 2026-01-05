import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Fee, { FeeType, FeeUnit } from '../models/fee.model';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bluemoon-db';

const seedFees = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    const fees = [
      {
        title: 'Phí Dịch Vụ Cố Định',
        description: 'Phí dịch vụ chung cư bắt buộc hàng tháng theo diện tích',
        type: FeeType.Service,
        amount: 7000, // 7.000 VNĐ
        unit: FeeUnit.Area,
        isActive: true
      },
      {
        title: 'Phí Quản Lý',
        description: 'Phí quản lý vận hành chung cư',
        type: FeeType.Service,
        amount: 5000,
        unit: FeeUnit.Area,
        isActive: true
      },
      {
        title: 'Tiền Điện',
        description: 'Phí điện sinh hoạt hàng tháng',
        type: FeeType.Utility,
        amount: 3000, // 3.000 VNĐ / kWh
        unit: FeeUnit.KWh,
        isActive: true
      },
      {
        title: 'Tiền Nước',
        description: 'Phí nước sinh hoạt hàng tháng',
        type: FeeType.Utility,
        amount: 15000, // 15.000 VNĐ / m3
        unit: FeeUnit.WaterCube,
        isActive: true
      },
      {
        title: 'Quỹ Vì Người Nghèo',
        description: 'Quỹ đóng góp tự nguyện',
        type: FeeType.Contribution,
        amount: 50000,
        unit: FeeUnit.Apartment,
        isActive: true
      }
    ];

    for (const feeData of fees) {
      const existing = await Fee.findOne({ title: feeData.title });
      if (!existing) {
        await Fee.create(feeData);
        console.log(`Created Fee: ${feeData.title}`);
      } else {
        console.log(`Fee already exists: ${feeData.title}`);
      }
    }

    console.log('Fee Seeding Completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding fees:', error);
    process.exit(1);
  }
};

seedFees();
