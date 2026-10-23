import React, { useEffect } from 'react';
import OvertimeHistoryList from '../../features/overtime/components/OvertimeHistoryList';
import { useAttendance } from '../../context/AttendanceContext';

export default function OvertimePage() {
  const { fetchOvertimeRequests } = useAttendance();

  useEffect(() => {
    fetchOvertimeRequests();
  }, [fetchOvertimeRequests]);

  return (
    <div className="space-y-6">
      <OvertimeHistoryList />
    </div>
  );
}

