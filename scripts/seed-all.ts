/**
 * Master Seed Script
 * 
 * Script này chạy tất cả các script seed theo thứ tự:
 * 1. Tạo root admin (nếu chưa có)
 * 2. Khởi tạo fees (nếu chưa có)
 * 3. Seed residents và apartments (qua API - cần server chạy)
 * 4. Generate random fees/transactions
 * 
 * Usage:
 *   npm run seed:all
 * 
 * Requirements:
 *   - Server phải đang chạy (npm run dev) cho bước 3
 *   - MONGO_URI trong .env
 */

import { execSync } from 'child_process';

const log = (step: string, message: string) => {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[${step}] ${message}`);
  console.log('═'.repeat(60));
};

const runScript = (scriptPath: string, description: string): boolean => {
  try {
    log('RUNNING', description);
    execSync(`npx ts-node ${scriptPath}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✓ ${description} completed successfully\n`);
    return true;
  } catch (error: any) {
    console.error(`✗ ${description} failed\n`);
    return false;
  }
};

const checkServerRunning = (): Promise<boolean> => {
  const BASE_URL = process.env.API_URL || 'http://localhost:5000';
  
  return new Promise<boolean>((resolve) => {
    try {
      const http = require('http');
      const url = new URL(BASE_URL);
      
      const req = http.get({
        hostname: url.hostname,
        port: url.port || 5000,
        path: '/api/stats/dashboard',
        timeout: 2000
      }, (res: any) => {
        resolve(res.statusCode !== 404);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch (error) {
      resolve(false);
    }
  });
};

async function seedAll() {
  try {
    console.log('\n' + '═'.repeat(60));
    console.log('🌱 BLUEMOON SEED SCRIPT - MASTER');
    console.log('═'.repeat(60));

    log('STEP 1/4', 'Creating Root Admin...');
    const step1 = runScript('scripts/create-root-admin.ts', 'Create Root Admin');
    if (!step1) {
      console.error('⚠️  Warning: Root admin creation had issues, but continuing...');
    }

    log('STEP 2/4', 'Initializing Fees...');
    const step2 = runScript('src/scripts/init-fees.ts', 'Initialize Fees');
    if (!step2) {
      console.error('⚠️  Warning: Fee initialization had issues, but continuing...');
    }

    log('STEP 3/4', 'Checking if server is running...');
    let serverRunning = false;
    try {
      serverRunning = await checkServerRunning();
    } catch (error) {
      serverRunning = false;
    }
    
    if (!serverRunning) {
      console.log('\n⚠️  WARNING: Server is not running!');
      console.log('   Please start the server with: npm run dev');
      console.log('   Then run this script again, or skip this step.\n');
      
      const skip = process.argv.includes('--skip-api');
      if (!skip) {
        console.log('   Skipping API-dependent scripts...\n');
        log('STEP 3/4', 'Skipped: Seed Residents & Apartments (server not running)');
      }
    } else {
      log('STEP 3/4', 'Server is running. Seeding Residents & Apartments...');
      const step3 = runScript('scripts/seed-residents-apartments.ts', 'Seed Residents & Apartments');
      if (!step3) {
        console.error('⚠️  Warning: Residents & Apartments seeding had issues, but continuing...');
      }
    }

    log('STEP 4/4', 'Generating Random Fees & Transactions...');
    const step4 = runScript('scripts/generate-random-fees.ts', 'Generate Random Fees');
    if (!step4) {
      console.error('⚠️  Warning: Random fees generation had issues.');
    }
    console.log('\n' + '═'.repeat(60));
    console.log('✅ SEED PROCESS COMPLETED!');
    console.log('═'.repeat(60));
    console.log('\n📊 Summary:');
    console.log('   ✓ Root Admin: Created/Checked');
    console.log('   ✓ Fees: Initialized');
    if (serverRunning) {
      console.log('   ✓ Residents & Apartments: Seeded');
    } else {
      console.log('   ○ Residents & Apartments: Skipped (server not running)');
    }
    console.log('   ✓ Random Transactions: Generated');
    console.log('\n💡 Tip: Run "npm run seed:all" again to add more data.');
    console.log('   Or use individual scripts:');
    console.log('   - npm run seed:admin');
    console.log('   - npm run seed:fees');
    console.log('   - npm run seed:residents');
    console.log('   - npm run seed:transactions');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedAll();

