import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model';
import RegistrationCode from '../src/models/registration-code.model';

const createRootAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('MongoDB Connected');

    const username = process.env.ROOT_ADMIN_USERNAME || 'rootadmin';
    const password = process.env.ROOT_ADMIN_PASSWORD || 'rootadmin123';
    
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('Admin already exists. Skipping...');
      process.exit(0);
    }
    
    // Create root admin user
    const rootAdmin = await User.create({
      username,
      password,
      role: 'admin'
    });
    
    console.log(`Root Admin created with username: ${username}`);

    // Create a first registration code for another admin
    const code = 'ADMIN-INIT-2025';
    await RegistrationCode.create({
      code,
      type: 'admin',
      usageLimit: 5,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdBy: rootAdmin._id
    });
    
    console.log(`Initial Admin Registration Code created: ${code}`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating root admin:', error);
    process.exit(1);
  }
};

createRootAdmin();
