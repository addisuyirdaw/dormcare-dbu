export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Wraps navigator.geolocation.getCurrentPosition in a Promise */
export function getCurrentPosition(options?: PositionOptions): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
    );
  });
}

/** Haversine formula — returns distance in meters between two coordinates */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns true if user coords are within the block's geofence radius */
export function isWithinGeofence(
  userCoords: Coordinates,
  blockCoords: Coordinates,
  radiusMeters: number
): boolean {
  const dist = calculateDistance(
    userCoords.latitude, userCoords.longitude,
    blockCoords.latitude, blockCoords.longitude
  );
  return dist <= radiusMeters;
}
