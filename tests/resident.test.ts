import request from 'supertest';
import app from '../src/app';
import User from '../src/models/user.model';
import Resident from '../src/models/resident.model';
import Apartment from '../src/models/apartment.model';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const userData = {
  name: 'Test Admin',
  username: 'testadmin',
  password: 'password123',
  role: 'admin'
};

let token: string;
let userId: string;

beforeEach(async () => {
  // Create a user directly in DB
  const user = await User.create(userData);
  userId = user._id.toString();
  
  // Generate token
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d'
  });
});

describe('Resident API', () => {
  const residentData = {
    fullName: 'Nguyen Van A',
    dob: '1990-01-01',
    gender: 'Nam',
    identityCard: '012345678901',
    hometown: 'Hanoi',
    job: 'Engineer'
  };

  describe('POST /api/residents', () => {
    it('should create a new resident', async () => {
      const res = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${token}`)
        .send(residentData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe(residentData.fullName);
      expect(res.body.data.identityCard).toBe(residentData.identityCard);
    });

    it('should return 400 if identity card already exists', async () => {
      await Resident.create(residentData);

      const res = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${token}`)
        .send(residentData);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /api/residents', () => {
    beforeEach(async () => {
      await Resident.create(residentData);
      await Resident.create({
        ...residentData,
        fullName: 'Tran Van B',
        identityCard: '987654321098'
      });
    });

    it('should get all residents with pagination', async () => {
      const res = await request(app)
        .get('/api/residents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.residents.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    it('should search residents by name', async () => {
      const res = await request(app)
        .get('/api/residents?keyword=Tran')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.residents.length).toBe(1);
      expect(res.body.residents[0].fullName).toBe('Tran Van B');
    });
  });

  describe('PUT /api/residents/:id', () => {
    it('should update a resident', async () => {
      const resident = await Resident.create(residentData);

      const res = await request(app)
        .put(`/api/residents/${resident._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Nguyen Van A Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('Nguyen Van A Updated');
    });
  });

  describe('DELETE /api/residents/:id', () => {
    it('should delete a resident', async () => {
      const resident = await Resident.create(residentData);

      const res = await request(app)
        .delete(`/api/residents/${resident._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      
      const found = await Resident.findById(resident._id);
      expect(found).toBeNull();
    });

    it('should NOT delete if resident is an apartment owner', async () => {
      const resident = await Resident.create(residentData);
      
      // Create apartment with this resident as owner
      await Apartment.create({
        name: 'P101',
        area: 100,
        ownerId: resident._id,
        building: 'A',
        apartmentNumber: '101',
        members: [resident._id]
      });

      const res = await request(app)
        .delete(`/api/residents/${resident._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot delete resident who is an apartment owner');
    });
  });
});
