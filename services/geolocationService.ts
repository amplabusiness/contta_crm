interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Fetches geographic coordinates for a given Brazilian CEP (postal code).
 * @param cep The CEP string (e.g., "01001000").
 * @returns A promise that resolves to an object with latitude and longitude, or null if not found.
 */
export const getCoordinatesForCep = async (cep: string): Promise<Coordinates | null> => {
  const sanitizedCep = cep.replace(/[^\d]/g, '');
  if (sanitizedCep.length !== 8) {
    return null;
  }
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${sanitizedCep}`);
    if (!response.ok) {
      console.warn(`Could not fetch coordinates for CEP ${sanitizedCep}: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    if (data.location?.coordinates) {
      const lat = parseFloat(data.location.coordinates.latitude);
      const lon = parseFloat(data.location.coordinates.longitude);

      if (!isNaN(lat) && !isNaN(lon)) {
        return {
          latitude: lat,
          longitude: lon,
        };
      } else {
        console.warn(`Received invalid coordinates for CEP ${sanitizedCep}:`, data.location.coordinates);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching coordinates for CEP ${sanitizedCep}:`, error);
    return null;
  }
};

/**
 * Calculates the distance between two geographical points using the Haversine formula.
 * @param lat1 Latitude of the first point.
 * @param lon1 Longitude of the first point.
 * @param lat2 Latitude of the second point.
 * @param lon2 Longitude of the second point.
 * @returns The distance in kilometers.
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};