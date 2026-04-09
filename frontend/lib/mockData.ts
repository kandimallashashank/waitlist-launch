/**
 * Mock data for development and testing
 * This provides realistic data when the API is unavailable
 */

import { type Fragrance, type DiscoveryKit, type Review } from '@/api/base44Client';

export const mockFragrances: Fragrance[] = [
  {
    id: '1',
    name: 'Sauvage',
    brand: 'Dior',
    gender: 'men',
    price_3ml: 199,
    price_8ml: 399,
    price_12ml: 549,
    original_price_3ml: 299,
    category: 'best_seller',
    blind_buy_score: 4.8,
    image_url: '/images/products/p1.jpg',
    description: 'A fresh and spicy fragrance with bergamot and pepper notes',
    notes: {
      top: 'Calabrian Bergamot, Pepper',
      middle: 'Lavender, Pink Pepper, Patchouli, Vetiver',
      base: 'Ambroxan, Cedar, Labdanum'
    },
    seasons: ['summer', 'spring', 'fall'],
    occasions: ['office', 'daily', 'party'],
    type: 'Eau de Toilette'
  },
  {
    id: '2',
    name: 'Bleu de Chanel',
    brand: 'Chanel',
    gender: 'men',
    price_3ml: 249,
    price_8ml: 449,
    price_12ml: 599,
    category: 'best_seller',
    blind_buy_score: 4.7,
    image_url: '/images/products/p2.jpg',
    description: 'A versatile and sophisticated fragrance',
    notes: {
      top: 'Citrus, Mint, Pink Pepper',
      middle: 'Ginger, Nutmeg, Jasmine',
      base: 'Incense, Vetiver, Sandalwood'
    },
    seasons: ['spring', 'summer', 'fall'],
    occasions: ['office', 'daily', 'date'],
    type: 'Eau de Parfum'
  },
  {
    id: '3',
    name: 'Miss Dior',
    brand: 'Dior',
    gender: 'women',
    price_3ml: 249,
    price_8ml: 449,
    price_12ml: 599,
    category: 'best_seller',
    blind_buy_score: 4.6,
    image_url: '/images/products/p5.jpg',
    description: 'A romantic floral fragrance',
    notes: {
      top: 'Mandarin Orange, Blood Orange',
      middle: 'Rose, Jasmine, Lily of the Valley',
      base: 'Patchouli, Musk'
    },
    seasons: ['spring', 'summer'],
    occasions: ['office', 'date'],
    type: 'Eau de Parfum'
  },
  {
    id: '4',
    name: 'Coco Mademoiselle',
    brand: 'Chanel',
    gender: 'women',
    price_3ml: 279,
    price_8ml: 479,
    price_12ml: 629,
    category: 'best_seller',
    blind_buy_score: 4.7,
    image_url: '/images/products/p6.jpg',
    description: 'A modern and elegant fragrance',
    notes: {
      top: 'Orange, Mandarin, Orange Blossom',
      middle: 'Rose, Jasmine, Mimosa',
      base: 'Patchouli, Vetiver, Vanilla, White Musk'
    },
    seasons: ['spring', 'fall'],
    occasions: ['office', 'date'],
    type: 'Eau de Parfum'
  },
  {
    id: '5',
    name: 'Aventus',
    brand: 'Creed',
    gender: 'men',
    price_3ml: 399,
    price_8ml: 699,
    price_12ml: 949,
    original_price_3ml: 599,
    category: 'sale',
    blind_buy_score: 4.9,
    image_url: '/images/products/p3.jpg',
    description: 'A luxurious and powerful fragrance',
    notes: {
      top: 'Pineapple, Apple, Bergamot, Blackcurrant',
      middle: 'Birch, Patchouli, Jasmine, Rose',
      base: 'Musk, Oakmoss, Vanilla, Ambergris'
    },
    seasons: ['spring', 'summer', 'fall'],
    occasions: ['office', 'party', 'date'],
    type: 'Eau de Parfum'
  },
  {
    id: '6',
    name: 'Black Opium',
    brand: 'YSL',
    gender: 'women',
    price_3ml: 229,
    price_8ml: 429,
    price_12ml: 579,
    original_price_3ml: 329,
    category: 'sale',
    blind_buy_score: 4.5,
    image_url: '/images/products/p2.jpg',
    description: 'An addictive and sensual fragrance',
    notes: {
      top: 'Pink Pepper, Orange Blossom, Pear',
      middle: 'Coffee, Jasmine, Bitter Almond',
      base: 'Vanilla, Patchouli, Cedar'
    },
    seasons: ['fall', 'winter'],
    occasions: ['party', 'date'],
    type: 'Eau de Parfum'
  },
  {
    id: '7',
    name: 'Acqua di Gio',
    brand: 'Giorgio Armani',
    gender: 'men',
    price_3ml: 219,
    price_8ml: 419,
    price_12ml: 569,
    category: 'best_seller',
    blind_buy_score: 4.6,
    image_url: '/images/products/p1.jpg',
    description: 'A fresh aquatic fragrance',
    notes: {
      top: 'Marine Notes, Mandarin, Bergamot',
      middle: 'Jasmine, Calone, Persimmon',
      base: 'Amber, Patchouli, White Musk'
    },
    seasons: ['summer', 'spring'],
    occasions: ['office', 'daily'],
    type: 'Eau de Toilette'
  },
  {
    id: '8',
    name: 'La Vie Est Belle',
    brand: 'Lancôme',
    gender: 'women',
    price_3ml: 239,
    price_8ml: 439,
    price_12ml: 589,
    category: 'best_seller',
    blind_buy_score: 4.4,
    image_url: '/images/products/p6.jpg',
    description: 'A gourmand floral fragrance',
    notes: {
      top: 'Blackcurrant, Pear',
      middle: 'Iris, Jasmine, Orange Blossom',
      base: 'Praline, Vanilla, Patchouli'
    },
    seasons: ['fall', 'winter'],
    occasions: ['date', 'party'],
    type: 'Eau de Parfum'
  }
];

