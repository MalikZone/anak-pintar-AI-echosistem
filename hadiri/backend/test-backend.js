import http from 'http';
import { Socket } from 'net';
import app from './src/app.js';
import { runSeed } from './src/database/seeds/seedData.js';
import { runSeedMysql } from './src/database/seeds/seedMysql.js';
import { ENV } from './src/config/env.js';
import { shiftRepository } from './src/repositories/ShiftRepository.js';

async function makeRequest(path, options = {}) {
  return new Promise((resolve) => {
    const socket = new Socket();
    const req = new http.IncomingMessage(socket);
    const res = new http.ServerResponse(req);

    const bodyStr = options.body || '';

    req.method = options.method || 'GET';
    req.url = `/api/v1${path}`;
    req.headers = {
      host: 'localhost',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(bodyStr).toString(),
      ...Object.fromEntries(
        Object.entries(options.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
      ),
    };

    let responseData = '';
    res.end = function (chunk) {
      if (chunk) {
        responseData += Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
      }
      let parsed = responseData;
      try {
        parsed = JSON.parse(responseData);
      } catch (_) {}
      resolve({ status: res.statusCode, data: parsed });
    };

    res.write = function (chunk) {
      if (chunk) {
        responseData += Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
      }
      return true;
    };

    app(req, res);

    if (bodyStr) {
      req.push(bodyStr);
    }
    req.push(null);
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('🧪 Starting Hadirin Backend Integration Tests...\n');

  // Re-seed clean data (both in-memory JSON and MySQL)
  await runSeed();
  if (ENV.DB_CONNECTION === 'mysql') {
    await runSeedMysql(true);
  }

  try {
    // 1. Health Check (Bilingual Verification)
    console.log('Test 1: Health Check (Bilingual ID vs EN)');
    const healthId = await makeRequest('/health', { headers: { 'Accept-Language': 'id' } });
    assert(healthId.status === 200, 'Health check returns 200 OK');
    assert(healthId.data.success === true, 'Success is true');
    assert(healthId.data.message === 'Hadirin Backend API beroperasi normal dan sehat 🚀', 'Health check message localized in Indonesian');

    const healthEn = await makeRequest('/health', { headers: { 'Accept-Language': 'en' } });
    assert(healthEn.status === 200, 'Health check EN returns 200 OK');
    assert(healthEn.data.message === 'Hadirin Backend API is operational & healthy 🚀', 'Health check message localized in English');

    const healthQueryEn = await makeRequest('/health?lang=en');
    assert(healthQueryEn.data.message === 'Hadirin Backend API is operational & healthy 🚀', 'Query parameter ?lang=en correctly overrides language');

    // 1b. Error Message Bilingual Verification (Invalid Login & 404)
    console.log('\nTest 1b: Error Message Bilingual Verification');
    const invalidId = await makeRequest('/auth/login', {
      method: 'POST',
      headers: { 'Accept-Language': 'id' },
      body: JSON.stringify({ email: 'unknown@user.com', password: 'wrong' }),
    });
    assert(invalidId.status === 401, 'Invalid login rejected with 401');
    assert(invalidId.data.message === 'Email atau kata sandi yang Anda masukkan salah.', 'Error message in Indonesian');

    const invalidEn = await makeRequest('/auth/login', {
      method: 'POST',
      headers: { 'Accept-Language': 'en' },
      body: JSON.stringify({ email: 'unknown@user.com', password: 'wrong' }),
    });
    assert(invalidEn.status === 401, 'Invalid login EN rejected with 401');
    assert(invalidEn.data.message === 'The email or password you entered is incorrect.', 'Error message in English');

    const notFoundEn = await makeRequest('/non-existent-route', {
      headers: { 'Accept-Language': 'en' },
    });
    assert(notFoundEn.status === 404, '404 route returns 404');
    assert(notFoundEn.data.message.includes('was not found on this server'), '404 message in English');

    // 2. Authentication: Login Tenant 1 (Logistik) HR Admin
    console.log('\nTest 2: Login Tenant 1 HR Admin (Bilingual Success Message)');
    const loginHr1 = await makeRequest('/auth/login', {
      method: 'POST',
      headers: { 'Accept-Language': 'id' },
      body: JSON.stringify({ email: 'hr.logistik@hadirin.id', password: 'password123' }),
    });
    assert(loginHr1.status === 200, 'HR Admin Tenant 1 login succeeds');
    assert(loginHr1.data.message === 'Login berhasil. Selamat datang kembali!', 'Login success message in Indonesian');
    assert(loginHr1.data.data.user.role === 'hr_admin', 'Role is hr_admin');
    assert(loginHr1.data.data.tenant.id === 'TENANT-LOGISTIK', 'Tenant is TENANT-LOGISTIK');
    const hr1Token = loginHr1.data.data.token;

    const loginHr1En = await makeRequest('/auth/login', {
      method: 'POST',
      headers: { 'Accept-Language': 'en' },
      body: JSON.stringify({ email: 'hr.logistik@hadirin.id', password: 'password123' }),
    });
    assert(loginHr1En.status === 200, 'HR Admin login EN succeeds');
    assert(loginHr1En.data.message === 'Login successful. Welcome back!', 'Login success message in English');

    // 3. Authentication: Login Tenant 1 Staff Doni (Shift Malam)
    console.log('\nTest 3: Login Tenant 1 Staff Doni (Hierarchy: reports to Bambang)');
    const loginStaff1 = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'staff1.logistik@hadirin.id', password: 'password123' }),
    });
    assert(loginStaff1.status === 200, 'Staff Doni login succeeds');
    assert(loginStaff1.data.data.user.leader.name === 'Bambang Sugiharto', 'Leader is Bambang Sugiharto');
    const doniToken = loginStaff1.data.data.token;

    // 4. Authentication: Login Leader Bambang
    console.log('\nTest 4: Login Tenant 1 Leader Bambang');
    const loginLeader1 = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'leader1.logistik@hadirin.id', password: 'password123' }),
    });
    assert(loginLeader1.status === 200, 'Leader Bambang login succeeds');
    assert(loginLeader1.data.data.user.role === 'leader', 'Role is leader');
    const bambangToken = loginLeader1.data.data.token;

    // 5. Authentication: Login Tenant 2 (Konsultan)
    console.log('\nTest 5: Login Tenant 2 Staff Cahyo');
    const loginStaff2 = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'eng1.tech@hadirin.id', password: 'password123' }),
    });
    assert(loginStaff2.status === 200, 'Staff Cahyo login succeeds');
    assert(loginStaff2.data.data.tenant.id === 'TENANT-KONSULTAN', 'Tenant is TENANT-KONSULTAN');
    assert(loginStaff2.data.data.user.leader.name === 'Aris Wibowo', 'Leader is Aris Wibowo');
    const cahyoToken = loginStaff2.data.data.token;

    // 6. Shift Verification: Cross-Midnight Shift on Tenant 1 vs Non-Shift on Tenant 2
    console.log('\nTest 6: Shift Verification (Cross-Midnight vs Non-Shift)');
    const shifts1 = await makeRequest('/shifts', {
      headers: { Authorization: `Bearer ${doniToken}` },
    });
    assert(shifts1.status === 200, 'Tenant 1 shifts retrieved');
    const nightShift = shifts1.data.data.find((s) => s.isCrossDay === true);
    assert(nightShift !== undefined, 'Tenant 1 has cross-midnight shift (Shift 3)');
    assert(nightShift.endTime === '07:00', 'Shift 3 finishes next day at 07:00');

    const shifts2 = await makeRequest('/shifts', {
      headers: { Authorization: `Bearer ${cahyoToken}` },
    });
    assert(shifts2.status === 200, 'Tenant 2 shifts retrieved');
    assert(shifts2.data.data.every((s) => !s.isCrossDay), 'Tenant 2 has NO cross-midnight shifts (Regular only)');

    // 7. Multi-Tenant Isolation
    console.log('\nTest 7: Multi-Tenant Isolation Enforcement');
    const crossTenantAttack = await makeRequest('/users/directory?tenantId=TENANT-KONSULTAN', {
      headers: { Authorization: `Bearer ${doniToken}` },
    });
    assert(crossTenantAttack.status === 403, 'Cross-tenant data access attempt blocked with 403 Forbidden');

    // 8. Attendance: Cross-Midnight Shift Clock-In & Clock-Out
    console.log('\nTest 8: Cross-Midnight Clock-In & Clock-Out');
    const clockInRes = await makeRequest('/attendances/clock-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doniToken}` },
      body: JSON.stringify({
        shiftId: 'SHIFT-LOG-S3',
        notes: 'Clock in shift malam logistik',
      }),
    });
    assert(clockInRes.status === 201, 'Clock-In succeeded');
    assert(clockInRes.data.data.isCrossDay === true, 'Attendance session flagged as isCrossDay: true');

    const clockOutRes = await makeRequest('/attendances/clock-out', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doniToken}` },
      body: JSON.stringify({ notes: 'Selesai shift malam' }),
    });
    assert(clockOutRes.status === 200, 'Clock-Out succeeded');
    assert(clockOutRes.data.data.status === 'clocked_out', 'Status is clocked_out');

    // 9. Multi-Tier Leave Approval Flow (Employee -> Leader -> HR)
    console.log('\nTest 9: Multi-Tier Leave Approval Cycle (2-Stage Approval)');
    
    // 9a. Doni submits leave
    const leaveSubmit = await makeRequest('/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doniToken}` },
      body: JSON.stringify({
        type: 'annual',
        startDate: '2026-10-05',
        endDate: '2026-10-06',
        totalDays: 2,
        reason: 'Keperluan keluarga penting',
      }),
    });
    assert(leaveSubmit.status === 201, 'Leave submitted by employee');
    assert(leaveSubmit.data.data.status === 'pending_leader', "Initial status is 'pending_leader'");
    const leaveId = leaveSubmit.data.data.id;

    // 9b. HR attempts to approve BEFORE Leader approves -> MUST FAIL!
    console.log('Testing illegal premature HR approval before leader review...');
    const prematureHrApproval = await makeRequest(`/leaves/${leaveId}/hr-action`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({ action: 'approve' }),
    });
    assert(prematureHrApproval.status === 400, 'HR approval rejected: Leader must approve first!');

    // 9c. Leader Bambang approves Doni's leave
    console.log('Leader Bambang reviews & approves Doni leave...');
    const leaderApproval = await makeRequest(`/leaves/${leaveId}/leader-action`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${bambangToken}` },
      body: JSON.stringify({ action: 'approve', notes: 'Disetujui oleh Supervisor Hub A' }),
    });
    assert(leaderApproval.status === 200, 'Leader approval succeeds');
    assert(leaderApproval.data.data.status === 'pending_hr', "Status escalated to 'pending_hr'");
    assert(leaderApproval.data.data.approvedByLeader.leaderName === 'Bambang Sugiharto', 'Recorded leader approval');

    // 9d. HR Admin Siti Rahma now reviews & grants final approval
    console.log('HR Admin Siti Rahma grants final approval...');
    const hrApproval = await makeRequest(`/leaves/${leaveId}/hr-action`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({ action: 'approve' }),
    });
    assert(hrApproval.status === 200, 'HR approval succeeds');
    assert(hrApproval.data.data.status === 'approved', "Status officially finalized to 'approved'");
    assert(hrApproval.data.data.approvedByHr.hrName.includes('Siti Rahma'), 'Recorded HR approval');

    // 9e. Verify Doni's quota has been deducted
    console.log("Verifying employee's leave balance deduction...");
    const doniProfile = await makeRequest('/auth/me', {
      headers: { Authorization: `Bearer ${doniToken}` },
    });
    // Initial remaining was 8 days, after 2 days approved, it should be 6!
    assert(doniProfile.data.data.user.leaveBalance.remainingAnnual === 6, 'Remaining annual leave deducted from 8 to 6 days');

    // 10. Phase 1: Employee Management CRUD, Profile, Password & Soft-Delete
    console.log('\nTest 10: Phase 1 Employee Management CRUD & Profile Settings');

    // 10a. HR Admin creates a new employee
    console.log('10a. HR Admin creates new employee Budi...');
    const createEmpRes = await makeRequest('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Budi Santoso',
        email: 'budi.santoso@hadirin.id',
        role: 'employee',
        position: 'Kurir Ekspedisi',
        department: 'Logistics Operations',
        shiftId: 'SHIFT-LOG-S1',
        leaderId: 'USR-LOG-003', // Reports to Bambang
      }),
    });
    assert(createEmpRes.status === 201, 'HR Admin successfully created new employee Budi (201 Created)');
    assert(createEmpRes.data.data.name === 'Budi Santoso', 'Employee name is Budi Santoso');
    const budiId = createEmpRes.data.data.id;

    // 10b. Duplicate email prevention within tenant
    console.log('10b. Testing duplicate email prevention...');
    const duplicateRes = await makeRequest('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Budi Duplicate',
        email: 'budi.santoso@hadirin.id',
        role: 'employee',
        position: 'Staff',
        department: 'Logistics Operations',
        shiftId: 'SHIFT-LOG-S1',
      }),
    });
    assert(duplicateRes.status === 400, 'Duplicate email rejected with 400 Bad Request');

    // 10c. HR Admin updates Budi's position and shift
    console.log('10c. HR Admin updates employee details...');
    const updateRes = await makeRequest(`/users/${budiId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        position: 'Senior Dispatcher Hub A',
        shiftId: 'SHIFT-LOG-S2',
      }),
    });
    assert(updateRes.status === 200, 'Employee updated successfully');
    assert(updateRes.data.data.position === 'Senior Dispatcher Hub A', 'Position updated to Senior Dispatcher');

    // 10d. Login as new employee Budi with default password
    console.log('10d. Login as new employee Budi...');
    const budiLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'budi.santoso@hadirin.id', password: 'password123' }),
    });
    assert(budiLogin.status === 200, 'Budi logged in successfully with default password');
    const budiToken = budiLogin.data.data.token;

    // 10e. Budi changes password
    console.log('10e. Budi changes password...');
    const wrongPassRes = await makeRequest('/users/me/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${budiToken}` },
      body: JSON.stringify({ currentPassword: 'wrongpassword', newPassword: 'budiNewPassword123' }),
    });
    assert(wrongPassRes.status === 400, 'Wrong current password rejected with 400');

    const changePassRes = await makeRequest('/users/me/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${budiToken}` },
      body: JSON.stringify({ currentPassword: 'password123', newPassword: 'budiNewPassword123' }),
    });
    assert(changePassRes.status === 200, 'Budi successfully changed password');

    // Verify login with new password
    const budiNewLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'budi.santoso@hadirin.id', password: 'budiNewPassword123' }),
    });
    assert(budiNewLogin.status === 200, 'Budi successfully logged in with NEW password');

    // 10f. Budi updates self profile
    console.log('10f. Budi updates personal profile info...');
    const updateProfileRes = await makeRequest('/users/me/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${budiToken}` },
      body: JSON.stringify({ name: 'Budi Santoso, S.Kom' }),
    });
    assert(updateProfileRes.status === 200, 'Budi updated self profile');
    assert(updateProfileRes.data.data.name === 'Budi Santoso, S.Kom', 'Profile name updated to Budi Santoso, S.Kom');

    // 10g. Multi-tenant isolation: HR Admin Tenant 1 cannot access/delete Tenant 2 employee
    console.log('10g. Multi-tenant isolation on employee management...');
    const crossTenantDelete = await makeRequest('/users/USR-TECH-004', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(crossTenantDelete.status === 404, 'Cross-tenant employee modification blocked with 404');

    // 10h. Soft delete employee Budi
    console.log('10h. HR Admin deactivates/soft-deletes employee Budi...');
    const deleteRes = await makeRequest(`/users/${budiId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(deleteRes.status === 200, 'Employee Budi successfully soft-deleted');

    // Verify Budi can no longer login after soft-delete
    const deletedBudiLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'budi.santoso@hadirin.id', password: 'budiNewPassword123' }),
    });
    assert(deletedBudiLogin.status === 401, 'Deactivated/soft-deleted employee login blocked with 401');

    // 11. Super Admin, Tenant Management & Standardized IDs
    console.log('\nTest 11: Super Admin & Standardized IDs & Tenant Management (SaaS)');
    // 11a. Login as Super Admin
    console.log('11a. Super Admin Login...');
    const superAdminLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'superadmin@hadirin.id', password: 'password123' }),
    });
    assert(superAdminLogin.status === 200, 'Super Admin login succeeds');
    assert(superAdminLogin.data.data.user.role === 'super_admin', 'Role is super_admin');
    assert(superAdminLogin.data.data.user.id === 'USR-ROOT-000001', 'User ID is standard root format USR-ROOT-000001');
    const superToken = superAdminLogin.data.data.token;

    // 11b. RBAC: Regular HR Admin cannot access Tenant Management
    console.log('11b. Access control verification on Tenant Management...');
    const forbiddenTenants = await makeRequest('/tenants', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(forbiddenTenants.status === 403, 'HR Admin forbidden from accessing /tenants (403)');

    // 11c. Super Admin lists tenants
    console.log('11c. Super Admin lists all tenants...');
    const tenantsListRes = await makeRequest('/tenants', {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    assert(tenantsListRes.status === 200, 'Super Admin gets all tenants');
    assert(Array.isArray(tenantsListRes.data.data), 'Tenants data is array');
    assert(tenantsListRes.data.data.length >= 3, 'Includes root, logistik, and konsultan tenants');

    // 11d. Super Admin creates a new tenant with Standardized Tenant ID
    console.log('11d. Super Admin creates new tenant (Auto standardized Tenant ID)...');
    const newTenantRes = await makeRequest('/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        name: 'PT Finansial Sejahtera Nusantara',
        code: 'FINANCE',
        tagline: 'Smart Fintech & Banking Solutions',
        industry: 'Banking & Financial Services',
        workModel: 'Hybrid Banking Hours',
        headquarters: {
          name: 'Menara Finansial Sudirman',
          address: 'Jl. Jend. Sudirman Kav. 25, Jakarta Selatan',
          latitude: -6.215,
          longitude: 106.82,
          radiusMeters: 150,
        },
      }),
    });
    assert(newTenantRes.status === 201, 'Tenant created with 201 Created');
    const createdTenant = newTenantRes.data.data;
    assert(
      /^TNT-FINANCE-\d{6}$/.test(createdTenant.id),
      `Tenant ID follows standard format TNT-FINANCE-{6_DIGIT_NUMBER} (Actual: ${createdTenant.id})`
    );
    assert(createdTenant.code === 'FINANCE', 'Tenant code is FINANCE');

    // 11e. Duplicate tenant code rejection
    console.log('11e. Duplicate tenant code rejection...');
    const duplicateTenant = await makeRequest('/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        name: 'PT Finance Duplicate',
        code: 'FINANCE',
      }),
    });
    assert(duplicateTenant.status === 400, 'Duplicate tenant code rejected with 400');

    // 11f. Super Admin creates employee under new tenant with Standardized User ID
    console.log('11f. Create employee with Standardized User ID format USR-{TENANT_CODE}-{6_DIGITS}...');
    // Create a shift in new tenant first
    await shiftRepository.create({
      id: `SHIFT-FIN-S1`,
      tenantId: createdTenant.id,
      code: 'REG',
      name: 'Banking Regular',
      startTime: '08:00',
      endTime: '17:00',
      isCrossDay: false,
    });

    const newEmpRes = await makeRequest('/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superToken}`,
        'x-tenant-id': createdTenant.id,
      },
      body: JSON.stringify({
        name: 'Finance Specialist',
        email: 'finance.lead@hadirin.id',
        role: 'hr_admin',
        position: 'Finance Lead',
        department: 'Finance',
        shiftId: 'SHIFT-FIN-S1',
      }),
    });
    assert(newEmpRes.status === 201, 'Employee created successfully');
    const createdEmp = newEmpRes.data.data;
    assert(
      /^USR-FINANCE-\d{6}$/.test(createdEmp.id),
      `Employee ID follows standard format USR-FINANCE-{6_DIGIT_NUMBER} (Actual: ${createdEmp.id})`
    );

    // 11g. Super Admin updates tenant
    console.log('11g. Super Admin updates tenant...');
    const updateTenantRes = await makeRequest(`/tenants/${createdTenant.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        tagline: 'Leading Digital Banking HR & Payroll',
      }),
    });
    assert(updateTenantRes.status === 200, 'Tenant updated successfully');
    assert(updateTenantRes.data.data.tagline === 'Leading Digital Banking HR & Payroll', 'Tagline updated');

    // 11h. Super Admin soft-deletes tenant
    console.log('11h. Super Admin soft-deletes tenant...');
    const deleteTenantRes = await makeRequest(`/tenants/${createdTenant.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superToken}` },
    });
    assert(deleteTenantRes.status === 200, 'Tenant successfully soft-deleted');

    // 11i. Attempt to delete Root tenant should be prevented
    console.log('11i. Prevent deletion of Root tenant...');
    const deleteRootRes = await makeRequest('/tenants/TNT-ROOT-000001', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superToken}` },
    });
    assert(deleteRootRes.status === 400, 'Deleting TNT-ROOT-000001 prevented with 400 Bad Request');

    // =========================================================================
    // Test 12: Phase 2 Master Shift CRUD & Dynamic Roster Scheduling
    // =========================================================================
    console.log('\nTest 12: Phase 2 Master Shift & Dynamic Roster Scheduling');

    // 12a. HR Admin creates new cross-midnight shift (S4 Standby)
    console.log('12a. HR Admin creates new shift with auto cross-midnight detection...');
    const createShiftRes = await makeRequest('/shifts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        code: 'S4',
        name: 'Shift 4 Siaga Malam Khusus',
        startTime: '22:00',
        endTime: '06:00',
        gracePeriodMinutes: 10,
      }),
    });
    assert(createShiftRes.status === 201, 'Shift created with 201 Created');
    assert(createShiftRes.data.data.code === 'S4', 'Shift code is S4');
    assert(createShiftRes.data.data.isCrossDay === true, 'Cross-midnight automatically detected as true');
    assert(createShiftRes.data.data.id.includes('SHIFT-LOGISTIK-S4'), 'Shift ID follows enterprise format SHIFT-{TENANT}-{CODE}');
    const createdShiftId = createShiftRes.data.data.id;

    // 12b. Duplicate shift code prevention
    console.log('12b. Testing duplicate shift code prevention...');
    const duplicateShiftRes = await makeRequest('/shifts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        code: 'S4',
        name: 'Shift 4 Duplikat',
        startTime: '08:00',
        endTime: '16:00',
      }),
    });
    assert(duplicateShiftRes.status === 400, 'Duplicate shift code rejected with 400 Bad Request');

    // 12c. HR Admin updates shift
    console.log('12c. HR Admin updates shift details...');
    const updateShiftRes = await makeRequest(`/shifts/${createdShiftId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Shift 4 Siaga Malam Operasional Updated',
        gracePeriodMinutes: 20,
      }),
    });
    assert(updateShiftRes.status === 200, 'Shift updated successfully');
    assert(updateShiftRes.data.data.gracePeriodMinutes === 20, 'Grace period updated to 20 minutes');

    // 12d. Employee fetches personal dynamic roster
    console.log('12d. Employee Doni fetches personal dynamic roster...');
    const myRosterRes = await makeRequest('/rosters/my-roster', {
      headers: { Authorization: `Bearer ${doniToken}` },
    });
    assert(myRosterRes.status === 200, 'My roster loaded successfully');
    assert(Array.isArray(myRosterRes.data.data), 'Roster is array of daily entries');
    assert(myRosterRes.data.data.length >= 7, 'Contains at least 7 days of schedule');

    // 12e. Leader Bambang views Team Roster Matrix
    console.log('12e. Leader Bambang views Team Roster Matrix...');
    const teamMatrixRes = await makeRequest('/rosters/team?department=Logistics Operations', {
      headers: { Authorization: `Bearer ${bambangToken}` },
    });
    assert(teamMatrixRes.status === 200, 'Team roster matrix loaded successfully');
    assert(teamMatrixRes.data.data.matrix.length > 0, 'Contains team members');
    assert(Array.isArray(teamMatrixRes.data.data.availableShifts), 'Includes available tenant shifts');

    // 12f. HR Admin assigns specific roster to employee
    console.log('12f. HR Admin assigns roster entry to employee...');
    const targetDate = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
    const assignRosterRes = await makeRequest('/rosters/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        userId: 'USR-LOG-005',
        date: targetDate,
        shiftId: createdShiftId,
        isOffDay: false,
        notes: 'Penugasan khusus shift siaga',
      }),
    });
    assert(assignRosterRes.status === 201, 'Roster assigned successfully');
    assert(assignRosterRes.data.data.shiftId === createdShiftId, 'Assigned shift matches S4');

    // 12g. HR Admin runs bulk generate roster with 5-2 pattern
    console.log('12g. HR Admin runs bulk generate roster...');
    const startDateRange = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    const endDateRange = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
    const bulkRosterRes = await makeRequest('/rosters/bulk-generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        department: 'Logistics Operations',
        startDate: startDateRange,
        endDate: endDateRange,
        pattern: '5-2',
      }),
    });
    assert(bulkRosterRes.status === 201, 'Bulk roster generated successfully');
    assert(bulkRosterRes.data.data.totalAssigned > 0, 'Generated assignments count > 0');

    // 12h. Employee Doni submits shift switch request
    console.log('12h. Employee Doni submits shift switch request...');
    const switchReqRes = await makeRequest('/rosters/switch-request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doniToken}` },
      body: JSON.stringify({
        targetDate,
        requestedShiftId: 'SHIFT-LOG-S1',
        reason: 'Ada keperluan keluarga mendesak di malam hari',
      }),
    });
    assert(switchReqRes.status === 201, 'Shift switch request submitted with 201');
    assert(switchReqRes.data.data.status === 'pending_leader', 'Status is pending_leader');
    const switchRequestId = switchReqRes.data.data.id;

    // 12i. Leader reviews and approves shift switch request
    console.log('12i. Leader Bambang reviews and approves shift switch...');
    const reviewSwitchRes = await makeRequest(`/rosters/switch-requests/${switchRequestId}/review`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${bambangToken}` },
      body: JSON.stringify({
        action: 'approved',
      }),
    });
    assert(reviewSwitchRes.status === 200, 'Shift switch reviewed and approved');
    assert(reviewSwitchRes.data.data.status === 'approved', 'Status is approved');

    // 12j. Verify shift deletion protection when employees are assigned
    console.log('12j. Testing shift deletion protection...');
    const deleteUsedShiftRes = await makeRequest('/shifts/SHIFT-LOG-S1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(deleteUsedShiftRes.status === 400, 'Deleting actively assigned shift prevented with 400');

    // 12k. HR Admin deletes unused shift S4
    console.log('12k. HR Admin soft-deletes unassigned shift...');
    const deleteShiftRes = await makeRequest(`/shifts/${createdShiftId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(deleteShiftRes.status === 200, 'Unassigned shift successfully soft-deleted');

    // ==========================================
    // 13. Dynamic Role & Permission Matrix (RBAC)
    // ==========================================
    console.log('\nTest 13: Dynamic Role & Permission Matrix (RBAC)');

    // 13a. HR Admin fetches permissions registry
    console.log('13a. HR Admin fetches permissions registry...');
    const registryRes = await makeRequest('/roles/permissions/registry', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(registryRes.status === 200, 'Permissions registry loaded with 200');
    assert(Array.isArray(registryRes.data.data.flat), 'Registry flat array present');
    assert(registryRes.data.data.flat.length >= 30, `Registry contains ${registryRes.data.data.flat.length} permissions`);
    assert(typeof registryRes.data.data.grouped === 'object', 'Registry grouped by module present');
    assert('attendance' in registryRes.data.data.grouped, 'Attendance module in registry');
    assert('shifts' in registryRes.data.data.grouped, 'Shifts module in registry');
    assert('roles' in registryRes.data.data.grouped, 'Roles module in registry');

    // 13b. HR Admin lists company roles
    console.log('13b. HR Admin lists company roles...');
    const listRolesRes = await makeRequest('/roles', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(listRolesRes.status === 200, 'Roles list loaded with 200');
    assert(Array.isArray(listRolesRes.data.data), 'Roles is an array');
    const roleCodes = listRolesRes.data.data.map(r => r.code);
    assert(roleCodes.includes('HR_ADMIN'), 'System role HR_ADMIN is in list');
    assert(roleCodes.includes('EMPLOYEE'), 'System role EMPLOYEE is in list');

    // 13c. HR Admin creates a custom role with specific granular permissions
    console.log('13c. HR Admin creates custom role...');
    const createRoleRes = await makeRequest('/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Shift Coordinator',
        code: 'SHIFT_COORD',
        description: 'Koordinator shift lapangan',
        permissions: ['shifts.view', 'roster.view_team', 'roster.assign'],
      }),
    });
    assert(createRoleRes.status === 201, 'Custom role created with 201');
    assert(createRoleRes.data.data.code === 'SHIFT_COORD', 'Role code matches SHIFT_COORD');
    assert(createRoleRes.data.data.isSystem === false, 'Role isSystem is false');
    assert(Array.isArray(createRoleRes.data.data.permissions), 'Permissions array present');
    assert(createRoleRes.data.data.permissions.includes('shifts.view'), 'Permissions include shifts.view');
    assert(createRoleRes.data.data.permissions.includes('roster.assign'), 'Permissions include roster.assign');
    const customRoleId = createRoleRes.data.data.id;

    // 13d. Verify duplicate role code rejection
    console.log('13d. Testing duplicate role code rejection...');
    const duplicateRoleRes = await makeRequest('/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Another Coordinator',
        code: 'SHIFT_COORD',
      }),
    });
    assert(duplicateRoleRes.status === 400, 'Duplicate role code rejected with 400');

    // 13e. HR Admin updates role permissions
    console.log('13e. HR Admin updates custom role permissions...');
    const updatePermsRes = await makeRequest(`/roles/${customRoleId}/permissions`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        permissions: ['shifts.view', 'shifts.create', 'roster.view_team', 'roster.assign'],
      }),
    });
    assert(updatePermsRes.status === 200, 'Role permissions updated with 200');
    assert(updatePermsRes.data.data.permissions.length === 4, 'Updated permissions count is 4');
    assert(updatePermsRes.data.data.permissions.includes('shifts.create'), 'Permissions include newly added shifts.create');

    // 13f. Protection: verify system role cannot be deleted
    console.log('13f. Testing system role deletion protection...');
    const deleteSystemRoleRes = await makeRequest('/roles/ROL-SYS-HRADMIN', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(deleteSystemRoleRes.status === 400, 'Deleting system role rejected with 400');

    // 13g. Permission enforcement: employee cannot access role management
    console.log('13g. Testing permission enforcement on employee...');
    const employeeForbiddenRes = await makeRequest('/roles', {
      headers: { Authorization: `Bearer ${doniToken}` },
    });
    assert(employeeForbiddenRes.status === 403, 'Employee without roles.view rejected with 403');

    // 13h. HR Admin soft-deletes unassigned custom role
    console.log('13h. HR Admin deletes custom role...');
    const deleteCustomRoleRes = await makeRequest(`/roles/${customRoleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(deleteCustomRoleRes.status === 200, 'Custom role successfully deleted');

    const verifyDeletedRoleRes = await makeRequest(`/roles/${customRoleId}`, {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(verifyDeletedRoleRes.status === 404, 'Deleted custom role no longer accessible (404)');

    // =========================================================================
    // Test 14: Master Departemen & Master Jabatan (Tenant Isolated)
    // =========================================================================
    console.log('\nTest 14: Master Departemen & Master Jabatan (Tenant Isolated)');

    // Log in Tenant 2 HR Admin
    const loginHr2 = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'hr.tech@hadirin.id', password: 'password123' }),
    });
    const hr2Token = loginHr2.data.data.token;

    // 14a. HR Admin Logistik lists departments
    console.log('14a. HR Admin Logistik lists departments...');
    const listDeptsRes = await makeRequest('/departments', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(listDeptsRes.status === 200, 'Departments list loaded with 200');
    assert(Array.isArray(listDeptsRes.data.data), 'Departments data is an array');
    assert(listDeptsRes.data.data.some((d) => d.code === 'OPS'), 'Includes seeded OPS department');

    // 14b. HR Admin Logistik creates new department
    console.log('14b. HR Admin Logistik creates new department...');
    const createDeptRes = await makeRequest('/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Divisi Teknologi & Otomasi',
        code: 'TECH_AUTO',
        description: 'Pengembangan sistem IoT armada dan otomatisasi sortir',
      }),
    });
    assert(createDeptRes.status === 201, 'Department created with 201 Created');
    const createdDept = createDeptRes.data.data;
    assert(createdDept.code === 'TECH_AUTO', 'Department code matches TECH_AUTO');
    assert(
      /^DPT-LOGISTIK-TECH_AUTO$/.test(createdDept.id),
      `Department ID follows standard format (Actual: ${createdDept.id})`
    );

    // 14c. Duplicate department code rejected
    console.log('14c. Testing duplicate department code prevention...');
    const dupDeptRes = await makeRequest('/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Divisi Teknologi Lain',
        code: 'TECH_AUTO',
      }),
    });
    assert(dupDeptRes.status === 400, 'Duplicate department code rejected with 400');

    // 14d. Multi-tenant isolation: Tenant 2 cannot access Tenant 1's department
    console.log('14d. Testing multi-tenant isolation on departments...');
    const crossDeptRes = await makeRequest(`/departments/${createdDept.id}`, {
      headers: { Authorization: `Bearer ${hr2Token}` },
    });
    assert(crossDeptRes.status === 404, 'Cross-tenant department access blocked with 404');

    // 14e. HR Admin Logistik lists positions
    console.log('14e. HR Admin Logistik lists positions...');
    const listPosRes = await makeRequest('/positions', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(listPosRes.status === 200, 'Positions list loaded with 200');
    assert(listPosRes.data.data.some((p) => p.code === 'OPS_MGR'), 'Includes seeded Operations Manager');

    // 14f. HR Admin Logistik creates new position under the new department
    console.log('14f. HR Admin Logistik creates new position...');
    const createPosRes = await makeRequest('/positions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        departmentId: createdDept.id,
        title: 'IoT Fleet Engineer',
        code: 'IOT_ENG',
        level: 'senior',
        description: 'Perekayasa sensor GPS dan OBD armada truk',
      }),
    });
    assert(createPosRes.status === 201, 'Position created with 201 Created');
    const createdPos = createPosRes.data.data;
    assert(createdPos.level === 'senior', 'Position level matches senior');
    assert(
      /^POS-LOGISTIK-IOT_ENG$/.test(createdPos.id),
      `Position ID follows standard format (Actual: ${createdPos.id})`
    );

    // 14g. Update position details
    console.log('14g. HR Admin Logistik updates position...');
    const updatePosRes = await makeRequest(`/positions/${createdPos.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        title: 'Senior IoT Fleet Engineer',
        level: 'lead',
      }),
    });
    assert(updatePosRes.status === 200, 'Position updated successfully');
    assert(updatePosRes.data.data.title === 'Senior IoT Fleet Engineer', 'Title updated');

    // 14h. Delete position
    console.log('14h. HR Admin Logistik deletes unassigned position...');
    const delPosRes = await makeRequest(`/positions/${createdPos.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(delPosRes.status === 200, 'Position deleted with 200');

    // 14i. Delete department
    console.log('14i. HR Admin Logistik deletes unassigned department...');
    const delDeptRes = await makeRequest(`/departments/${createdDept.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(delDeptRes.status === 200, 'Department deleted with 200');

    // =========================================================================
    // Test 15: Master Lokasi Kerja Multi-Hub & Geofencing
    // =========================================================================
    console.log('\nTest 15: Master Lokasi Kerja Multi-Hub & Geofencing');

    // 15a. HR Admin lists locations
    console.log('15a. HR Admin lists locations...');
    const listLocRes = await makeRequest('/locations', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(listLocRes.status === 200, 'Locations list loaded with 200');
    assert(listLocRes.data.data.some((l) => l.code === 'HQ_PRIOK'), 'Includes headquarters Priok');

    // 15b. HR Admin creates new Hub location
    console.log('15b. HR Admin creates new Hub location with GPS & geofence...');
    const createLocRes = await makeRequest('/locations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Hub Distribusi Marunda Port',
        code: 'HUB_MARUNDA',
        address: 'Kawasan Marunda Center Blok B-9, Bekasi/Jakarta Utara',
        latitude: -6.1023,
        longitude: 106.9612,
        radiusMeters: 150,
        isHeadquarters: false,
      }),
    });
    assert(createLocRes.status === 201, 'Location created with 201 Created');
    const createdLoc = createLocRes.data.data;
    assert(createdLoc.radiusMeters === 150, 'Radius geofencing is 150m');
    assert(
      /^LOC-LOGISTIK-HUB_MARUNDA$/.test(createdLoc.id),
      `Location ID follows standard format (Actual: ${createdLoc.id})`
    );

    // 15c. Geofence radius validation
    console.log('15c. Testing geofence radius boundary validation...');
    const invalidRadiusRes = await makeRequest('/locations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Invalid Radius Hub',
        code: 'INVALID_RAD',
        latitude: -6.1,
        longitude: 106.8,
        radiusMeters: 5, // below min 10
      }),
    });
    assert(invalidRadiusRes.status === 400, 'Radius below 10m rejected with 400');

    // 15d. Multi-tenant isolation on locations
    console.log('15d. Testing multi-tenant isolation on locations...');
    const crossLocRes = await makeRequest(`/locations/${createdLoc.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hr2Token}` },
      body: JSON.stringify({ name: 'Hacked Hub' }),
    });
    assert(crossLocRes.status === 404, 'Cross-tenant location modification blocked with 404');

    // 15e. Delete location
    console.log('15e. HR Admin deletes unused location...');
    const delLocRes = await makeRequest(`/locations/${createdLoc.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(delLocRes.status === 200, 'Location deleted successfully with 200');

    // =========================================================================
    // Test 16: Master Kalender & Hari Libur (Hybrid Global vs Tenant)
    // =========================================================================
    console.log('\nTest 16: Master Kalender & Hari Libur (Hybrid Global vs Tenant)');

    // 16a. HR Admin Logistik lists holidays (gets both Global & Company)
    console.log('16a. HR Admin lists holidays...');
    const listHolidaysRes = await makeRequest('/holidays', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(listHolidaysRes.status === 200, 'Holidays list loaded with 200');
    const holidays = listHolidaysRes.data.data;
    assert(holidays.some((h) => h.isGlobal && h.name.includes('Tahun Baru')), 'Inherits Global New Year holiday');
    assert(holidays.some((h) => !h.isGlobal && h.tenantId === 'TENANT-LOGISTIK'), 'Includes company-specific HUT holiday');

    // 16b. HR Admin attempted modification of Global National Holiday is forbidden
    console.log('16b. Testing protection of Global National Holidays against tenant modification...');
    const updateGlobalRes = await makeRequest('/holidays/HLD-GLOBAL-2026-NEWYEAR', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({ name: 'Hacked Holiday' }),
    });
    assert(updateGlobalRes.status === 403, 'Tenant Admin editing Global Holiday blocked with 403 Forbidden');

    // 16c. Super Admin creates new Global National Holiday
    console.log('16c. Super Admin creates new Global National Holiday...');
    const createGlobalHldRes = await makeRequest('/holidays', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        isGlobal: true,
        name: 'Hari Lahir Pancasila',
        date: '2026-06-01',
        type: 'national',
        description: 'Hari Libur Nasional Kelahiran Pancasila',
      }),
    });
    assert(createGlobalHldRes.status === 201, 'Global holiday created with 201 Created');
    const globalHldId = createGlobalHldRes.data.data.id;

    // 16d. All tenants automatically see the new global holiday
    console.log('16d. Verifying all tenants inherit newly added global holiday...');
    const checkInheritedRes = await makeRequest('/holidays', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(
      checkInheritedRes.data.data.some((h) => h.id === globalHldId),
      'Tenant 1 automatically inherits newly created Global holiday'
    );
    const checkInheritedTenant2 = await makeRequest('/holidays', {
      headers: { Authorization: `Bearer ${hr2Token}` },
    });
    assert(
      checkInheritedTenant2.data.data.some((h) => h.id === globalHldId),
      'Tenant 2 automatically inherits newly created Global holiday'
    );

    // 16e. HR Admin creates company-specific holiday
    console.log('16e. HR Admin creates company-specific holiday...');
    const createCompanyHldRes = await makeRequest('/holidays', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        name: 'Family Gathering Nusantara Logistik',
        date: '2026-11-20',
        type: 'company',
        description: 'Libur operasional untuk kegiatan gathering akbar',
      }),
    });
    assert(createCompanyHldRes.status === 201, 'Company holiday created with 201');
    const companyHld = createCompanyHldRes.data.data;
    assert(companyHld.tenantId === 'TENANT-LOGISTIK', 'Company holiday tagged with tenant ID');
    assert(companyHld.isGlobal === false, 'Company holiday is not global');

    // 16f. Other tenant does not see this company-specific holiday
    console.log('16f. Verifying isolation: other tenants do NOT see company holiday...');
    const verifyIsolationHld = await makeRequest('/holidays', {
      headers: { Authorization: `Bearer ${hr2Token}` },
    });
    assert(
      !verifyIsolationHld.data.data.some((h) => h.id === companyHld.id),
      'Tenant 2 does NOT see Tenant 1 private holiday'
    );

    // 16g. HR Admin deletes own company holiday
    console.log('16g. HR Admin deletes own company holiday...');
    const delCompanyHldRes = await makeRequest(`/holidays/${companyHld.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(delCompanyHldRes.status === 200, 'Company holiday deleted successfully');

    // =========================================================================
    // Test 17: Master Kebijakan Jenis Cuti (Hybrid System & Custom)
    // =========================================================================
    console.log('\nTest 17: Master Kebijakan Jenis Cuti (Hybrid System & Custom)');

    // 17a. HR Admin lists leave types (contains system leaves)
    console.log('17a. HR Admin lists leave types...');
    const listLeaveTypesRes = await makeRequest('/leave-types', {
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(listLeaveTypesRes.status === 200, 'Leave types list loaded with 200');
    const leaveTypes = listLeaveTypesRes.data.data;
    assert(leaveTypes.some((lt) => lt.code === 'ANNUAL' && lt.isSystem), 'Contains system ANNUAL leave type');
    assert(leaveTypes.some((lt) => lt.code === 'SICK' && lt.requiresAttachment), 'Contains system SICK leave with attachment requirement');

    // 17b. Deleting system leave type is prohibited
    console.log('17b. Testing deletion protection on system leave types...');
    const delSystemLeaveRes = await makeRequest('/leave-types/LVT-GLOBAL-ANNUAL', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(delSystemLeaveRes.status === 400 || delSystemLeaveRes.status === 403, 'Deleting system leave type rejected');

    // 17c. HR Admin creates custom leave type for company
    console.log('17c. HR Admin creates custom leave type...');
    const createCustomLeaveRes = await makeRequest('/leave-types', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        code: 'UMROH',
        name: 'Cuti Khusus Ibadah Umroh',
        defaultQuota: 14,
        deductAnnual: false,
        requiresAttachment: true,
        isPaid: true,
        description: 'Cuti ibadah umroh/haji kecil maksimal 14 hari kalender',
      }),
    });
    assert(createCustomLeaveRes.status === 201, 'Custom leave type created with 201 Created');
    const createdLeaveType = createCustomLeaveRes.data.data;
    assert(createdLeaveType.code === 'UMROH', 'Code is UMROH');
    assert(createdLeaveType.defaultQuota === 14, 'Quota is 14 days');
    assert(
      /^LVT-LOGISTIK-UMROH$/.test(createdLeaveType.id),
      `Leave Type ID follows standard format (Actual: ${createdLeaveType.id})`
    );

    // 17d. Tenant isolation: Tenant 2 cannot see Tenant 1's custom leave
    console.log('17d. Verifying leave type multi-tenant isolation...');
    const tenant2LeavesRes = await makeRequest('/leave-types', {
      headers: { Authorization: `Bearer ${hr2Token}` },
    });
    assert(
      !tenant2LeavesRes.data.data.some((lt) => lt.id === createdLeaveType.id),
      'Tenant 2 does NOT see Tenant 1 custom leave type'
    );

    // 17e. HR Admin updates custom leave type
    console.log('17e. HR Admin updates custom leave type quota...');
    const updateLeaveRes = await makeRequest(`/leave-types/${createdLeaveType.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hr1Token}` },
      body: JSON.stringify({
        defaultQuota: 15,
      }),
    });
    assert(updateLeaveRes.status === 200, 'Leave type updated with 200');
    assert(updateLeaveRes.data.data.defaultQuota === 15, 'Default quota updated to 15');

    // 17f. HR Admin deletes custom leave type
    console.log('17f. HR Admin deletes custom leave type...');
    const delLeaveRes = await makeRequest(`/leave-types/${createdLeaveType.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hr1Token}` },
    });
    assert(delLeaveRes.status === 200, 'Custom leave type deleted with 200');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED 100%! Backend is fully operational & rock-solid.');
  } catch (err) {
    throw err;
  }
}

runTests().catch((err) => {
  console.error('\n💥 Test suite failed:', err);
  process.exit(1);
});

