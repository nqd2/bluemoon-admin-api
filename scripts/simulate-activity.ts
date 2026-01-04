
// using global fetch

// Actually, since I cannot install new packages easily without user input, and Node 18+ has global fetch, I'll assume global fetch.
// If global fetch isn't available, I'll ask user to install node-fetch or axios.
// Given @types/node is version 25, it's definitely Node 18+.

// Configuration
const BASE_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  username: 'rootadmin',
  password: 'rootadmin123'
};

// Utilities for random data
const randomNames = ['Nguyen Van A', 'Tran Thi B', 'Le Van C', 'Pham Thi D', 'Hoang Van E'];
const randomJobs = ['Engineer', 'Teacher', 'Doctor', 'Driver', 'Student'];
const randomHometowns = ['Hanoi', 'HCMC', 'Danang', 'Haiphong', 'Can Tho'];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

function getRandomIdentityCard(): string {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

// Logger
const log = (step: string, message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [${step}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

// Main Simulation Class
class Simulator {
  private token: string = '';

  async login() {
    log('AUTH', 'Attempting login...');
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN_CREDENTIALS),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Login failed: ${err}`);
    }

    const data = await res.json() as { token: string };
    this.token = data.token;
    log('AUTH', 'Login successful. Token acquired.');
  }

  private async request(method: string, endpoint: string, body?: any) {
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const err = await res.text();
      log('ERROR', `${method} ${endpoint} failed: ${err}`);
      return null;
    }

    // Some endpoints might return empty body on DELETE/Success
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  async run() {
    try {
      // 1. Login
      await this.login();

      // 2. Check Dashboard
      log('STATS', 'Fetching initial dashboard stats...');
      await this.request('GET', '/api/stats/dashboard');

      // 3. Create Residents
      const residents = [];
      log('RESIDENTS', 'Creating 5 random residents...');
      for (let i = 0; i < 5; i++) {
        const residentData = {
          fullName: `${getRandomItem(randomNames)} ${Math.floor(Math.random() * 1000)}`,
          dob: getRandomDate(new Date(1970, 0, 1), new Date(2000, 0, 1)),
          gender: Math.random() > 0.5 ? 'Nam' : 'Nữ',
          identityCard: getRandomIdentityCard(),
          hometown: getRandomItem(randomHometowns),
          job: getRandomItem(randomJobs)
        };
        const res = await this.request('POST', '/api/residents', residentData);
        if (res && res.success && res.data) residents.push(res.data);
      }
      log('RESIDENTS', `${residents.length} residents created.`);

      // 4. Create Apartments
      const apartments = [];
      log('APARTMENTS', 'Creating 2 apartments...');
      for (let i = 1; i <= 2; i++) {
        const randNum = Math.floor(Math.random() * 9000) + 1000;
        const aptData = {
          name: `P${randNum}`,
          area: 80 + Math.random() * 20,
          apartmentNumber: `${randNum}`,
          building: 'A'
        };
        const res = await this.request('POST', '/api/apartments', aptData);
        if (res && res.success && res.data) apartments.push(res.data);
      }
      log('APARTMENTS', `${apartments.length} apartments created.`);

      // 5. Assign Members to Apartments
      if (apartments.length > 0 && residents.length > 0) {
        log('MEMBERS', 'Assigning residents to apartments...');
        // Add first resident as owner to first apartment
        await this.request('POST', `/api/apartments/${apartments[0]._id}/members`, {
          residentId: residents[0]._id,
          role: 'Chủ hộ'
        });
        
        // Add second resident as member to first apartment
        if (residents.length > 1) {
            await this.request('POST', `/api/apartments/${apartments[0]._id}/members`, {
                residentId: residents[1]._id,
                role: 'Thành viên'
            });
        }
      }

      // 6. Create Fee
      log('FEES', 'Creating a service fee...');
      const feeData = {
        title: `Service Fee ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
        description: 'Monthly service fee',
        type: 'Service',
        amount: 5000,
        unit: 'm2'
      };
      const feeRes = await this.request('POST', '/api/fees', feeData);
      const fee = (feeRes && feeRes.success) ? feeRes.data : null;
      
      // 7. Pay Fee (Create Transaction)
      if (fee && apartments.length > 0) {
        log('TRANSACTIONS', 'Simulating fee payment...');
        const apt = apartments[0];
        // Calculate
        const calcRes = await this.request('POST', '/api/transactions/calculate', {
          apartmentId: apt._id,
          feeId: fee._id
        });

        if (calcRes && calcRes.success) {
          const calc = calcRes.data;
          log('TRANSACTIONS', `Fee calculated: ${calc.totalAmount}`);
          // Pay
          await this.request('POST', '/api/transactions', {
            apartmentId: apt._id,
            feeId: fee._id,
            totalAmount: calc.totalAmount,
            payerName: 'Automated Script'
          });
          log('TRANSACTIONS', 'Payment successful.');
        }
      }

      // 8. Final Stats
      log('STATS', 'Fetching final dashboard stats...');
      const finalStats = await this.request('GET', '/api/stats/dashboard');
      log('STATS', 'Simulation complete. Final Stats:', finalStats);

    } catch (error) {
      console.error('Simulation Failed:', error);
    }
  }
}

// Run
const simulator = new Simulator();
simulator.run();
