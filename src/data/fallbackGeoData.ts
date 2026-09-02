// Fallback GeoJSON provider and loader for Indian Districts
import { canonicalStateName } from './districtProfiles';

export interface DistrictFeatureProperties {
  NAME_1: string;
  NAME_2: string;
  ID_1?: string;
  ID_2?: string;
  ST_NM?: string;
  DISTRICT?: string;
  [key: string]: any;
}

export interface DistrictFeature {
  type: 'Feature';
  id?: string;
  properties: DistrictFeatureProperties;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface IndiaDistrictGeoJSON {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

// In-memory cache
let cachedGeoJSON: IndiaDistrictGeoJSON | null = null;

/**
 * Loads India District GeoJSON safely.
 * Tries fetching `/india-districts.json` first, and if that fails or returns non-JSON,
 * falls back to generated geometry without throwing errors.
 */
export async function loadIndiaDistrictsGeoJSON(): Promise<IndiaDistrictGeoJSON> {
  if (cachedGeoJSON && cachedGeoJSON.features && cachedGeoJSON.features.length > 0) {
    return cachedGeoJSON;
  }

  try {
    const res = await fetch('/india-districts.json');
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      // Check that response is actually JSON, not an HTML fallback page
      if (contentType.includes('application/json') || contentType.includes('text/json') || !contentType.includes('text/html')) {
        const text = await res.text();
        if (text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.features) && parsed.features.length > 0) {
            cachedGeoJSON = parsed;
            return parsed;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Network fetch for /india-districts.json not available, using built-in geospatial fallback', e);
  }

  // Generate fallback dataset directly
  const fallback = generateFallbackGeoJSON();
  cachedGeoJSON = fallback;
  return fallback;
}

function createDistrictPolygon(centerLng: number, centerLat: number, radiusDeg: number, sides = 6, seed = 1): number[][][] {
  const points: [number, number][] = [];
  const startAngle = (seed * 137.5) * (Math.PI / 180);
  for (let i = 0; i <= sides; i++) {
    const angle = startAngle + (i / sides) * 2 * Math.PI;
    const jitter = 0.95 + 0.05 * Math.sin(angle * 2 + seed);
    const rLng = radiusDeg * jitter;
    const rLat = radiusDeg * jitter * 0.95;
    const lng = Number((centerLng + rLng * Math.cos(angle)).toFixed(5));
    const lat = Number((centerLat + rLat * Math.sin(angle)).toFixed(5));
    points.push([lng, lat]);
  }
  return [points];
}

export function generateFallbackGeoJSON(): IndiaDistrictGeoJSON {
  const fallbackStates: Array<{ name: string; center: [number, number]; districts: Array<{ name: string; coords: [number, number]; rad?: number }> }> = [
    {
      name: 'Maharashtra',
      center: [76.15, 19.45],
      districts: [
        { name: 'Mumbai', coords: [72.88, 18.98], rad: 0.2 },
        { name: 'Mumbai Suburban', coords: [72.85, 19.12], rad: 0.25 },
        { name: 'Thane', coords: [73.02, 19.22], rad: 0.45 },
        { name: 'Pune', coords: [73.85, 18.52], rad: 0.7 },
        { name: 'Nagpur', coords: [79.08, 21.14], rad: 0.6 },
        { name: 'Nashik', coords: [73.79, 19.99], rad: 0.65 },
        { name: 'Kolhapur', coords: [74.24, 16.70], rad: 0.5 },
        { name: 'Solapur', coords: [75.91, 17.66], rad: 0.65 },
        { name: 'Amravati', coords: [77.75, 20.93], rad: 0.6 },
        { name: 'Chhatrapati Sambhajinagar', coords: [75.34, 19.88], rad: 0.55 },
      ],
    },
    {
      name: 'Tamil Nadu',
      center: [78.75, 10.95],
      districts: [
        { name: 'Chennai', coords: [80.27, 13.08], rad: 0.22 },
        { name: 'Thiruvallur', coords: [79.91, 13.14], rad: 0.45 },
        { name: 'Kanchipuram', coords: [79.70, 12.83], rad: 0.4 },
        { name: 'Cuddalore', coords: [79.77, 11.75], rad: 0.48 },
        { name: 'Madurai', coords: [78.12, 9.92], rad: 0.45 },
        { name: 'Coimbatore', coords: [76.96, 11.01], rad: 0.5 },
        { name: 'Tiruchirappalli', coords: [78.70, 10.79], rad: 0.5 },
        { name: 'Salem', coords: [78.15, 11.66], rad: 0.52 },
        { name: 'Tirunelveli', coords: [77.75, 8.73], rad: 0.5 },
        { name: 'Kanyakumari', coords: [77.43, 8.18], rad: 0.35 },
      ],
    },
    {
      name: 'Kerala',
      center: [76.45, 10.35],
      districts: [
        { name: 'Thiruvananthapuram', coords: [76.94, 8.52], rad: 0.35 },
        { name: 'Ernakulam', coords: [76.28, 9.98], rad: 0.4 },
        { name: 'Wayanad', coords: [76.13, 11.61], rad: 0.38 },
        { name: 'Idukki', coords: [76.97, 9.85], rad: 0.5 },
        { name: 'Kozhikode', coords: [75.78, 11.25], rad: 0.4 },
        { name: 'Alappuzha', coords: [76.33, 9.49], rad: 0.3 },
        { name: 'Thrissur', coords: [76.21, 10.52], rad: 0.42 },
        { name: 'Palakkad', coords: [76.65, 10.78], rad: 0.52 },
      ],
    },
    {
      name: 'Bihar',
      center: [85.75, 25.75],
      districts: [
        { name: 'Patna', coords: [85.14, 25.61], rad: 0.42 },
        { name: 'Supaul', coords: [86.60, 26.12], rad: 0.4 },
        { name: 'Darbhanga', coords: [85.90, 26.15], rad: 0.38 },
        { name: 'Muzaffarpur', coords: [85.39, 26.12], rad: 0.42 },
        { name: 'Gaya', coords: [85.00, 24.79], rad: 0.55 },
        { name: 'Bhagalpur', coords: [87.00, 25.24], rad: 0.42 },
        { name: 'Purnia', coords: [87.47, 25.78], rad: 0.45 },
        { name: 'Katihar', coords: [87.58, 25.54], rad: 0.4 },
      ],
    },
    {
      name: 'Assam',
      center: [92.85, 26.25],
      districts: [
        { name: 'Kamrup Metropolitan', coords: [91.75, 26.18], rad: 0.35 },
        { name: 'Dibrugarh', coords: [94.91, 27.47], rad: 0.45 },
        { name: 'Dhubri', coords: [89.98, 26.02], rad: 0.4 },
        { name: 'Barpeta', coords: [91.01, 26.32], rad: 0.38 },
        { name: 'Cachar', coords: [92.79, 24.83], rad: 0.45 },
        { name: 'Nagaon', coords: [92.68, 26.35], rad: 0.48 },
        { name: 'Jorhat', coords: [94.20, 26.75], rad: 0.4 },
        { name: 'Sonitpur', coords: [92.79, 26.63], rad: 0.5 },
      ],
    },
    {
      name: 'Odisha',
      center: [84.45, 20.55],
      districts: [
        { name: 'Puri', coords: [85.83, 19.81], rad: 0.45 },
        { name: 'Khordha', coords: [85.82, 20.29], rad: 0.42 },
        { name: 'Balasore', coords: [86.93, 21.49], rad: 0.48 },
        { name: 'Kendrapara', coords: [86.42, 20.50], rad: 0.4 },
        { name: 'Ganjam', coords: [84.80, 19.32], rad: 0.6 },
        { name: 'Jagatsinghpur', coords: [86.17, 20.27], rad: 0.35 },
        { name: 'Bhadrak', coords: [86.51, 21.06], rad: 0.38 },
        { name: 'Cuttack', coords: [85.88, 20.46], rad: 0.48 },
      ],
    },
    {
      name: 'Delhi',
      center: [77.15, 28.65],
      districts: [
        { name: 'Central Delhi', coords: [77.22, 28.64], rad: 0.1 },
        { name: 'New Delhi', coords: [77.20, 28.61], rad: 0.1 },
        { name: 'South Delhi', coords: [77.22, 28.52], rad: 0.14 },
        { name: 'North Delhi', coords: [77.16, 28.72], rad: 0.14 },
        { name: 'East Delhi', coords: [77.28, 28.63], rad: 0.12 },
        { name: 'West Delhi', coords: [77.08, 28.65], rad: 0.14 },
      ],
    },
    {
      name: 'Gujarat',
      center: [71.55, 22.45],
      districts: [
        { name: 'Ahmedabad', coords: [72.57, 23.02], rad: 0.55 },
        { name: 'Surat', coords: [72.83, 21.17], rad: 0.48 },
        { name: 'Vadodara', coords: [73.18, 22.30], rad: 0.45 },
        { name: 'Rajkot', coords: [70.80, 22.30], rad: 0.55 },
        { name: 'Kutch', coords: [69.66, 23.24], rad: 1.0 },
        { name: 'Bhavnagar', coords: [72.15, 21.76], rad: 0.5 },
      ],
    },
    {
      name: 'Uttar Pradesh',
      center: [80.65, 27.05],
      districts: [
        { name: 'Lucknow', coords: [80.94, 26.84], rad: 0.4 },
        { name: 'Kanpur Nagar', coords: [80.33, 26.44], rad: 0.42 },
        { name: 'Varanasi', coords: [82.97, 25.31], rad: 0.38 },
        { name: 'Prayagraj', coords: [81.84, 25.43], rad: 0.55 },
        { name: 'Gorakhpur', coords: [83.37, 26.76], rad: 0.45 },
        { name: 'Agra', coords: [78.00, 27.17], rad: 0.5 },
        { name: 'Meerut', coords: [77.70, 28.98], rad: 0.42 },
        { name: 'Gautam Buddha Nagar', coords: [77.50, 28.35], rad: 0.35 },
      ],
    },
    {
      name: 'Rajasthan',
      center: [73.95, 26.55],
      districts: [
        { name: 'Jaipur', coords: [75.78, 26.91], rad: 0.55 },
        { name: 'Jodhpur', coords: [73.02, 26.23], rad: 0.7 },
        { name: 'Bikaner', coords: [73.31, 28.02], rad: 0.8 },
        { name: 'Kota', coords: [75.86, 25.21], rad: 0.5 },
        { name: 'Udaipur', coords: [73.71, 24.58], rad: 0.65 },
        { name: 'Barmer', coords: [71.39, 25.75], rad: 0.9 },
        { name: 'Jaisalmer', coords: [70.91, 26.91], rad: 1.1 },
      ],
    },
    {
      name: 'Karnataka',
      center: [75.95, 14.95],
      districts: [
        { name: 'Bengaluru Urban', coords: [77.59, 12.97], rad: 0.35 },
        { name: 'Dakshina Kannada', coords: [74.85, 12.87], rad: 0.45 },
        { name: 'Mysuru', coords: [76.65, 12.30], rad: 0.55 },
        { name: 'Belagavi', coords: [74.50, 15.85], rad: 0.7 },
        { name: 'Hubballi-Dharwad', coords: [75.09, 15.36], rad: 0.45 },
      ],
    },
    {
      name: 'West Bengal',
      center: [87.95, 23.85],
      districts: [
        { name: 'Kolkata', coords: [88.36, 22.57], rad: 0.22 },
        { name: 'South 24 Parganas', coords: [88.40, 22.00], rad: 0.7 },
        { name: 'North 24 Parganas', coords: [88.52, 22.72], rad: 0.52 },
        { name: 'Howrah', coords: [88.26, 22.60], rad: 0.28 },
        { name: 'Darjeeling', coords: [88.26, 27.04], rad: 0.42 },
      ],
    },
    {
      name: 'Uttarakhand',
      center: [79.25, 30.15],
      districts: [
        { name: 'Dehradun', coords: [78.03, 30.32], rad: 0.42 },
        { name: 'Haridwar', coords: [78.16, 29.95], rad: 0.38 },
        { name: 'Chamoli', coords: [79.35, 30.40], rad: 0.6 },
        { name: 'Uttarkashi', coords: [78.43, 30.73], rad: 0.65 },
        { name: 'Rudraprayag', coords: [78.98, 30.28], rad: 0.35 },
      ],
    },
    {
      name: 'Himachal Pradesh',
      center: [77.25, 31.85],
      districts: [
        { name: 'Shimla', coords: [77.17, 31.10], rad: 0.45 },
        { name: 'Kangra', coords: [76.32, 32.22], rad: 0.55 },
        { name: 'Kullu', coords: [77.11, 31.96], rad: 0.55 },
        { name: 'Mandi', coords: [76.93, 31.71], rad: 0.48 },
      ],
    },
  ];

  const features: DistrictFeature[] = [];
  let index = 0;

  for (const state of fallbackStates) {
    for (const dist of state.districts) {
      index++;
      const [lng, lat] = dist.coords;
      const rad = dist.rad || 0.4;
      const polygonCoords = createDistrictPolygon(lng, lat, rad, 6, index);

      features.push({
        type: 'Feature',
        id: `dist-fb-${index}`,
        properties: {
          NAME_1: state.name,
          NAME_2: dist.name,
          ID_1: state.name.toLowerCase().replace(/\s+/g, '-'),
          ID_2: `dist-fb-${index}`,
          ST_NM: state.name,
          DISTRICT: dist.name,
        },
        geometry: {
          type: 'Polygon',
          coordinates: polygonCoords,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
