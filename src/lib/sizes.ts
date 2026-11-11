export type ShirtSize = {
  code: string;
  chestInches: number | null;
  surcharge: number;
};

export const BASE_PRICE = 250;

/** ไซส์ตามตาราง YO SPORT + ไซส์พิเศษ 6XL–9XL */
export const SHIRT_SIZES: ShirtSize[] = [
  { code: "SS", chestInches: 36, surcharge: 0 },
  { code: "S", chestInches: 38, surcharge: 0 },
  { code: "M", chestInches: 40, surcharge: 0 },
  { code: "L", chestInches: 42, surcharge: 0 },
  { code: "XL", chestInches: 44, surcharge: 0 },
  { code: "2XL", chestInches: 46, surcharge: 20 },
  { code: "3XL", chestInches: 48, surcharge: 40 },
  { code: "4XL", chestInches: 50, surcharge: 60 },
  { code: "5XL", chestInches: 52, surcharge: 80 },
  { code: "6XL", chestInches: null, surcharge: 100 },
  { code: "7XL", chestInches: null, surcharge: 120 },
  { code: "8XL", chestInches: null, surcharge: 140 },
  { code: "9XL", chestInches: null, surcharge: 160 },
];

export function getSize(code: string): ShirtSize | undefined {
  return SHIRT_SIZES.find((s) => s.code === code);
}

export function priceForSize(code: string): number {
  const size = getSize(code);
  if (!size) return BASE_PRICE;
  return BASE_PRICE + size.surcharge;
}

export function formatSizeLabel(size: ShirtSize): string {
  const chest = size.chestInches ? ` (รอบอก ${size.chestInches}")` : "";
  const extra =
    size.surcharge > 0 ? ` · +${size.surcharge}฿` : "";
  return `${size.code}${chest}${extra}`;
}
