import request from 'supertest';
import app from '../src/app';
import User from '../src/models/user.model';
import Fee, { FeeType, FeeUnit } from '../src/models/fee.model';
import Apartment from '../src/models/apartment.model';
import Transaction from '../src/models/transaction.model';
import jwt from 'jsonwebtoken';

const adminUser = {
  username: 'adminuser',
  password: 'password123',
  role: 'admin'
};

let token: string;
let userId: string;

beforeEach(async () => {
  const user = await User.create(adminUser);
  userId = user._id.toString();
  token = jwt.sign({ id: userId, role: user.role }, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '30d'
  });
});

describe('Transaction API', () => {
  let feeId: string;
  let apartmentId: string;

  beforeEach(async () => {
    const fee = await Fee.create({
      title: 'Service Fee',
      type: FeeType.Service,
      amount: 5000,
      unit: FeeUnit.Area
    });
    feeId = fee._id.toString();

    const apartment = await Apartment.create({
      name: 'P102',
      area: 80,
      apartmentNumber: '102',
      building: 'B'
    });
    apartmentId = apartment._id.toString();
  });

  describe('POST /api/transactions/calculate', () => {
    it('should calculate fee correctly for Area unit', async () => {
      const res = await request(app)
        .post('/api/transactions/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ apartmentId, feeId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAmount).toBe(5000 * 80); // 400000
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          apartmentId,
          feeId,
          totalAmount: 400000,
          payerName: 'Mr Test'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      const saved = await Transaction.findOne({ apartmentId, feeId });
      expect(saved).toBeTruthy();
    });

    it('should prevent duplicate payment for Service fee', async () => {
      // First payment
      await Transaction.create({
        apartmentId,
        feeId,
        totalAmount: 400000,
        payerName: 'Mr Test',
        createdBy: userId
      });

      // Second payment try
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          apartmentId,
          feeId,
          totalAmount: 400000,
          payerName: 'Mr Test 2'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already paid');
    });
  });
});
