import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Listing, ListingCategory, UserProfile } from "../types/listing";

const listingsRef = collection(db, "listings");

export interface ListingFilters {
  category?: ListingCategory;
  city?: string;
  searchText?: string;
}

export async function fetchListings(filters: ListingFilters = {}): Promise<Listing[]> {
  const clauses = [where("status", "==", "active")];
  if (filters.category) clauses.push(where("category", "==", filters.category));
  if (filters.city) clauses.push(where("city", "==", filters.city));

  const q = query(listingsRef, ...clauses, orderBy("createdAt", "desc"), fbLimit(50));
  const snap = await getDocs(q);
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Listing);

  if (filters.searchText) {
    const needle = filters.searchText.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) || item.venue.toLowerCase().includes(needle)
    );
  }

  return items;
}

export async function fetchListingById(listingId: string): Promise<Listing | null> {
  const snap = await getDoc(doc(db, "listings", listingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Listing;
}

export async function fetchMyListings(sellerId: string): Promise<Listing[]> {
  const q = query(listingsRef, where("sellerId", "==", sellerId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Listing);
}

export type NewListingInput = Omit<
  Listing,
  "id" | "sellerId" | "sellerName" | "sellerAvatar" | "sellerZaloId" | "status" | "createdAt" | "updatedAt"
>;

export async function createListing(input: NewListingInput, seller: UserProfile) {
  const now = Date.now();
  return addDoc(listingsRef, {
    ...input,
    sellerId: seller.uid,
    sellerName: seller.name,
    sellerAvatar: seller.avatar ?? null,
    sellerZaloId: seller.zaloId,
    status: "active",
    createdAt: now,
    updatedAt: now,
    createdAtServer: serverTimestamp(),
  });
}

export async function updateListingStatus(listingId: string, status: Listing["status"]) {
  await updateDoc(doc(db, "listings", listingId), { status, updatedAt: Date.now() });
}

export async function deleteListing(listingId: string) {
  await deleteDoc(doc(db, "listings", listingId));
}

export async function uploadListingImage(blob: Blob, sellerId: string): Promise<string> {
  const ext = blob.type.split("/")[1] ?? "jpg";
  const path = `listing-images/${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
