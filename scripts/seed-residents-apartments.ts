/**
 * Seed Script: Residents & Apartments (via API)
 * 
 * This script creates sample residents and apartments through the API,
 * then assigns owners and members to each apartment.
 * 
 * Features:
 *   - Fetches existing residents if they already exist
 *   - Creates only missing apartments
 *   - Assigns owners and members properly
 * 
 * Usage:
 *   npx ts-node scripts/seed-residents-apartments.ts
 * 
 * Requirements:
 *   - Server must be running (yarn dev)
 *   - Root admin account must exist
 */

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  username: 'rootadmin',
  password: 'rootadmin123'
};

// Sample data for residents
const residentsData = [
  // Apartment 1 - Building A, P101
  { fullName: 'Nguyễn Văn An', dob: '1980-05-15', gender: 'Nam', identityCard: '001080123456', hometown: 'Hà Nội', job: 'Kỹ sư' },
  { fullName: 'Trần Thị Bình', dob: '1982-08-20', gender: 'Nữ', identityCard: '001082234567', hometown: 'Hà Nội', job: 'Giáo viên' },
  { fullName: 'Nguyễn An Khang', dob: '2005-03-10', gender: 'Nam', identityCard: '001005345678', hometown: 'Hà Nội', job: 'Sinh viên' },
  
  // Apartment 2 - Building A, P102
  { fullName: 'Lê Hoàng Cường', dob: '1975-12-01', gender: 'Nam', identityCard: '001075456789', hometown: 'Hải Phòng', job: 'Giám đốc' },
  { fullName: 'Phạm Thị Dung', dob: '1978-07-25', gender: 'Nữ', identityCard: '001078567890', hometown: 'Hải Phòng', job: 'Kế toán' },
  
  // Apartment 3 - Building B, P201
  { fullName: 'Hoàng Văn Em', dob: '1990-02-28', gender: 'Nam', identityCard: '001090678901', hometown: 'Đà Nẵng', job: 'Lập trình viên' },
  { fullName: 'Vũ Thị Phương', dob: '1992-11-05', gender: 'Nữ', identityCard: '001092789012', hometown: 'Đà Nẵng', job: 'Nhân viên văn phòng' },
  { fullName: 'Hoàng Minh Quân', dob: '2018-06-15', gender: 'Nam', identityCard: '001018890123', hometown: 'Đà Nẵng', job: 'Học sinh' },
  { fullName: 'Hoàng Thị Mai', dob: '2020-09-20', gender: 'Nữ', identityCard: '001020901234', hometown: 'Đà Nẵng', job: 'Học sinh' },
  
  // Apartment 4 - Building B, P202 (single person)
  { fullName: 'Đỗ Thanh Giang', dob: '1988-04-12', gender: 'Nam', identityCard: '001088012345', hometown: 'TP.HCM', job: 'Bác sĩ' },
  
  // Apartment 5 - Building C, P301
  { fullName: 'Bùi Văn Hải', dob: '1970-01-30', gender: 'Nam', identityCard: '001070123450', hometown: 'Cần Thơ', job: 'Hưu trí' },
  { fullName: 'Ngô Thị Hương', dob: '1972-10-18', gender: 'Nữ', identityCard: '001072234561', hometown: 'Cần Thơ', job: 'Hưu trí' },
];

// Apartment configuration
const apartmentsConfig = [
  { name: 'P101', area: 75.5, apartmentNumber: '101', building: 'A', ownerIndex: 0, memberIndices: [1, 2] },
  { name: 'P102', area: 80.0, apartmentNumber: '102', building: 'A', ownerIndex: 3, memberIndices: [4] },
  { name: 'P201', area: 95.0, apartmentNumber: '201', building: 'B', ownerIndex: 5, memberIndices: [6, 7, 8] },
  { name: 'P202', area: 60.0, apartmentNumber: '202', building: 'B', ownerIndex: 9, memberIndices: [] },
  { name: 'P301', area: 85.5, apartmentNumber: '301', building: 'C', ownerIndex: 10, memberIndices: [11] },
];

// Logger
const log = (step: string, message: string) => {
  console.log(`[${step}] ${message}`);
};

// API Client Class
class ApiClient {
  private token: string = '';

  async login(): Promise<boolean> {
    log('AUTH', 'Logging in as admin...');
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ADMIN_CREDENTIALS),
      });

      if (!res.ok) {
        const err = await res.text();
        log('AUTH', `Login failed: ${err}`);
        return false;
      }

      const data = await res.json() as { token: string };
      this.token = data.token;
      log('AUTH', '✓ Login successful');
      return true;
    } catch (error) {
      log('AUTH', `Login error: ${error}`);
      return false;
    }
  }

  async request<T>(method: string, endpoint: string, body?: any): Promise<T | null> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        return null;
      }

      return data as T;
    } catch (error) {
      log('ERROR', `${method} ${endpoint} failed: ${error}`);
      return null;
    }
  }
}

interface Resident {
  _id: string;
  fullName: string;
  identityCard: string;
  apartmentId?: string;
  roleInApartment?: string;
}

interface Apartment {
  _id: string;
  name: string;
  ownerId?: any;
  members?: any[];
}

