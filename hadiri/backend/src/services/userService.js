import { userRepository } from '../repositories/UserRepository.js';
import { shiftRepository } from '../repositories/ShiftRepository.js';
import { rosterRepository } from '../repositories/RosterRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { locationRepository } from '../repositories/LocationRepository.js';
import { AppError } from '../utils/appError.js';
import { hashPassword, comparePassword } from '../utils/passwordHelper.js';
import { ROLES } from '../config/constants.js';
import { generateUserId } from '../utils/idGenerator.js';
import { getPlanConfig } from '../config/subscriptionPlans.js';
import { auditLogService } from './auditLogService.js';

class UserService {
  sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async getTenantDirectory(tenantId, query = {}) {
    const todayWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const targetDate = query.date || todayWib;

    const users = await userRepository.findByTenant(tenantId, false);
    const shifts = await shiftRepository.findByTenant(tenantId);
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    let rosters = [];
    try {
      rosters = await rosterRepository.findTeamRosters(tenantId, {
        startDate: targetDate,
        endDate: targetDate,
      });
    } catch (err) {
      console.warn('Error fetching rosters for directory:', err.message);
    }
    const userRosterMap = new Map((rosters || []).map((r) => [r.userId, r]));

    return users.map((u) => {
      const sanitized = this.sanitizeUser(u);
      const userRoster = userRosterMap.get(u.id);

      let effectiveShift = null;
      let isOffDay = false;

      if (userRoster) {
        if (userRoster.isOffDay) {
          isOffDay = true;
        } else if (userRoster.shiftId) {
          effectiveShift = shiftMap.get(userRoster.shiftId);
        }
      }

      if (!userRoster || (!isOffDay && !effectiveShift)) {
        effectiveShift = shiftMap.get(u.shiftId);
      }

      const shiftStr = isOffDay
        ? 'Libur (Day Off)'
        : effectiveShift
          ? `${effectiveShift.name ? effectiveShift.name + ' (' : ''}${effectiveShift.startTime} - ${effectiveShift.endTime}${effectiveShift.isCrossDay ? ' +1' : ''}${effectiveShift.name ? ')' : ''}`
          : '08:00 - 17:00';

      return {
        ...sanitized,
        shiftId: effectiveShift?.id || u.shiftId || null,
        shiftName: isOffDay ? 'Libur (Day Off)' : (effectiveShift?.name || 'Standard'),
        shiftCode: effectiveShift?.code || 'REG',
        shiftStartTime: effectiveShift?.startTime || null,
        shiftEndTime: effectiveShift?.endTime || null,
        isCrossDay: effectiveShift?.isCrossDay || false,
        isOffDay,
        shift: shiftStr,
      };
    });
  }

  async getEmployeeById(userId, tenantId) {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    const shift = user.shiftId ? await shiftRepository.findById(user.shiftId) : null;
    const leader = user.leaderId ? await userRepository.findById(user.leaderId) : null;
    const manager = user.managerId ? await userRepository.findById(user.managerId) : null;
    const subordinates = await userRepository.findSubordinates(userId);

    return {
      ...this.sanitizeUser(user),
      shift: shift || null,
      leader: this.sanitizeUser(leader),
      manager: this.sanitizeUser(manager),
      subordinatesCount: subordinates.length,
    };
  }

  async getEmployeeByTelegramId(telegramId, tenantId = null) {
    if (!telegramId || !String(telegramId).trim()) {
      throw new AppError('user.telegram_id_required', 400);
    }

    const user = await userRepository.findByTelegramId(telegramId, tenantId);
    if (!user) {
      throw new AppError('user.telegram_not_found', 404, { telegramId });
    }

    const shift = user.shiftId ? await shiftRepository.findById(user.shiftId) : null;
    const leader = user.leaderId ? await userRepository.findById(user.leaderId) : null;
    const manager = user.managerId ? await userRepository.findById(user.managerId) : null;
    const subordinates = await userRepository.findSubordinates(user.id);

    return {
      ...this.sanitizeUser(user),
      shift: shift || null,
      leader: this.sanitizeUser(leader),
      manager: this.sanitizeUser(manager),
      subordinatesCount: subordinates.length,
    };
  }

