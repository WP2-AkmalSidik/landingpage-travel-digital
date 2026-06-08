const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface ApiPackage {
  id: number;
  name: string;
  type: string;
  duration_days: number;
  departure_date_formatted: string;
  base_price: number;
  formatted_price: string;
  quota_remaining: number;
  image_url: string;
  is_available: boolean;
  facilities: {
    hotel_rating: number;
    mekkah_distance: string;
    madinah_distance: string;
    airline: string;
  };
}

export interface MappedPackage {
  badge: string;
  title: string;
  price: string;
  airline: string;
  hotel: string;
  date: string;
  seats: number;
  type: string;
  image: string;
  mekkahDist: string;
  madinahDist: string;
  isRecommended: boolean;
}

/**
 * Fetches packages from the Laravel API and maps them to the format expected by Astro components.
 * @param type Optional filter for type ('umrah' or 'haji')
 * @param limit Optional limit for number of results
 * @returns Array of mapped packages
 */
export async function fetchPackages(type?: string, limit?: number): Promise<MappedPackage[]> {
  try {
    let url = `${API_BASE_URL}/packages`;
    const params = new URLSearchParams();
    
    if (type) {
      if (type.toLowerCase() === 'umrah' || type.toLowerCase() === 'umroh') {
        params.append('type', 'umrah');
      } else if (type.toLowerCase() === 'haji') {
        params.append('type', 'haji');
      } else {
        params.append('type', type);
      }
    }
    
    // Use Laravel pagination limit
    if (limit) {
      params.append('per_page', limit.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // In Astro, fetch happens at build time for SSG, or request time for SSR.
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Failed to fetch packages from API. Status: ${response.status} ${response.statusText}`);
      return [];
    }

    const json = await response.json();
    
    // In Laravel Resources with paginate(), data is usually wrapped in 'data'
    const rawData: ApiPackage[] = json.data || json;
    
    if (!Array.isArray(rawData)) {
      console.warn('API returned non-array data structure', rawData);
      return [];
    }

    return rawData.map(pkg => ({
      badge: `${pkg.duration_days} HARI`,
      title: pkg.name,
      // Convert base_price 25900000 to "25.900.000", safely handling missing values
      price: (pkg.base_price || 0).toLocaleString('id-ID'),
      airline: pkg.facilities?.airline || 'Saudi Airline',
      hotel: `Bintang ${pkg.facilities?.hotel_rating || 4}`,
      date: pkg.departure_date_formatted || 'Jadwal Menyusul',
      seats: pkg.quota_remaining,
      type: pkg.type === 'haji' ? 'Haji' : 'Umrah',
      image: pkg.image_url,
      mekkahDist: `± ${pkg.facilities?.mekkah_distance || '300m'}`,
      madinahDist: `± ${pkg.facilities?.madinah_distance || '300m'}`,
      // Mark as recommended if it's an umrah package >= 12 days (dummy logic)
      isRecommended: pkg.type === 'umrah' && pkg.duration_days >= 12
    }));
  } catch (error) {
    console.error("Error fetching packages:", error);
    // Return empty array on failure so UI doesn't break
    return [];
  }
}
