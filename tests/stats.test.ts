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

beforeEach(async () => {
  const user = await User.create(adminUser);
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '30d'
  });
});

describe('Stats API', () => {
  describe('GET /api/stats/dashboard', () => {
    it('should return dashboard statistics', async () => {
      // Create some data
      const fee = await Fee.create({
        title: 'Service Fee',
        type: FeeType.Service,
        amount: 100,
        unit: FeeUnit.Apartment
      });

      const apt = await Apartment.create({ name: 'A1', area: 50 });
      
      await Transaction.create({
        apartmentId: apt._id,
        feeId: fee._id,
        totalAmount: 1000,
        payerName: 'Payer',
        createdBy: (await User.findOne())!._id,
        date: new Date()
      });

      const res = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalApartments).toBe(1);
      expect(res.body.data.totalRevenue).toBe(1000);
      expect(res.body.data.apartmentStats.total).toBe(1);
      expect(res.body.data.apartmentStats.status).toHaveLength(1); // Only vacant as ownerId is null
      expect(res.body.data.apartmentStats.status[0].status).toBe('Vacant');
    });
  });
});