  async createEmployee(data, tenantId, actor = null) {
    const {
      name,
      email,
      password,
      role = ROLES.EMPLOYEE,
      position,
      department,
      shiftId,
      leaderId = null,
      managerId = null,
      leaveBalance,
      avatar,
    } = data;
    const rawTelegramId = data.telegramId ?? data.telegram_id ?? null;
    const cleanTelegramId = rawTelegramId && String(rawTelegramId).trim() ? String(rawTelegramId).trim() : null;

    if (!name || !email) {
      throw new AppError('user.required_fields', 400);
    }

    // 0. Check Tenant Subscription & Quota Gatekeeping
    const tenant = await tenantRepository.findById(tenantId);
    if (tenant && tenant.id !== 'TNT-ROOT-000001') {
      const subStatus = (tenant.subscriptionStatus || 'active').toLowerCase();
      if (subStatus === 'suspended' || subStatus === 'expired') {
        throw new AppError('tenant.subscription_suspended', 403);
      }

      const maxEmployees = Number(tenant.maxEmployees || 25);
      const activeUsers = await userRepository.findByTenant(tenantId, false);
      if (activeUsers.length >= maxEmployees) {
        const planConfig = getPlanConfig(tenant.subscriptionPlan);
        throw new AppError('tenant.employee_quota_reached', 403, {
          max: maxEmployees,
          plan: planConfig.nameId,
        });
      }
    }

    const assignedRole = Object.values(ROLES).includes(role) ? role : ROLES.EMPLOYEE;
    const assignedPosition = position?.trim() || (assignedRole === ROLES.HR_ADMIN ? 'HR & People Operations Lead' : 'Staff');
    const assignedDepartment = department?.trim() || (assignedRole === ROLES.HR_ADMIN ? 'Human Resources' : 'General');

    // 1. Check duplicate email in this tenant
    const existing = await userRepository.findByEmailAndTenant(email, tenantId);
    if (existing) {
      throw new AppError('user.email_exists', 400, { email });
    }

    // 1b. Check duplicate telegram_id in this tenant if provided
    if (cleanTelegramId) {
      const existingTelegram = await userRepository.findByTelegramId(cleanTelegramId, tenantId);
      if (existingTelegram) {
        throw new AppError('user.telegram_id_exists', 400, { telegramId: cleanTelegramId });
      }
    }

    // 2. Validate Location / Branch (Mandatory for non-superadmin users)
    let validatedLocationId = data.locationId || null;
    if (assignedRole !== ROLES.SUPER_ADMIN) {
      if (!validatedLocationId && (assignedRole === ROLES.HR_ADMIN || assignedRole === 'hr_admin')) {
        const tenantBranches = await locationRepository.findByTenant(tenantId);
        const hqBranch = tenantBranches.find((b) => b.isHeadquarters) || tenantBranches[0];
        if (hqBranch) {
          validatedLocationId = hqBranch.id;
        }
      }

      if (!validatedLocationId) {
        throw new AppError('user.branch_required', 400);
      }
      const branch = await locationRepository.findById(tenantId, validatedLocationId);
      if (!branch || branch.tenantId !== tenantId) {
        throw new AppError('user.invalid_branch', 400);
      }
    }

    // 3. Validate Shift if given or fallback for employee
    let validatedShiftId = null;
    if (shiftId) {
      const shift = await shiftRepository.findById(shiftId);
      if (!shift || shift.tenantId !== tenantId) {
        throw new AppError('user.invalid_shift', 400);
      }
      validatedShiftId = shiftId;
    } else if (assignedRole === ROLES.EMPLOYEE) {
      const tenantShifts = await shiftRepository.findByTenant(tenantId);
      if (tenantShifts && tenantShifts.length > 0) {
        validatedShiftId = tenantShifts[0].id;
      }
    }

    // 4. Validate Leader if given
    if (leaderId) {
      const leader = await userRepository.findById(leaderId);
      if (!leader || leader.tenantId !== tenantId) {
        throw new AppError('user.invalid_leader', 400);
      }
    }

    // 5. Generate Employee ID
    const tenantCode = tenant?.code || 'STAFF';
    const newId = generateUserId(tenantCode);

    // 5. Hash Password (Default 'password123' if not specified)
    const rawPassword = password && password.trim() ? password.trim() : 'password123';
    const hashedPassword = await hashPassword(rawPassword);

    // 6. Default Avatar if not given
    const userAvatar =
      avatar && avatar.trim()
        ? avatar.trim()
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&bold=true`;

    const userLeaveBalance = leaveBalance || {
      annual: 12,
      sick: 14,
      remainingAnnual: 12,
    };

    const newUser = await userRepository.create({
      id: newId,
      tenantId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      telegramId: cleanTelegramId,
      telegram_id: cleanTelegramId,
      password: hashedPassword,
      role: assignedRole,
      position: assignedPosition,
      department: assignedDepartment,
      departmentId: data.departmentId || null,
      positionId: data.positionId || null,
      locationId: validatedLocationId,
      leaderId: leaderId || null,
      managerId: managerId || leaderId || null,
      shiftId: validatedShiftId,
      leaveBalance: userLeaveBalance,
      avatar: userAvatar,
      isActive: true,
      is_active: true,
    });

    await auditLogService.log({
      tenantId,
      actorId: actor?.id || null,
      actorName: actor?.name || 'System / HR Admin',
      actorRole: actor?.role || 'hr_admin',
      action: 'EMPLOYEE_CREATE',
      category: 'user_management',
      targetType: 'user',
      targetId: newUser.id,
      targetName: newUser.name,
      description: `Menambahkan akun pengguna baru '${newUser.name}' (${newUser.email}) dengan peran ${assignedRole}.`,
    });

    return this.sanitizeUser(newUser);
  }

  async updateEmployee(userId, updates, tenantId) {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    // Check duplicate email if changed
    if (updates.email && updates.email.toLowerCase() !== user.email.toLowerCase()) {
      const duplicate = await userRepository.findByEmailAndTenant(updates.email, tenantId);
      if (duplicate && duplicate.id !== userId) {
        throw new AppError('user.email_exists', 400, { email: updates.email });
      }
    }

    // Check duplicate telegram_id if changed
    if (updates.telegramId !== undefined || updates.telegram_id !== undefined) {
      const rawTg = updates.telegramId ?? updates.telegram_id;
      const cleanTg = rawTg && String(rawTg).trim() ? String(rawTg).trim() : null;
      if (cleanTg && cleanTg.toLowerCase() !== (user.telegramId || '').toLowerCase()) {
        const duplicateTg = await userRepository.findByTelegramId(cleanTg, tenantId);
        if (duplicateTg && duplicateTg.id !== userId) {
          throw new AppError('user.telegram_id_exists', 400, { telegramId: cleanTg });
        }
      }
      updates.telegramId = cleanTg;
      updates.telegram_id = cleanTg;
    }

    // Validate branch / location if changed
    if (updates.locationId !== undefined) {
      if (user.role !== ROLES.SUPER_ADMIN && !updates.locationId) {
        throw new AppError('user.branch_required', 400);
      }
      if (updates.locationId) {
        const branch = await locationRepository.findById(tenantId, updates.locationId);
        if (!branch || branch.tenantId !== tenantId) {
          throw new AppError('user.invalid_branch', 400);
        }
      }
    }

    // Validate shift if changed
    if (updates.shiftId && updates.shiftId !== user.shiftId) {
      const shift = await shiftRepository.findById(updates.shiftId);
      if (!shift || shift.tenantId !== tenantId) {
        throw new AppError('user.invalid_shift', 400);
      }
    }

    // Validate leader if changed
    if (updates.leaderId !== undefined) {
      if (updates.leaderId === userId) {
        throw new AppError('user.circular_leader', 400);
      }
      if (updates.leaderId) {
        const leader = await userRepository.findById(updates.leaderId);
        if (!leader || leader.tenantId !== tenantId) {
          throw new AppError('user.invalid_leader', 400);
        }
      }
    }

    const allowedFields = [
      'name',
      'email',
      'telegramId',
      'telegram_id',
      'role',
      'position',
      'department',
      'departmentId',
      'positionId',
      'locationId',
      'shiftId',
      'leaderId',
      'managerId',
      'leaveBalance',
      'avatar',
      'isActive',
      'is_active',
    ];

    const payload = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        payload[field] = updates[field];
      }
    }

    if (payload.isActive !== undefined) {
      payload.is_active = payload.isActive;
    }

    const updatedUser = await userRepository.update(userId, payload);
    return this.sanitizeUser(updatedUser);
  }

  async deleteEmployee(userId, tenantId, actor = null) {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    // Soft delete: sets deleted_at and is_active: false
    await userRepository.softDelete(userId);

    await auditLogService.log({
      tenantId,
      actorId: actor?.id || null,
      actorName: actor?.name || 'HR Admin',
      actorRole: actor?.role || 'hr_admin',
      action: 'EMPLOYEE_DELETE',
      category: 'user_management',
      targetType: 'user',
      targetId: userId,
      targetName: user.name,
      description: `Menonaktifkan akun karyawan '${user.name}' (${user.email}).`,
    });

    return { id: userId, name: user.name, deleted: true };
  }

  async updateMyProfile(userId, tenantId, { name, avatar, telegramId, telegram_id }) {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    const payload = {};
    if (name && name.trim()) payload.name = name.trim();
    if (avatar && avatar.trim()) payload.avatar = avatar.trim();
    if (telegramId !== undefined || telegram_id !== undefined) {
      const rawTg = telegramId ?? telegram_id;
      const cleanTg = rawTg && String(rawTg).trim() ? String(rawTg).trim() : null;
      if (cleanTg && cleanTg.toLowerCase() !== (user.telegramId || '').toLowerCase()) {
        const duplicateTg = await userRepository.findByTelegramId(cleanTg, tenantId);
        if (duplicateTg && duplicateTg.id !== userId) {
          throw new AppError('user.telegram_id_exists', 400, { telegramId: cleanTg });
        }
      }
      payload.telegramId = cleanTg;
      payload.telegram_id = cleanTg;
    }

    const updated = await userRepository.update(userId, payload);
    return this.sanitizeUser(updated);
  }

  async changeMyPassword(userId, tenantId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw new AppError('user.password_fields_required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('user.password_min_length', 400);
    }

    // Fetch user directly to get password hash
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('user.wrong_current_password', 400);
    }

    const hashed = await hashPassword(newPassword);
    await userRepository.update(userId, { password: hashed });
    return true;
  }

  async resetEmployeePassword(userId, tenantId, newPassword = 'password123') {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    const passToUse = newPassword && newPassword.length >= 6 ? newPassword : 'password123';
    const hashed = await hashPassword(passToUse);
    await userRepository.update(userId, { password: hashed });
    return { id: userId, name: user.name, reset: true };
  }

  async getMyTeam(leaderId, tenantId) {
    const subordinates = await userRepository.findSubordinates(leaderId);
    return subordinates.map(this.sanitizeUser);
  }

  async getUserHierarchy(userId, tenantId) {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    const leader = user.leaderId ? await userRepository.findById(user.leaderId) : null;
    const manager = user.managerId ? await userRepository.findById(user.managerId) : null;
    const subordinates = await userRepository.findSubordinates(userId);

    return {
      user: this.sanitizeUser(user),
      leader: this.sanitizeUser(leader),
      manager: this.sanitizeUser(manager),
      subordinates: subordinates.map(this.sanitizeUser),
    };
  }

  async bulkImportEmployees(employees = [], tenantId) {
    if (!Array.isArray(employees) || employees.length === 0) {
      throw new AppError('user.empty_import_data', 400);
    }

    const tenantBranches = await locationRepository.findByTenant(tenantId);
    const hqBranch = tenantBranches.find((b) => b.isHeadquarters) || tenantBranches[0];
    const tenantShifts = await shiftRepository.findByTenant(tenantId);
    const defaultShift = tenantShifts[0];

    const results = [];
    const errors = [];

    for (let i = 0; i < employees.length; i++) {
      const rowNum = i + 1;
      const row = employees[i];

      try {
        const name = (row.name || row.Nama || row['Nama Lengkap'] || '').trim();
        const email = (row.email || row.Email || '').trim().toLowerCase();

        if (!name || !email) {
          errors.push({ row: rowNum, name, email, message: 'Nama dan email wajib diisi.' });
          continue;
        }

        const existing = await userRepository.findByEmailAndTenant(email, tenantId);
        if (existing) {
          errors.push({ row: rowNum, name, email, message: `Email '${email}' sudah terdaftar.` });
          continue;
        }

        let locationId = row.locationId || null;
        const branchStr = (row.branch || row.Cabang || row['Cabang / Unit'] || '').trim().toLowerCase();
        if (branchStr) {
          const matchedBranch = tenantBranches.find(
            (b) => b.id.toLowerCase() === branchStr || b.name.toLowerCase() === branchStr
          );
          if (matchedBranch) {
            locationId = matchedBranch.id;
          }
        }
        if (!locationId && hqBranch) {
          locationId = hqBranch.id;
        }

        let shiftId = row.shiftId || null;
        const shiftStr = (row.shift || row.Shift || row['Shift Kerja'] || '').trim().toLowerCase();
        if (shiftStr) {
          const matchedShift = tenantShifts.find(
            (s) =>
              s.id.toLowerCase() === shiftStr ||
              s.name.toLowerCase().includes(shiftStr) ||
              s.code?.toLowerCase() === shiftStr
          );
          if (matchedShift) {
            shiftId = matchedShift.id;
          }
        }
        if (!shiftId && defaultShift) {
          shiftId = defaultShift.id;
        }

        const roleStr = (row.role || row.Peran || 'employee').trim().toLowerCase();
        const role =
          roleStr === 'hr_admin' || roleStr === 'admin'
            ? ROLES.HR_ADMIN
            : roleStr === 'leader'
            ? ROLES.LEADER
            : ROLES.EMPLOYEE;
        const position = (row.position || row.Jabatan || 'Staff').trim();
        const department = (row.department || row.Departemen || 'Operasional').trim();
        const phone = (row.phone || row.telepon || row['Nomor HP'] || '').trim();
        const telegramId = (
          row.telegramId ||
          row.telegram_id ||
          row['Telegram ID'] ||
          row['ID Telegram'] ||
          ''
        ).toString().trim();

        const newUser = await this.createEmployee(
          {
            name,
            email,
            telegramId: telegramId || null,
            telegram_id: telegramId || null,
            password: 'password123',
            role,
            position,
            department,
            locationId,
            shiftId,
            phone,
          },
          tenantId
        );

        results.push(newUser);
      } catch (err) {
        errors.push({
          row: rowNum,
          name: row.name,
          email: row.email,
          message: err.message || 'Gagal memproses baris.',
        });
      }
    }

    return {
      total: employees.length,
      importedCount: results.length,
      failedCount: errors.length,
      errors,
      importedEmployees: results,
    };
  }
}

export const userService = new UserService();
