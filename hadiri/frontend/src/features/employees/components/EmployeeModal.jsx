import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { userApi } from '../../../services/api/userApi';
import { departmentApi } from '../../../services/api/departmentApi';
import { positionApi } from '../../../services/api/positionApi';
import { locationApi } from '../../../services/api/locationApi';
import {
  X,
  User,
  Mail,
  Shield,
  Briefcase,
  Clock,
  Network,
  Calendar,
  Image,
  Key,
  MapPin,
  FolderTree,
  AlertTriangle,
  Send,
} from 'lucide-react';

const EMPTY_SHIFTS = [];
const EMPTY_LEADERS = [];

export default function EmployeeModal({
  isOpen,
  onClose,
  employee = null,
  shifts = EMPTY_SHIFTS,
  leaders = EMPTY_LEADERS,
  onSaved,
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const isEditing = Boolean(employee);

  const defaultShiftId = shifts[0]?.id || '';

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [internalLeaders, setInternalLeaders] = useState(leaders || []);

  const availableLeaders = useMemo(() => {
    const list = internalLeaders && internalLeaders.length > 0 ? internalLeaders : leaders;
    return (list || []).filter((u) => u && u.id);
  }, [internalLeaders, leaders]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telegramId: '',
    password: 'password123',
    role: 'employee',
    position: '',
    positionId: '',
    department: 'Operations',
    departmentId: '',
    locationId: '',
    shiftId: defaultShiftId,
    leaderId: '',
    annualLeave: 12,
    sickLeave: 14,
    avatar: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync internal leaders from prop or fetch directory
  useEffect(() => {
    if (leaders && leaders.length > 0) {
      setInternalLeaders(leaders);
    } else if (isOpen) {
      userApi.getDirectory().then((users) => {
        if (Array.isArray(users)) {
          setInternalLeaders(users);
        }
      }).catch(() => {});
    }
  }, [isOpen, leaders]);

  // Sync formData when modal opens or employee changes
  useEffect(() => {
    if (!isOpen) return;

    if (employee) {
      const applyEmployeeData = (emp) => {
        let matchedPosId = emp.positionId || emp.position_id || '';
        let matchedPosTitle = emp.position || '';
        if (!matchedPosId && matchedPosTitle && positions.length > 0) {
          const found = positions.find(
            (p) =>
              p.title?.toLowerCase() === matchedPosTitle.toLowerCase() ||
              p.name?.toLowerCase() === matchedPosTitle.toLowerCase()
          );
          if (found) {
            matchedPosId = found.id;
            matchedPosTitle = found.title || found.name;
          }
        }

        let matchedDeptId = emp.departmentId || emp.department_id || '';
        let matchedDeptName = emp.department || '';
        if (!matchedDeptId && matchedDeptName && departments.length > 0) {
          const found = departments.find(
            (d) =>
              d.name?.toLowerCase() === matchedDeptName.toLowerCase() ||
              d.code?.toLowerCase() === matchedDeptName.toLowerCase()
          );
          if (found) {
            matchedDeptId = found.id;
            matchedDeptName = found.name;
          }
        }

        setFormData((prev) => ({
          name: emp.name || prev.name || '',
          email: emp.email || prev.email || '',
          telegramId: emp.telegramId ?? emp.telegram_id ?? prev.telegramId ?? '',
          password: '',
          role: emp.role || prev.role || 'employee',
          position: matchedPosTitle || prev.position || '',
          positionId: matchedPosId || prev.positionId || '',
          department: matchedDeptName || prev.department || 'Operations',
          departmentId: matchedDeptId || prev.departmentId || '',
          locationId: emp.locationId || emp.location_id || prev.locationId || '',
          shiftId: emp.shiftId || emp.shift_id || prev.shiftId || defaultShiftId,
          leaderId: emp.leaderId || emp.leader_id || prev.leaderId || '',
          annualLeave: emp.leaveBalance?.annual ?? emp.leaveBalance?.annualTotal ?? prev.annualLeave ?? 12,
          sickLeave: emp.leaveBalance?.sick ?? emp.leaveBalance?.sickTotal ?? prev.sickLeave ?? 14,
          avatar: emp.avatar || prev.avatar || '',
        }));
      };

      // Set immediately with current employee data
      applyEmployeeData(employee);

      // Also fetch fresh detail from backend to guarantee complete fields (email, leaderId, etc.)
      if (employee.id) {
        userApi
          .getEmployeeById(employee.id)
          .then((fresh) => {
            if (fresh) {
              applyEmployeeData(fresh);
            }
          })
          .catch(() => {});
      }
    } else {
      setFormData({
        name: '',
        email: '',
        telegramId: '',
        password: 'password123',
        role: 'employee',
        position: '',
        positionId: '',
        department: 'Operations',
        departmentId: '',
        locationId: '',
        shiftId: defaultShiftId,
        leaderId: '',
        annualLeave: 12,
        sickLeave: 14,
        avatar: '',
      });
    }
  }, [isOpen, employee, defaultShiftId, positions, departments]);

  // Fetch Master Data on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    Promise.allSettled([
      departmentApi.getDepartments(),
      positionApi.getPositions(),
      locationApi.getLocations(),
    ]).then(([deptRes, posRes, locRes]) => {
      if (!isMounted) return;
      if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) {
        const deptList = deptRes.value;
        setDepartments(deptList);
        setFormData((prev) => {
          if (prev.department) {
            const found = deptList.find(
              (d) =>
                d.id === prev.departmentId ||
                d.name?.toLowerCase() === prev.department?.toLowerCase() ||
                d.code?.toLowerCase() === prev.department?.toLowerCase()
            );
            if (found) {
              return { ...prev, departmentId: found.id, department: found.name };
            }
          }
          return prev;
        });
      }
      if (posRes.status === 'fulfilled' && Array.isArray(posRes.value)) {
        const posList = posRes.value;
        setPositions(posList);
        setFormData((prev) => {
          if (prev.position) {
            const found = posList.find(
              (p) =>
                p.id === prev.positionId ||
                p.title?.toLowerCase() === prev.position?.toLowerCase() ||
                p.name?.toLowerCase() === prev.position?.toLowerCase()
            );
            if (found) {
              return { ...prev, positionId: found.id, position: found.title || found.name };
            }
          }
          return prev;
        });
      }
      if (locRes.status === 'fulfilled' && Array.isArray(locRes.value)) {
        setLocations(locRes.value);
        if (!employee && locRes.value.length > 0) {
          const hq = locRes.value.find((l) => l.isHeadquarters) || locRes.value[0];
          if (hq) {
            setFormData((prev) => ({
              ...prev,
              locationId: prev.locationId || hq.id,
            }));
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (e) => {
    const val = e.target.value;
    if (val.startsWith('custom:')) {
      const customName = val.replace('custom:', '');
      setFormData((prev) => ({
        ...prev,
        departmentId: '',
        department: customName,
      }));
    } else {
      const found = departments.find((d) => d.id === val);
      setFormData((prev) => ({
        ...prev,
        departmentId: val,
        department: found ? found.name : (val ? prev.department : ''),
      }));
    }
  };

  const handlePositionChange = (e) => {
    const val = e.target.value;
    if (val.startsWith('custom:')) {
      const customTitle = val.replace('custom:', '');
      setFormData((prev) => ({
        ...prev,
        positionId: '',
        position: customTitle,
      }));
    } else {
      const found = positions.find((p) => p.id === val);
      setFormData((prev) => ({
        ...prev,
        positionId: val,
        position: found ? (found.title || found.name) : (val ? prev.position : ''),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isHr = formData.role === 'hr_admin' || formData.role === 'super_admin';
    const assignedShiftId = formData.shiftId || defaultShiftId || null;

    if (!formData.name.trim() || !formData.email.trim() || !formData.position.trim()) {
      toast.warning(t('user_required_fields_msg', 'Mohon lengkapi semua kolom yang wajib diisi.'), t('toast_details_required_title'));
      return;
    }

    if (formData.role !== 'super_admin' && !formData.locationId) {
      toast.warning(t('branch_required', 'Cabang/unit usaha wajib dipilih untuk penempatan karyawan.'), t('toast_details_required_title'));
      return;
    }

    if (!isHr && !assignedShiftId && shifts.length > 0) {
      toast.warning('Pilih shift kerja untuk karyawan.', t('toast_details_required_title'));
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanDeptId = formData.departmentId && !formData.departmentId.startsWith('custom:')
        ? formData.departmentId
        : null;
      const cleanPosId = formData.positionId && !formData.positionId.startsWith('custom:')
        ? formData.positionId
        : null;

      const cleanTelegramId = formData.telegramId?.trim() || null;

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        telegramId: cleanTelegramId,
        telegram_id: cleanTelegramId,
        role: formData.role,
        position: formData.position.trim(),
        department: formData.department.trim(),
        departmentId: cleanDeptId,
        positionId: cleanPosId,
        locationId: formData.locationId || null,
        shiftId: assignedShiftId,
        leaderId: formData.leaderId || null,
        leaveBalance: {
          annual: Number(formData.annualLeave) || 12,
          sick: Number(formData.sickLeave) || 14,
          remainingAnnual: Number(formData.annualLeave) || 12,
        },
        avatar: formData.avatar?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=2563eb&color=fff&bold=true`,
      };

      if (!isEditing) {
        payload.password = formData.password || 'password123';
        const created = await userApi.createEmployee(payload);
        toast.success(
          t('toast_emp_created_desc', 'Karyawan baru berhasil ditambahkan.', { name: payload.name }),
          t('toast_emp_created_title', 'Karyawan Ditambahkan')
        );
        if (onSaved) onSaved(created);
      } else {
        const updated = await userApi.updateEmployee(employee.id, payload);
        toast.success(
          t('toast_emp_updated_desc', 'Data karyawan berhasil diperbarui.', { name: payload.name }),
          t('toast_emp_updated_title', 'Perubahan Disimpan')
        );
        if (onSaved) onSaved(updated);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || t('toast_generic_error', 'Gagal menyimpan data karyawan.'), t('toast_error_title', 'Kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? t('edit_employee_title', 'Perbarui Profil Karyawan') : t('add_employee_title', 'Daftarkan Karyawan Baru')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing ? t('edit_employee_desc', 'Perbarui data jabatan, departemen, dan penempatan shift.') : t('add_employee_desc', 'Tambahkan staf baru ke dalam organisasi tenant.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {locations.length === 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                {t(
                  'branch_first_notice',
                  'Perhatian: Tenant belum memiliki cabang terdaftar. Buat cabang terlebih dahulu di menu Master Data > Cabang & Unit Usaha.'
                )}
              </span>
            </div>
          )}

          {/* Row 1: Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('col_name', 'Nama Lengkap')} *</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="cth: Doni Setiawan, S.T."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('email_label', 'Alamat Email')} *</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="cth: doni@hadirin.id"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 1b: Telegram ID for AI Leave Request Orchestration */}
          <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/70 space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>{t('telegram_id_label', 'ID Telegram (telegram_id)')}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                AI Telegram Bot
              </span>
            </label>
            <input
              type="text"
              name="telegramId"
              value={formData.telegramId}
              onChange={handleChange}
              placeholder={t('telegram_id_placeholder', 'cth: 1234567890 atau @username')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              🤖 {t('telegram_id_hint', 'Digunakan oleh AI Orchestration untuk mengenali pengaju otomatis saat chat pengajuan cuti/izin di grup Telegram.')}
            </p>
          </div>

          {/* Row 2: Role & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('role_label', 'Peran Sistem')}</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="employee">{t('nav_portal_employee', 'Karyawan (ESS)')}</option>
                <option value="leader">{t('nav_portal_leader', 'Team Leader / Supervisor')}</option>
                <option value="hr_admin">{t('nav_portal_admin', 'Administrator & HR')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('department_label', 'Departemen')} *</span>
              </label>
              {departments.length > 0 ? (
                <select
                  name="departmentId"
                  value={
                    formData.departmentId ||
                    (formData.department && !departments.some((d) => d.name?.toLowerCase() === formData.department.toLowerCase())
                      ? `custom:${formData.department}`
                      : '')
                  }
                  onChange={handleDepartmentChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- {t('select_department', 'Pilih Departemen')} --</option>
                  {Boolean(
                    formData.department &&
                    !departments.some((d) => d.id === formData.departmentId || d.name?.toLowerCase() === formData.department.toLowerCase())
                  ) && (
                    <option value={`custom:${formData.department}`}>
                      {formData.department} ({t('saved_data', 'Data Tersimpan')})
                    </option>
                  )}
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="cth: Human Resources, Operasional"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Row 3: Position & Work Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('col_position', 'Jabatan / Posisi')} *</span>
              </label>
              {positions.length > 0 ? (
                <select
                  name="positionId"
                  value={
                    formData.positionId ||
                    (formData.position && !positions.some((p) => (p.title || p.name)?.toLowerCase() === formData.position.toLowerCase())
                      ? `custom:${formData.position}`
                      : '')
                  }
                  onChange={handlePositionChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- {t('select_position', 'Pilih Jabatan')} --</option>
                  {Boolean(
                    formData.position &&
                    !positions.some((p) => p.id === formData.positionId || (p.title || p.name)?.toLowerCase() === formData.position.toLowerCase())
                  ) && (
                    <option value={`custom:${formData.position}`}>
                      {formData.position} ({t('saved_data', 'Data Tersimpan')})
                    </option>
                  )}
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.name} {p.level ? `(${p.level})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="cth: Staf Operasional, HR Officer"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('branch_label', 'Cabang & Unit Usaha (Geofence)')} {formData.role !== 'super_admin' && '*'}</span>
                </span>
                {formData.locationId && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                    ✓ {t('selected', 'Terpilih')}
                  </span>
                )}
              </label>
              <select
                name="locationId"
                required={formData.role !== 'super_admin'}
                value={formData.locationId}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">
                  -- {locations.length > 0 ? t('select_branch', 'Pilih Cabang / Unit Usaha') : t('no_branches_available', 'Belum Ada Cabang')} --
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    [{loc.businessType || 'Kantor'}] {loc.name} {loc.isHeadquarters ? '(HQ)' : ''} - Radius {loc.radiusMeters}m
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Pola Shift Kerja & Atasan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('shift_label', 'Pola Shift Kerja')} {formData.role !== 'hr_admin' && '*'}</span>
              </label>
              <select
                name="shiftId"
                value={formData.shiftId || defaultShiftId}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {shifts.length > 0 ? (
                  shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime} {s.isCrossDay ? '+1' : ''})
                    </option>
                  ))
                ) : (
                  <option value="">-- {t('no_shifts_available', 'Belum ada shift di tenant ini')} --</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('reports_to_leader', 'Atasan Langsung (Leader Approval)')}</span>
              </label>
              <select
                name="leaderId"
                value={formData.leaderId}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- {t('no_leader_assigned', 'Tanpa Atasan / Langsung ke HR')} --</option>
                {Boolean(
                  formData.leaderId &&
                  !availableLeaders.some((l) => l.id === formData.leaderId)
                ) && (
                  <option value={formData.leaderId}>
                    {t('current_saved_leader', 'Atasan Terpilih')} ({formData.leaderId})
                  </option>
                )}
                {availableLeaders
                  .filter((l) => !isEditing || l.id !== employee?.id)
                  .map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name} ({leader.position || leader.role || 'Staf'}){leader.department ? ` - ${leader.department}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 5: Initial Password (create only) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('initial_password_label', 'Kata Sandi Awal')}</span>
              </label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="password123"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          )}

          {/* Row 6: Leave Balances & Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('quota_annual_label', 'Kuota Hak Cuti Tahunan (Hari)')}</span>
              </label>
              <input
                type="number"
                name="annualLeave"
                value={formData.annualLeave}
                onChange={handleChange}
                min="0"
                max="30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('avatar_url_label', 'URL Foto Profil / Avatar (Opsional)')}</span>
              </label>
              <input
                type="url"
                name="avatar"
                value={formData.avatar}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
            💡 {t('employee_modal_tip', 'Karyawan akan otomatis terikat ke perusahaan Anda dengan nomor ID unik. Sistem menerapkan isolasi multi-tenant penuh.')}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('cancel_btn', 'Batal')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t('saving_status', 'Menyimpan...')}</span>
              ) : (
                <span>{isEditing ? t('save_changes_btn', 'Simpan Perubahan') : t('submit_add_employee_btn', 'Tambahkan Karyawan')}</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
