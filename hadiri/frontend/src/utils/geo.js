/**
 * Geolocation & Geofencing Utilities for Hadirin
 */

/**
 * Calculate Great-Circle distance between two coordinates in meters using the Haversine formula.
 *
 * @param {number|string} lat1 Latitude of point 1
 * @param {number|string} lon1 Longitude of point 1
 * @param {number|string} lat2 Latitude of point 2
 * @param {number|string} lon2 Longitude of point 2
 * @returns {number|null} Distance in meters rounded to nearest whole meter, or null if invalid coordinates
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (
    !Number.isFinite(nLat1) ||
    !Number.isFinite(nLon1) ||
    !Number.isFinite(nLat2) ||
    !Number.isFinite(nLon2)
  ) {
    return null;
  }

  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const phi1 = toRad(nLat1);
  const phi2 = toRad(nLat2);
  const deltaPhi = toRad(nLat2 - nLat1);
  const deltaLambda = toRad(nLon2 - nLon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format distance in meters to a human-readable string (m or km)
 *
 * @param {number|null} meters
 * @returns {string} e.g. "45 m", "1.2 km", or "-"
 */
export function formatDistance(meters) {
  if (meters == null || !Number.isFinite(meters)) {
    return '-';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Check if the user is inside the allowed geofence radius
 *
 * @param {number|string} currentLat
 * @param {number|string} currentLon
 * @param {number|string} targetLat
 * @param {number|string} targetLon
 * @param {number} radiusMeters
 * @returns {boolean}
 */
export function isWithinGeofence(currentLat, currentLon, targetLat, targetLon, radiusMeters = 100) {
  const distance = calculateHaversineDistance(currentLat, currentLon, targetLat, targetLon);
  if (distance == null) return false;
  return distance <= radiusMeters;
}
