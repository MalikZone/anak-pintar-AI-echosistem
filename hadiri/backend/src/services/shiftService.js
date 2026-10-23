import { shiftRepository } from '../repositories/ShiftRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { AppError } from '../utils/appError.js';
import { generateShiftId } from '../utils/idGenerator.js';

function timeToMinutes(tStr) {
  if (!tStr || !tStr.includes(':')) return 0;
  const [h, m] = tStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const normalized = (mins % (24 * 60) + (24 * 60)) % (24 * 60);
  const h = String(Math.floor(normalized / 60)).padStart(2, '0');
  const m = String(normalized % 60).padStart(2, '0');
  return `${h}:${m}`;
}

class ShiftService {
  async getTenantShifts(tenantId) {
    return shiftRepository.findByTenant(tenantId);
  }

  async getShiftById(shiftId, tenantId) {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift || shift.tenantId !== tenantId) {
      throw new AppError('shift.not_found', 404);
    }
    return shift;
  }

  async createShift(data, tenantId) {
    const {
      name,
      code,
      startTime,
      endTime,
      isCrossDay,
      gracePeriodMinutes = 15,
      checkInWindow,
      checkOutWindow,
    } = data;

    if (!name || !code || !startTime || !endTime) {
      throw new AppError('shift.required_fields', 400);
    }

    const cleanCode = String(code).toUpperCase().trim().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!cleanCode) {
      throw new AppError('shift.invalid_code', 400);
    }

    // Check duplicate code in this tenant
    const existing = await shiftRepository.findByCode(tenantId, cleanCode);
    if (existing) {
      throw new AppError('shift.code_exists', 400, { code: cleanCode });
    }

    // Auto-detect cross-midnight if end time is before start time
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const autoCrossDay = typeof isCrossDay === 'boolean' ? isCrossDay : (endMins < startMins);

    // Compute windows if not supplied
    const finalCheckIn = {
      start: checkInWindow?.start || minutesToTime(startMins - 60),
      end: checkInWindow?.end || minutesToTime(startMins + 90),
    };

    const finalCheckOut = {
      start: checkOutWindow?.start || endTime,
      end: checkOutWindow?.end || minutesToTime(endMins + 120),
    };

    const tenant = await tenantRepository.findById(tenantId);
    const tenantCode = tenant?.code || 'SHF';
    const shiftId = generateShiftId(tenantCode, cleanCode);

    const newShift = await shiftRepository.create({
      id: shiftId,
      tenantId,
      code: cleanCode,
      name: name.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      isCrossDay: autoCrossDay,
      gracePeriodMinutes: Number(gracePeriodMinutes) || 15,
      checkInWindow: finalCheckIn,
      checkOutWindow: finalCheckOut,
    });

    return newShift;
  }

  async updateShift(shiftId, data, tenantId) {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift || shift.tenantId !== tenantId) {
      throw new AppError('shift.not_found', 404);
    }

    const updates = {};
    if (data.name) updates.name = data.name.trim();

    if (data.code) {
      const cleanCode = String(data.code).toUpperCase().trim().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (cleanCode !== shift.code) {
        const existing = await shiftRepository.findByCode(tenantId, cleanCode);
        if (existing && existing.id !== shiftId) {
          throw new AppError('shift.code_exists', 400, { code: cleanCode });
        }
        updates.code = cleanCode;
      }
    }

    const effectiveStart = data.startTime ? data.startTime.trim() : shift.startTime;
    const effectiveEnd = data.endTime ? data.endTime.trim() : shift.endTime;

    if (data.startTime) updates.startTime = effectiveStart;
    if (data.endTime) updates.endTime = effectiveEnd;

    // Detect or update cross-midnight
    if (data.startTime || data.endTime || typeof data.isCrossDay === 'boolean') {
      const startMins = timeToMinutes(effectiveStart);
      const endMins = timeToMinutes(effectiveEnd);
      updates.isCrossDay = typeof data.isCrossDay === 'boolean' ? data.isCrossDay : (endMins < startMins);
    }

    if (data.gracePeriodMinutes !== undefined) {
      updates.gracePeriodMinutes = Number(data.gracePeriodMinutes) || 15;
    }

    if (data.checkInWindow) {
      updates.checkInWindow = {
        start: data.checkInWindow.start || shift.checkInWindow.start,
        end: data.checkInWindow.end || shift.checkInWindow.end,
      };
    }

    if (data.checkOutWindow) {
      updates.checkOutWindow = {
        start: data.checkOutWindow.start || shift.checkOutWindow.start,
        end: data.checkOutWindow.end || shift.checkOutWindow.end,
      };
    }

    return shiftRepository.update(shiftId, updates);
  }

  async deleteShift(shiftId, tenantId) {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift || shift.tenantId !== tenantId) {
      throw new AppError('shift.not_found', 404);
    }

    // Check if any active employee is assigned to this shift
    const users = await userRepository.findByTenant(tenantId, false);
    const assignedUsers = users.filter((u) => u.shiftId === shiftId);

    if (assignedUsers.length > 0) {
      throw new AppError('shift.has_assigned_users', 400, {
        count: assignedUsers.length,
        names: assignedUsers.slice(0, 3).map((u) => u.name).join(', '),
      });
    }

    await shiftRepository.softDelete(shiftId);
    return true;
  }
}

export const shiftService = new ShiftService();
