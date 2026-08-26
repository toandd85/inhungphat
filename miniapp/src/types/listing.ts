export type ListingCategory = "concert" | "movie" | "football_match" | "sport_court";

export type ListingStatus = "active" | "sold" | "hidden";

export type ListingKind = "sell" | "exchange";

export interface Listing {
  id: string;
  category: ListingCategory;
  kind: ListingKind;
  title: string;
  description: string;
  eventDate: string; // ISO date-time
  venue: string;
  city: string;
  quantity: number;
  price: number; // VND, 0 if pure exchange
  originalPrice?: number;
  images: string[];
  sellerId: string; // Firebase Auth uid (Zalo-verified)
  sellerName: string;
  sellerAvatar?: string;
  sellerZaloId: string;
  status: ListingStatus;
  createdAt: number; // epoch ms
  updatedAt: number;
  // Sport court booking specific fields
  courtSport?: "pickleball" | "football";
  slotStart?: string; // ISO date-time
  slotEnd?: string; // ISO date-time
}

export interface UserProfile {
  uid: string;
  zaloId: string;
  name: string;
  avatar?: string;
  phone?: string;
  createdAt: number;
}

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  concert: "Ca nhạc",
  movie: "Xem phim",
  football_match: "Đá bóng",
  sport_court: "Sân thể thao",
};
