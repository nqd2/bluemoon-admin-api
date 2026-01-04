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

describe('Fee API', () => {
  const feeData = {
    title: 'Service Fee 2025',
    description: 'Monthly service fee',
    type: FeeType.Service,
    amount: 5000,
    unit: FeeUnit.Area
  };

  describe('POST /api/fees', () => {
    it('should create a new fee', async () => {
      const res = await request(app)
        .post('/api/fees')
        .set('Authorization', `Bearer ${token}`)
        .send(feeData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(feeData.title);
    });

    it('should fail with negative amount', async () => {
      const res = await request(app)
        .post('/api/fees')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...feeData, amount: -100 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/fees', () => {
    beforeEach(async () => {
      await Fee.create(feeData);
      await Fee.create({
        title: 'Charity Fund',
        type: FeeType.Contribution,
        amount: 0,
        unit: FeeUnit.Apartment
      });
    });

    it('should get all fees', async () => {
      const res = await request(app)
        .get('/api/fees')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });

    it('should filter fees by type', async () => {
      const res = await request(app)
        .get('/api/fees?type=Contribution')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Charity Fund');
    });
  });

  describe('GET /api/fees/:id/status', () => {
    it('should return payment status for a fee', async () => {
      // Setup data
      const fee = await Fee.create(feeData);
      const apartment = await Apartment.create({
        name: 'P101',
        area: 100,
        apartmentNumber: '101',
        building: 'A'
      });
      
      // Pay for it
      await Transaction.create({
        apartmentId: apartment._id,
        feeId: fee._id,
        totalAmount: 500000,
        payerName: 'Test Payer',
        createdBy: (await User.findOne())!._id
      });

      const res = await request(app)
        .get(`/api/fees/${fee._id}/status`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.feeInfo.totalCollected).toBe(500000);
      expect(res.body.apartments.length).toBe(1);
      expect(res.body.apartments[0].status).toBe('PAID');
    });
  });
});
