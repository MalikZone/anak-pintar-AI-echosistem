import { useState, useEffect } from 'react';
import { formatTimeID, formatDateID, formatShortDateID } from '../utils/formatters';

/**
 * Custom hook untuk mengelola waktu real-time yang terus berdetak setiap detik
 * @param {number} intervalMs - interval refresh waktu dalam ms (default 1000)
 */
export function useCurrentTime(intervalMs = 1000) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return {
    currentTime,
    formattedTime: formatTimeID(currentTime),
    formattedDate: formatDateID(currentTime, true),
    formattedShortDate: formatShortDateID(currentTime),
  };
}