export const mockKits: DiscoveryKit[] = [
  {
    id: 'kit-1',
    name: 'Office Safe Kit',
    tagline: '5 fragrances that won\'t get you HR\'d',
    price: 499,
    original_price: 699,
    price_3ml: 499,
    price_8ml: 699,
    price_12ml: 899,
    vial_count: 5,
    vial_size_ml: 3,
    blind_buy_score: 4.5,
    trending_city: 'Bangalore',
    trending_age_group: '22-28',
    reorder_rate: 68,
    gender: 'unisex',
    season: ['spring', 'summer'],
    occasion: ['office', 'daily'],
    style: 'Professional',
    image_url: '/images/products/p1.jpg',
    fragrances: [
      { id: '1', perfume_id: '1', name: 'Sauvage', brand: 'Dior', top_notes: 'Bergamot, Pepper', mid_notes: 'Lavender, Patchouli', base_notes: 'Ambroxan, Cedar', blind_buy_score: 4.8, best_for: 'Office' },
      { id: '2', perfume_id: '2', name: 'Bleu de Chanel', brand: 'Chanel', top_notes: 'Citrus, Mint', mid_notes: 'Ginger, Jasmine', base_notes: 'Vetiver, Sandalwood', blind_buy_score: 4.7, best_for: 'Office' },
      { id: '7', perfume_id: '7', name: 'Acqua di Gio', brand: 'Giorgio Armani', top_notes: 'Marine, Bergamot', mid_notes: 'Jasmine, Calone', base_notes: 'Patchouli, Musk', blind_buy_score: 4.6, best_for: 'Daily' }
    ],
    why_this_kit: 'Perfect for professional environments with subtle, long-lasting scents'
  },
  {
    id: 'kit-2',
    name: 'Date Night Essentials',
    tagline: 'Romantic fragrances for special occasions',
    price: 599,
    original_price: 799,
    price_3ml: 549,
    price_8ml: 749,
    price_12ml: 949,
    vial_count: 5,
    vial_size_ml: 3,
    blind_buy_score: 4.7,
    trending_city: 'Mumbai',
    trending_age_group: '25-35',
    reorder_rate: 72,
    gender: 'unisex',
    season: ['fall', 'winter'],
    occasion: ['date', 'evening'],
    style: 'Romantic',
    image_url: '/images/products/p2.jpg',
    fragrances: [
      { id: '5', perfume_id: '5', name: 'Aventus', brand: 'Creed', top_notes: 'Pineapple, Bergamot', mid_notes: 'Birch, Jasmine', base_notes: 'Musk, Vanilla', blind_buy_score: 4.9, best_for: 'Date Night' },
      { id: '6', perfume_id: '6', name: 'Black Opium', brand: 'YSL', top_notes: 'Pink Pepper, Pear', mid_notes: 'Coffee, Jasmine', base_notes: 'Vanilla, Cedar', blind_buy_score: 4.5, best_for: 'Evening' }
    ],
    why_this_kit: 'Curated selection of seductive and memorable fragrances'
  }
];

