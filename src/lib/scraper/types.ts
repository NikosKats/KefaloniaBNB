export interface ScrapedListing {
  source: 'airbnb' | 'booking';
  sourceUrl: string;
  title: string;
  description: string;
  photos: string[];
  location: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
  };
  amenities: string[];
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  propertyType?: string;
  rating?: number;
  reviewCount?: number;
}