interface ResidentsResponse {
  residents: Resident[];
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function seed() {
  const api = new ApiClient();

  // 1. Login
  const loginSuccess = await api.login();
  if (!loginSuccess) {
    log('ERROR', 'Cannot login. Make sure the server is running and root admin exists.');
    log('HINT', 'Run: npx ts-node scripts/create-root-admin.ts');
    process.exit(1);
  }

  // 2. Fetch existing residents
  log('RESIDENTS', 'Fetching existing residents...');
  const existingRes = await api.request<ResidentsResponse>('GET', '/api/residents?limit=100');
  const existingResidents = existingRes?.residents || [];
  log('RESIDENTS', `Found ${existingResidents.length} existing residents`);

  // Create a map by identityCard for quick lookup
  const residentMap = new Map<string, Resident>();
  for (const r of existingResidents) {
    residentMap.set(r.identityCard, r);
  }

  // 3. Create missing residents or use existing ones
  log('RESIDENTS', `Processing ${residentsData.length} residents...`);
  const orderedResidents: Resident[] = [];

  for (const data of residentsData) {
    const existing = residentMap.get(data.identityCard);
    if (existing) {
      orderedResidents.push(existing);
      log('RESIDENTS', `  ○ Exists: ${existing.fullName}`);
    } else {
      const res = await api.request<ApiResponse<Resident>>('POST', '/api/residents', data);
      if (res?.success && res.data) {
        orderedResidents.push(res.data);
        log('RESIDENTS', `  ✓ Created: ${res.data.fullName}`);
      } else {
        log('RESIDENTS', `  ✗ Failed: ${data.fullName}`);
        // Push a placeholder to maintain indices
        orderedResidents.push({ _id: '', fullName: data.fullName, identityCard: data.identityCard });
      }
    }
  }

  // 4. Process apartments
  log('APARTMENTS', `\nProcessing ${apartmentsConfig.length} apartments...`);

  for (const config of apartmentsConfig) {
    const owner = orderedResidents[config.ownerIndex];
    
    if (!owner || !owner._id) {
      log('APARTMENTS', `  ✗ Skipping ${config.name} - owner not available`);
      continue;
    }

    // Check if owner already has an apartment
    if (owner.apartmentId && owner.roleInApartment === 'Chủ hộ') {
      log('APARTMENTS', `  ○ ${config.name}: Owner ${owner.fullName} already assigned to apartment`);
      continue;
    }

    // Try to create apartment
    const aptRes = await api.request<ApiResponse<Apartment>>('POST', '/api/apartments', {
      name: config.name,
      area: config.area,
      apartmentNumber: config.apartmentNumber,
      building: config.building,
    });

    let apartment: Apartment | null = null;

    if (aptRes?.success && aptRes.data) {
      apartment = aptRes.data;
      log('APARTMENTS', `  ✓ Created: ${apartment.name} (Building ${config.building})`);
    } else {
      // Apartment might already exist - try to get it by fetching apartment details
      // For now, skip if creation failed
      log('APARTMENTS', `  ○ ${config.name} already exists or failed to create`);
      continue;
    }

    // Add owner
    const ownerRes = await api.request<ApiResponse<any>>('POST', `/api/apartments/${apartment._id}/members`, {
      residentId: owner._id,
      role: 'Chủ hộ'
    });

    if (ownerRes?.success) {
      log('APARTMENTS', `    👤 Owner: ${owner.fullName}`);
    } else {
      log('APARTMENTS', `    ✗ Failed to assign owner: ${owner.fullName}`);
    }

    // Add members
    for (const memberIndex of config.memberIndices) {
      if (memberIndex >= orderedResidents.length) continue;
      
      const member = orderedResidents[memberIndex];
      if (!member || !member._id) continue;

      // Skip if member already belongs to an apartment
      if (member.apartmentId) {
        log('APARTMENTS', `    ○ ${member.fullName} already in an apartment`);
        continue;
      }

      const memberRes = await api.request<ApiResponse<any>>('POST', `/api/apartments/${apartment._id}/members`, {
        residentId: member._id,
        role: 'Thành viên'
      });

      if (memberRes?.success) {
        log('APARTMENTS', `    👥 Member: ${member.fullName}`);
      } else {
        log('APARTMENTS', `    ✗ Failed to add member: ${member.fullName}`);
      }
    }
  }

  // 5. Summary
  console.log('\n' + '═'.repeat(50));
  log('DONE', 'Seed process completed!');
  console.log('═'.repeat(50));

  // 6. Fetch final stats
  log('STATS', '\nFetching dashboard stats...');
  const stats = await api.request<any>('GET', '/api/stats/dashboard');
  if (stats?.success) {
    console.log('\n📊 DASHBOARD SUMMARY:');
    console.log(`   👥 Total Residents: ${stats.data.totalResidents}`);
    console.log(`   🏠 Total Apartments: ${stats.data.totalApartments}`);
    console.log(`   💰 Total Revenue: ${stats.data.totalRevenue?.toLocaleString('vi-VN')} VND`);
    
    if (stats.data.apartmentStats?.byBuilding) {
      console.log('\n   🏢 By Building:');
      for (const b of stats.data.apartmentStats.byBuilding) {
        console.log(`      Building ${b.building || 'N/A'}: ${b.count} apartments`);
      }
    }
  }
}

// Run
seed().catch(console.error);
