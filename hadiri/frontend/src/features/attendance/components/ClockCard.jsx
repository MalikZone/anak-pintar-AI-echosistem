import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useCurrentTime } from '../../../hooks/useCurrentTime';
import { formatHMS } from '../../../utils/formatters';
import { calculateHaversineDistance, formatDistance } from '../../../utils/geo';
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  RotateCcw,
  Moon,
  Sparkles,
  PlusCircle,
  Repeat,
  X,
  Check,
  ScanFace,
  RefreshCw,
  Compass,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import OvertimeModal from '../../overtime/components/OvertimeModal';

export default function ClockCard() {
  const { todayAttendance, clockIn, clockOut, currentUser, activeShift, companyProfile } = useAttendance();
  const { t } = useLanguage();
  const { formattedTime, formattedDate } = useCurrentTime();

  // Modals
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);

  // Notes
  const [notes, setNotes] = useState('');

  // Target Branch Coordinates & Radius
  const targetLat =
    currentUser?.branch?.latitude != null
      ? Number(currentUser.branch.latitude)
      : companyProfile?.headquarters?.latitude != null
      ? Number(companyProfile.headquarters.latitude)
      : -6.2088;
  const targetLon =
    currentUser?.branch?.longitude != null
      ? Number(currentUser.branch.longitude)
      : companyProfile?.headquarters?.longitude != null
      ? Number(companyProfile.headquarters.longitude)
      : 106.8456;
  const targetRadius = Number(
    currentUser?.branch?.radiusMeters || companyProfile?.headquarters?.radiusMeters || 100
  );
  const branchName =
    currentUser?.branch?.name || companyProfile?.headquarters?.name || 'Kantor Pusat';

  // -------------------------------------------------------------
  // Real GPS & Geolocation State
  // -------------------------------------------------------------
  const [gpsMode, setGpsMode] = useState('real'); // 'real' | 'simulated'
  const [simulatedInRadius, setSimulatedInRadius] = useState(true);
  const [realCoords, setRealCoords] = useState({ latitude: null, longitude: null, accuracy: null });
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const fetchRealLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError(t('gps_not_supported', 'Browser tidak mendukung fitur GPS.'));
      return;
    }
    setIsGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRealCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsGpsLoading(false);
      },
      (err) => {
        setIsGpsLoading(false);
        setGpsError(err.message || t('gps_permission_denied'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [t]);

  useEffect(() => {
    fetchRealLocation();
  }, [fetchRealLocation]);

  // Haversine Distance Calculation
  const realDistance =
    realCoords.latitude != null && realCoords.longitude != null
      ? calculateHaversineDistance(realCoords.latitude, realCoords.longitude, targetLat, targetLon)
      : null;

  const isRealMode = gpsMode === 'real';
  const activeDistance = isRealMode
    ? realDistance
    : simulatedInRadius
    ? 0
    : targetRadius + 200;

  const inRadius = isRealMode
    ? realDistance !== null && realDistance <= targetRadius
    : simulatedInRadius;

  const activeLat = isRealMode
    ? realCoords.latitude ?? targetLat
    : targetLat;
  const activeLon = isRealMode
    ? realCoords.longitude ?? targetLon
    : targetLon;

  // Attendance Time Window Evaluation
  const timeWindowStatus = useMemo(() => {
    if (!activeShift) {
      return {
        canClockIn: false,
        canClockOut: false,
        inStatus: 'no_shift',
        outStatus: 'no_shift',
        checkInStart: '',
        checkInEnd: '',
        checkOutStart: '',
        checkOutEnd: '',
      };
    }

    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const [curH, curM] = curTime.split(':').map(Number);
    const curTotalMinutes = curH * 60 + curM;

    const checkInStart = activeShift.checkInWindow?.start || activeShift.check_in_window_start || activeShift.startTime || '00:00';
    const checkInEnd = activeShift.checkInWindow?.end || activeShift.check_in_window_end || activeShift.startTime || '23:59';
    const checkOutStart = activeShift.checkOutWindow?.start || activeShift.check_out_window_start || activeShift.endTime || '00:00';
    const checkOutEnd = activeShift.checkOutWindow?.end || activeShift.check_out_window_end || activeShift.endTime || '23:59';

    const checkWindow = (curMinutes, startStr, endStr) => {
      if (!startStr || !endStr) return { inWindow: true, status: 'open' };
      const [sH, sM] = startStr.split(':').map(Number);
      const startMinutes = sH * 60 + sM;
      let [eH, eM] = endStr.split(':').map(Number);
      let endMinutes = eH * 60 + eM;
      if (endStr === '00:00' && startMinutes > 0) endMinutes = 24 * 60;

      if (startMinutes <= endMinutes) {
        if (curMinutes < startMinutes) return { inWindow: false, status: 'early' };
        if (curMinutes > endMinutes) return { inWindow: false, status: 'closed' };
        return { inWindow: true, status: 'open' };
      }
      // Cross-midnight window
      if (curMinutes >= startMinutes || curMinutes <= endMinutes) return { inWindow: true, status: 'open' };
      if (curMinutes < startMinutes) return { inWindow: false, status: 'early' };
      return { inWindow: false, status: 'closed' };
    };

    const inCheck = checkWindow(curTotalMinutes, checkInStart, checkInEnd);
    const outCheck = checkWindow(curTotalMinutes, checkOutStart, checkOutEnd);

    return {
      canClockIn: inCheck.inWindow,
      canClockOut: outCheck.inWindow,
      inStatus: inCheck.status,
      outStatus: outCheck.status,
      checkInStart,
      checkInEnd,
      checkOutStart,
      checkOutEnd,
    };
  }, [activeShift, formattedTime]);

  // -------------------------------------------------------------
  // Real Webcam Streaming & Snapshot State
  // -------------------------------------------------------------
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const defaultSamplePhoto =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600';

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  const startCamera = useCallback(async () => {
    try {
      setIsStartingCamera(true);
      setCameraError(null);

      // Stop any existing tracks
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam stream error:', err);
      setIsCameraActive(false);
      setCameraError(err.message || t('camera_not_found_or_denied'));
    } finally {
      setIsStartingCamera(false);
    }
  }, [cameraStream, t]);

  // Modal open/close webcam lifecycle
  useEffect(() => {
    if (isCapturing && !capturedPhoto) {
      startCamera();
    } else if (!isCapturing) {
      stopCamera();
      setCapturedPhoto(null);
    }
    return () => {
      stopCamera();
    };
  }, [isCapturing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bind video element if stream exists
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    // Scale to max dimension of 640 for crisp yet lightweight payload (~20KB)
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext('2d');
    // Mirror view for natural front-facing selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedPhoto(event.target.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const handleUseSample = () => {
    setCapturedPhoto(defaultSamplePhoto);
    stopCamera();
  };

  const handleExecuteClockIn = () => {
    const photoToSend = capturedPhoto || defaultSamplePhoto;
    clockIn({
      selfieUrl: photoToSend,
      customNotes: notes,
      latitude: activeLat,
      longitude: activeLon,
    });
    stopCamera();
    setCapturedPhoto(null);
    setIsCapturing(false);
  };

  const isNightShift = activeShift?.isCrossDay;
  const hasShift = Boolean(activeShift?.id || currentUser?.shiftId);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden transition-all duration-200">
      
      {/* Hidden canvas for snapshot rasterization */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input for fallback upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Banner: Shift & Location Status */}
      <div
        className={`p-5 text-white transition-colors ${
          isNightShift
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900'
            : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl backdrop-blur-xs ${
                isNightShift ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/10 text-blue-200'
              }`}
            >
              {isNightShift ? (
                <Moon className="w-5 h-5 text-indigo-300" />
              ) : (
                <Briefcase className="w-5 h-5 text-blue-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                  {t('active_shift')}
                </p>
                {isNightShift && (
                  <span className="inline-flex items-center gap-0.5 bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.2 rounded-full shadow-2xs">
                    <Sparkles className="w-2.5 h-2.5" />
                    {t('cross_midnight_badge')}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {activeShift
                  ? `${activeShift.name} (${activeShift.startTime} - ${activeShift.endTime} WIB${
                      isNightShift ? ' H+1' : ''
                    })`
                  : t('no_shift_assigned', 'Belum Ada Shift Ditugaskan')}
              </h3>
              {activeShift && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-blue-200/90 font-mono">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-300" />
                    {t('time_window_in_tag', {
                      start: timeWindowStatus.checkInStart,
                      end: timeWindowStatus.checkInEnd,
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    {t('time_window_out_tag', {
                      start: timeWindowStatus.checkOutStart,
                      end: timeWindowStatus.checkOutEnd,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Controls: Request Shift Switch & GPS */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/employee/requests"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md transition-all shadow-2xs"
              title={t('request_shift_switch', 'Ajukan Tukar Shift')}
            >
              <Repeat className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('request_shift_switch', 'Ajukan Tukar Shift')}</span>
            </Link>

            {/* GPS Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setGpsMode(isRealMode ? 'simulated' : 'real')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all ${
                isRealMode
                  ? 'bg-blue-500/20 text-blue-100 border-blue-400/40 hover:bg-blue-500/30'
                  : 'bg-purple-500/20 text-purple-100 border-purple-400/40 hover:bg-purple-500/30'
              }`}
              title={t('gps_mode_tooltip', 'Ganti Mode GPS (Perangkat Riil / Simulasi Dev)')}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isRealMode ? t('gps_mode_real') : t('gps_mode_sim')}</span>
            </button>

            {/* Simulated In/Out Toggle OR Refresh Button */}
            {isRealMode ? (
              <button
                type="button"
                onClick={fetchRealLocation}
                disabled={isGpsLoading}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md transition-all"
                title={t('gps_refresh')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSimulatedInRadius(!simulatedInRadius)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all ${
                  simulatedInRadius
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                    : 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                }`}
                title={t('gps_simulate_tooltip', 'Klik untuk mensimulasikan posisi di dalam/luar radius cabang')}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{simulatedInRadius ? t('gps_office') : t('gps_outside')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-info: Branch details & Live GPS distance */}
        <div className="mt-3 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-100/90">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-300" />
            <span className="truncate font-semibold">{branchName}</span>
            {currentUser?.branch?.businessType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium border border-white/30 backdrop-blur-xs">
                {currentUser.branch.businessType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {/* Live Distance Indicator Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-md font-semibold border ${
                inRadius
                  ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40'
                  : 'bg-rose-500/20 text-rose-100 border-rose-400/40'
              }`}
            >
              {isRealMode
                ? isGpsLoading
                  ? t('gps_fetching')
                  : `${t('gps_distance_label')}: ${formatDistance(realDistance)} (${t('max_distance_label', { radius: targetRadius })})`
                : `${t('gps_distance_label')}: ${simulatedInRadius ? t('gps_simulated_tag') : `+${targetRadius + 200} m`}`}
            </span>

            <span className="bg-white/10 px-2 py-0.5 rounded-md">
              {t('tolerance_minutes')}: {activeShift?.gracePeriodMinutes || 15} {t('minutes')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Clock Area */}
      <div className="p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
            {formattedDate}
          </p>

          {/* Big Live Digital Clock */}
          <div className="font-mono text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white my-2">
            {formattedTime}
            <span className="text-lg sm:text-xl text-slate-400 font-sans ml-2 font-semibold">
              {t('clock_wib')}
            </span>
          </div>

          {/* Status Badge */}
          <div className="my-3">
            {todayAttendance.status === 'present' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('status_present')} ({activeShift?.name}) • {t('clock_in_prefix')} {todayAttendance.clockInTime} WIB
              </span>
            )}
            {todayAttendance.status === 'late' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {t('status_late')} ({activeShift?.code}) • {t('clock_in_prefix')} {todayAttendance.clockInTime} WIB
              </span>
            )}
            {todayAttendance.status === 'clocked_out' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                {t('status_clocked_out')} • {t('clock_out_prefix')} {todayAttendance.clockOutTime} WIB
              </span>
            )}
            {todayAttendance.status === 'not_yet' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs sm:text-sm font-semibold">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {t('status_not_yet')}
              </span>
            )}
          </div>

          {/* Cross-Midnight Explanatory Callout */}
          {isNightShift && todayAttendance.isClockedIn && !todayAttendance.clockOutTime && (
            <div className="w-full max-w-md my-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 text-left text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{t('night_shift_callout_title')}</span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-tight">
                  {t('night_shift_callout_desc', { time: activeShift?.endTime || '07:00' })}
                </span>
              </div>
            </div>
          )}

          {/* Geolocation Diagnostic Pill */}
          {!todayAttendance.isClockedIn && (
            <div className="w-full max-w-md my-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-left text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {isRealMode ? t('gps_mode_real') : t('gps_mode_sim')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {isRealMode
                      ? realCoords.latitude
                        ? `${realCoords.latitude.toFixed(5)}, ${realCoords.longitude.toFixed(5)} (${t('gps_accuracy_label')}: ±${realCoords.accuracy}m)`
                        : isGpsLoading
                        ? t('gps_fetching')
                        : gpsError || '-'
                      : `${t('branch_short_label', 'Cabang')}: ${branchName} (${targetLat.toFixed(4)}, ${targetLon.toFixed(4)})`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    inRadius
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {formatDistance(activeDistance)}
                </span>
              </div>
            </div>
          )}

          {/* Duration Counter Card */}
          {todayAttendance.isClockedIn && (
            <div className="w-full max-w-md my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 gap-4">
              <div className="text-left border-r border-slate-200 dark:border-slate-700 pr-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  {t('clock_in_time_label')}
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">
                  {todayAttendance.clockInTime || '--:--'} WIB
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {t('clock_in_verified')}
                </p>
              </div>

              <div className="text-left pl-2">
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  {t('working_duration')}
                </p>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                  {formatHMS(todayAttendance.workDurationSeconds)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('live_tracker')}</p>
              </div>
            </div>
          )}

          {/* Action Buttons: Clock In & Clock Out */}
          <div className="w-full max-w-md mt-4 space-y-3">
            {todayAttendance.clockOutTime || todayAttendance.status === 'clocked_out' ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  {t('clock_completed_title')}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {t('clock_in_time_label')}: {todayAttendance.clockInTime} WIB •{' '}
                  {t('clock_out_time_label')}: {todayAttendance.clockOutTime} WIB
                </p>
              </div>
            ) : todayAttendance.isClockedIn ? (
              <div className="space-y-2">
                {/* Time Window Notice for Clock-Out */}
                {!timeWindowStatus.canClockOut && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {timeWindowStatus.outStatus === 'early'
                          ? t('window_clock_out_not_open_title', 'Belum Waktunya Clock-Out')
                          : t('window_clock_out_closed_title', 'Jendela Clock-Out Telah Berakhir')}
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
                        {timeWindowStatus.outStatus === 'early'
                          ? t('window_clock_out_not_open_desc', {
                              shift: activeShift?.name || 'Shift',
                              start: timeWindowStatus.checkOutStart,
                              end: timeWindowStatus.checkOutEnd,
                            })
                          : t('window_clock_out_closed_desc', {
                              shift: activeShift?.name || 'Shift',
                              start: timeWindowStatus.checkOutStart,
                              end: timeWindowStatus.checkOutEnd,
                            })}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => clockOut()}
                  disabled={!timeWindowStatus.canClockOut}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                    timeWindowStatus.canClockOut
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-md shadow-rose-500/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>
                    {!timeWindowStatus.canClockOut && timeWindowStatus.outStatus === 'early'
                      ? t('btn_clock_out_opens_at', { time: timeWindowStatus.checkOutStart })
                      : (isNightShift ? t('clock_out_night') : t('clock_out_now'))}
                  </span>
                </button>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isNightShift
                    ? t('clock_out_prompt_night')
                    : t('clock_out_prompt_regular')}
                </p>
              </div>
            ) : (
              <>
                {!hasShift && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {t('no_shift_assigned_title', 'Belum Ada Jadwal Shift')}
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
                        {t(
                          'no_shift_assigned_desc',
                          'Akun Anda belum memiliki shift kerja yang aktif. Silakan hubungi HR atau ajukan tukar shift.'
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {!inRadius && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-left text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {t('outside_radius_title', 'Di Luar Jangkauan Cabang')}
                      </span>
                      <span className="text-[11px] text-rose-700 dark:text-rose-300 leading-tight">
                        {t(
                          'outside_radius_desc',
                          'Anda berada di luar radius geofencing cabang {branch} (Jarak saat ini: {dist}, Maksimal: {radius}m). Gunakan Mode Simulasi di atas untuk pengujian lokal.',
                          {
                            branch: branchName,
                            dist: formatDistance(activeDistance),
                            radius: targetRadius,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {/* Time Window Notice for Clock-In */}
                {hasShift && !timeWindowStatus.canClockIn && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {timeWindowStatus.inStatus === 'early'
                          ? t('window_clock_in_not_open_title', 'Jendela Clock-In Belum Dibuka')
                          : t('window_clock_in_closed_title', 'Jendela Clock-In Telah Ditutup')}
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
                        {timeWindowStatus.inStatus === 'early'
                          ? t('window_clock_in_not_open_desc', {
                              shift: activeShift?.name || 'Shift',
                              start: timeWindowStatus.checkInStart,
                              end: timeWindowStatus.checkInEnd,
                            })
                          : t('window_clock_in_closed_desc', {
                              shift: activeShift?.name || 'Shift',
                              start: timeWindowStatus.checkInStart,
                              end: timeWindowStatus.checkInEnd,
                            })}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsCapturing(true)}
                  disabled={!inRadius || !hasShift || !timeWindowStatus.canClockIn}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] ${
                    inRadius && hasShift && timeWindowStatus.canClockIn
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  <span>
                    {!inRadius
                      ? t('outside_radius_btn_disabled')
                      : !timeWindowStatus.canClockIn
                      ? (timeWindowStatus.inStatus === 'early'
                          ? t('btn_clock_in_opens_at', { time: timeWindowStatus.checkInStart })
                          : t('btn_clock_in_closed', 'Jendela Presensi Ditutup'))
                      : t('clock_in_now')}
                  </span>
                </button>
              </>
            )}

            {/* Quick Overtime Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsOvertimeModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>{t('quick_overtime_btn')}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Clock In Modal with Real Webcam Stream & Snapshot */}
      {isCapturing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg lg:max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col my-auto transition-all overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                    {t('modal_clock_in_title')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('modal_clock_in_subtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsCapturing(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t('modal_cancel')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                
                {/* Left Column: Live Webcam Viewfinder or Captured Preview */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 sm:aspect-16/10 flex items-center justify-center border-2 border-dashed border-blue-400/50 shadow-inner">
                    
                    {capturedPhoto ? (
                      /* Display Captured Image */
                      <img
                        src={capturedPhoto}
                        alt="Captured Selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : cameraError ? (
                      /* Camera Error Fallback View */
                      <div className="p-6 text-center text-white space-y-3">
                        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                        <div>
                          <p className="text-sm font-bold text-amber-200">{t('camera_not_found_or_denied')}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {cameraError}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{t('upload_photo_btn')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleUseSample}
                            className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{t('use_sample_photo')}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Live Webcam Streaming Video */
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover -scale-x-100"
                        />
                        {isStartingCamera && (
                          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-white text-xs gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                            <span>{t('camera_starting')}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
                    
                    {/* Top Overlay Badge */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-xs pointer-events-none">
                      <span className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono border border-white/20 flex items-center gap-1.5">
                        <ScanFace className="w-3.5 h-3.5 text-blue-400" />
                        <span>AI Biometric Face Match</span>
                      </span>
                      <span className="bg-emerald-500/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs">
                        99.4% Valid
                      </span>
                    </div>

                    {/* Face Guide Box */}
                    <div className="absolute inset-x-12 inset-y-8 sm:inset-x-16 sm:inset-y-10 border-2 border-emerald-400/80 rounded-3xl pointer-events-none flex flex-col justify-between p-2.5">
                      <span className="text-[10px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded-full self-start backdrop-blur-xs">
                        {t('modal_face_detection')}
                      </span>
                      <span className="text-[10px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded-full self-end backdrop-blur-xs">
                        {t('modal_liveness')}
                      </span>
                    </div>

                    {/* Bottom User & Timestamp Strip */}
                    <div className="absolute bottom-3 left-3 right-3 text-white text-xs flex items-center justify-between font-medium pointer-events-none">
                      <span className="truncate max-w-[160px]">{currentUser.name}</span>
                      <span className="font-mono bg-black/40 px-2 py-0.5 rounded-md text-[11px]">
                        {formattedTime} WIB
                      </span>
                    </div>
                  </div>

                  {/* Camera Control Action Buttons */}
                  <div className="flex items-center gap-2">
                    {capturedPhoto ? (
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-500" />
                        <span>{t('retake_photo')}</span>
                      </button>
                    ) : (
                      isCameraActive && (
                        <button
                          type="button"
                          onClick={handleCaptureSnapshot}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-98"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{t('take_photo')}</span>
                        </button>
                      )
                    )}

                    {/* File Upload Fallback Trigger */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title={t('upload_photo_btn')}
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('upload_photo_btn')}</span>
                    </button>
                  </div>

                  {/* Active Shift Indicator Below Viewfinder */}
                  <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-semibold text-blue-900 dark:text-blue-200">
                        {t('modal_shift_registered')}
                      </span>
                    </div>
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      {activeShift?.name} ({activeShift?.startTime} - {activeShift?.endTime} WIB)
                    </span>
                  </div>
                </div>

                {/* Right Column: Verification Checks & Notes Input */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  
                  {/* System Checklist Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('modal_checklist_title')}
                    </h5>
                    
                    <div className="space-y-2 text-xs">
                      {/* Geolocation status */}
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              inRadius
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-500 dark:text-rose-400'
                            }`}
                          />
                          <span>{t('modal_checklist_geo')}</span>
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            inRadius
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatDistance(activeDistance)} (≤ {targetRadius}m)
                        </span>
                      </div>

                      {/* Shift alignment */}
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('modal_checklist_shift')}</span>
                        </span>
                        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {t('stat_on_time')}
                        </span>
                      </div>

                      {/* Face verification */}
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              capturedPhoto
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          />
                          <span>{t('modal_checklist_face')}</span>
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            capturedPhoto
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {capturedPhoto ? t('photo_captured_badge') : 'Pratinjau'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('modal_notes_label')}
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('modal_notes_placeholder')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Geotag Confirmation Notice */}
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold block truncate">{branchName}</span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {isRealMode ? t('geotag_real_gps', 'Geotag Riil GPS Perangkat') : t('geotag_simulated_office', 'Simulasi Kantor Terverifikasi')} (
                        {activeLat != null ? Number(activeLat).toFixed(4) : '-'},{' '}
                        {activeLon != null ? Number(activeLon).toFixed(4) : '-'})
                      </span>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsCapturing(false);
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('modal_cancel')}
              </button>
              <button
                type="button"
                onClick={handleExecuteClockIn}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{t('modal_confirm_clock_in')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <OvertimeModal isOpen={isOvertimeModalOpen} onClose={() => setIsOvertimeModalOpen(false)} />

    </div>
  );
}