export const mockReviews: Review[] = [
  {
    id: 'rev-1',
    fragrance_id: '1',
    fragrance_name: 'Sauvage',
    rating: 5,
    title: 'Amazing fragrance!',
    comment: 'This is my new favorite. Long lasting and gets compliments everywhere.',
    user_name: 'Raj K.',
    user_city: 'Mumbai',
    verified_purchase: true,
    helpful_count: 12,
    status: 'approved',
    created_date: new Date().toISOString()
  },
  {
    id: 'rev-2',
    fragrance_id: '1',
    fragrance_name: 'Sauvage',
    rating: 4,
    title: 'Good but strong',
    comment: 'Great scent but might be too strong for office. Perfect for evenings.',
    user_name: 'Priya S.',
    user_city: 'Delhi',
    verified_purchase: true,
    helpful_count: 8,
    status: 'approved',
    created_date: new Date().toISOString()
  },
  {
    id: 'rev-3',
    fragrance_id: '2',
    fragrance_name: 'Bleu de Chanel',
    rating: 5,
    title: 'Perfect for all occasions',
    comment: 'Versatile and sophisticated. Works great in office and evenings. Highly recommend!',
    user_name: 'Amit P.',
    user_city: 'Bangalore',
    verified_purchase: true,
    helpful_count: 15,
    status: 'approved',
    created_date: new Date().toISOString()
  },
  {
    id: 'rev-4',
    fragrance_id: '3',
    fragrance_name: 'Miss Dior',
    rating: 5,
    title: 'Elegant and romantic',
    comment: 'Beautiful floral scent. Perfect for spring and summer. My signature fragrance now.',
    user_name: 'Ananya R.',
    user_city: 'Pune',
    verified_purchase: true,
    helpful_count: 10,
    status: 'approved',
    created_date: new Date().toISOString()
  },
  {
    id: 'rev-5',
    fragrance_id: '4',
    fragrance_name: 'Coco Mademoiselle',
    rating: 4,
    title: 'Classic and timeless',
    comment: 'A modern take on a classic. Elegant and sophisticated. Great for office wear.',
    user_name: 'Sneha M.',
    user_city: 'Mumbai',
    verified_purchase: true,
    helpful_count: 9,
    status: 'approved',
    created_date: new Date().toISOString()
  },
  {
    id: 'rev-6',
    fragrance_id: '5',
    fragrance_name: 'Aventus',
    rating: 5,
    title: 'Worth every penny',
    comment: 'Expensive but absolutely worth it. Unique pineapple opening is incredible. Long lasting.',
    user_name: 'Vikram S.',
    user_city: 'Delhi',
    verified_purchase: true,
    helpful_count: 20,
    status: 'approved',
    created_date: new Date().toISOString()
  },
  {
    id: 'rev-7',
    fragrance_id: '6',
    fragrance_name: 'Black Opium',
    rating: 4,
    title: 'Addictive scent',
    comment: 'Sweet and sensual. Perfect for date nights. Coffee note is unique and lovely.',
    user_name: 'Meera K.',
    user_city: 'Chennai',
    verified_purchase: true,
    helpful_count: 11,
    status: 'approved',
    created_date: new Date().toISOString()
  }
];

/**
 * Get mock fragrances with optional filtering
 */
export function getMockFragrances(filters?: {
  gender?: string[];
  category?: string[];
  search?: string;
  season?: string[];
  occasion?: string[];
  style?: string[];
  brand?: string[];
  concentration?: string[];
}): Fragrance[] {
  let fragrances = [...mockFragrances];

  if (filters?.gender && filters.gender.length > 0) {
    fragrances = fragrances.filter(f => filters.gender!.includes(f.gender));
  }

  if (filters?.category && filters.category.length > 0) {
    fragrances = fragrances.filter(f => f.category && filters.category!.includes(f.category));
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    fragrances = fragrances.filter(f =>
      f.name.toLowerCase().includes(searchLower) ||
      f.brand.toLowerCase().includes(searchLower)
    );
  }

  if (filters?.season && filters.season.length > 0) {
    fragrances = fragrances.filter(f => {
      const fSeason = (f as any).season || [];
      return filters.season!.some(s => fSeason.includes(s.toLowerCase()));
    });
  }

  if (filters?.occasion && filters.occasion.length > 0) {
    fragrances = fragrances.filter(f => {
      const fOccasion = (f as any).occasion || [];
      return filters.occasion!.some(o => fOccasion.includes(o.toLowerCase()));
    });
  }

  if (filters?.style && filters.style.length > 0) {
    fragrances = fragrances.filter(f => {
      const fStyle = (f as any).style || '';
      return filters.style!.some(s => fStyle === s);
    });
  }

  if (filters?.brand && filters.brand.length > 0) {
    fragrances = fragrances.filter(f => filters.brand!.includes(f.brand));
  }

  if (filters?.concentration && filters.concentration.length > 0) {
    fragrances = fragrances.filter(f => {
      const fConcentration = (f as any).concentration || '';
      return filters.concentration!.includes(fConcentration);
    });
  }

  return fragrances;
}

/**
 * Get mock kits with optional filtering
 */
export function getMockKits(filters?: {
  gender?: string[];
  season?: string[];
}): DiscoveryKit[] {
  let kits = [...mockKits];

  if (filters?.gender && filters.gender.length > 0) {
    kits = kits.filter(k => !k.gender || filters.gender!.includes(k.gender));
  }

  if (filters?.season && filters.season.length > 0) {
    kits = kits.filter(k => 
      k.season && k.season.some(s => filters.season!.includes(s))
    );
  }

  return kits;
}

/**
 * Get mock reviews for a fragrance
 */
export function getMockReviews(fragranceId: string): Review[] {
  return mockReviews.filter(r => r.fragrance_id === fragranceId);
}
