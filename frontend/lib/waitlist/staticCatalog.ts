/**
 * Local waitlist marquee catalog (bottle cards). Images are production URLs from
 * `public.perfumes` (Supabase); fimgs.net URLs load via `/api/proxy-image`.
 *
 * Regenerate: run a SQL export of top perfumes with `primary_image_url` / `image_url`,
 * or set `NEXT_PUBLIC_WAITLIST_USE_STATIC_CATALOG=false` to use the API instead.
 */

import type { WaitlistCatalogEntry } from "@/types/waitlistCatalog";

/** Curated pool for the dark “Real bottles” marquee (synced from Supabase). */
export const WAITLIST_STATIC_CATALOG: WaitlistCatalogEntry[] = [
  {
    id: "5ce241b7-bf43-4bc8-b834-c77135d2c593",
    name: "Acqua di Parma Colonia Pura",
    brand: "Acqua di Parma",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.45876.jpg",
    blind_buy_score: 4.8,
  },
  {
    id: "8f50e09e-24ad-482e-b1ba-6a3a3767c783",
    name: "Luminescence for Her",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.47033.jpg",
    blind_buy_score: 4.8,
  },
  {
    id: "f5dd5460-710d-45cd-9ffe-b6baad42e8be",
    name: "Rosa Nobile Hair Mist",
    brand: "Acqua di Parma",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.53650.jpg",
    blind_buy_score: 4.8,
  },
  {
    id: "c56d1aa3-8ddb-4802-abb4-fc9498dddaef",
    name: "Teyf",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.19428.jpg",
    blind_buy_score: 4.7,
  },
  {
    id: "ccc4c9ef-9f4e-426b-ae75-6ac21789af2b",
    name: "Chemystery",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.14044.jpg",
    blind_buy_score: 4.7,
  },
  {
    id: "d8615461-ab4d-442e-9c56-b5a860e65208",
    name: "Lynked Freedom",
    brand: "Afnan",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.119003.jpg",
    blind_buy_score: 4.7,
  },
  {
    id: "f42d5e64-54f2-48b8-b4b1-a2e9ded2b58a",
    name: "Iris Nobile Edizione Speciale 2008",
    brand: "Acqua di Parma",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.5068.jpg",
    blind_buy_score: 4.7,
  },
  {
    id: "6c30d3f9-c6a8-4c34-8569-dac497d5b18b",
    name: "Colonia",
    brand: "Acqua di Parma",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.1681.jpg",
    blind_buy_score: 4.6,
  },
  {
    id: "798e352e-75b1-4068-80ef-13287eec12db",
    name: "Younique",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.35893.jpg",
    blind_buy_score: 4.6,
  },
  {
    id: "40ab675d-0462-4a7d-953e-355a4d366595",
    name: "Skin Couture Classic Men",
    brand: "Armaf",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.27704.jpg",
    blind_buy_score: 4.6,
  },
  {
    id: "4f2e0437-1aa8-4b7f-b4d0-f2ae5ebfc8d7",
    name: "Vision",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.15108.jpg",
    blind_buy_score: 4.5,
  },
  {
    id: "740e0b17-e52d-4408-8471-4e8b72c8aee4",
    name: "Highness V",
    brand: "Afnan",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.78114.jpg",
    blind_buy_score: 4.5,
  },
  {
    id: "4ee68c91-ff64-4f5f-99f2-aedc35727878",
    name: "Asheem",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.14049.jpg",
    blind_buy_score: 4.5,
  },
  {
    id: "42ce96d4-1131-4f3c-a756-87007c863e10",
    name: "Cuir Obscur",
    brand: "Byredo",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.40276.jpg",
    blind_buy_score: 4.5,
  },
  {
    id: "9e5904a9-f906-4d93-86be-0365218e2bb4",
    name: "Bling",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.16036.jpg",
    blind_buy_score: 4.5,
  },
  {
    id: "16056caa-4aa2-4259-a0ef-e84711bae3c8",
    name: "Renata II",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.81378.jpg",
    blind_buy_score: 4.4,
  },
  {
    id: "0822ef4f-1844-4459-9529-b92b61f084a7",
    name: "Mazaaj",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.26893.jpg",
    blind_buy_score: 4.4,
  },
  {
    id: "195a7792-cbea-4888-ab93-f2fa58cc0e95",
    name: "Blu",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.19420.jpg",
    blind_buy_score: 4.3,
  },
  {
    id: "270d9d79-6409-4e9f-a45a-aaf049c1dcf9",
    name: "Afzal Abeer",
    brand: "Afnan",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.27378.jpg",
    blind_buy_score: 4.3,
  },
  {
    id: "b352ad01-599e-4e4d-bbcc-2a955e9b70ad",
    name: "Ajmal II",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.26882.jpg",
    blind_buy_score: 4.3,
  },
  {
    id: "d801be36-c714-498e-a6dd-12a01a78ce80",
    name: "9am",
    brand: "Afnan",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.70706.jpg",
    blind_buy_score: 4.2,
  },
  {
    id: "6baeba82-78d1-4b98-8285-87a0f6a6cf3c",
    name: "Jaipur",
    brand: "Boucheron",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.136.jpg",
    blind_buy_score: 4.2,
  },
  {
    id: "f5906c4d-7e06-4249-9688-6a11205f2ee8",
    name: "Amaris",
    brand: "Ajmal",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.32508.jpg",
    blind_buy_score: 4.2,
  },
  {
    id: "8d750b00-41bb-4aa6-9b16-1cdcffc16cad",
    name: "Skin Couture Men",
    brand: "Armaf",
    image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.27703.jpg",
    blind_buy_score: 4.1,
  },
];

/**
 * When false, `useWaitlistPerfumes` fetches from the API instead of `WAITLIST_STATIC_CATALOG`.
 */
export function isStaticWaitlistCatalogEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WAITLIST_USE_STATIC_CATALOG !== "false";
}
