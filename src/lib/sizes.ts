export type ShirtSize = {
  code: string;
  chestInches: number | null;
};

export const BASE_PRICE = 250;

/** ไซส์ตามตาราง YO SPORT + ไซส์พิเศษ 6XL–9XL · ราคาเท่ากันทุกตัว */
export const SHIRT_SIZES: ShirtSize[] = [
  { code: "SS", chestInches: 36 },
  { code: "S", chestInches: 38 },
  { code: "M", chestInches: 40 },
  { code: "L", chestInches: 42 },
  { code: "XL", chestInches: 44 },
  { code: "2XL", chestInches: 46 },
  { code: "3XL", chestInches: 48 },
  { code: "4XL", chestInches: 50 },
  { code: "5XL", chestInches: 52 },
  { code: "6XL", chestInches: null },
  { code: "7XL", chestInches: null },
  { code: "8XL", chestInches: null },
  { code: "9XL", chestInches: null },
];

export function getSize(code: string): ShirtSize | undefined {
  return SHIRT_SIZES.find((s) => s.code === code);
}

export function priceForSize(_code?: string): number {
  return BASE_PRICE;
}

export function formatSizeLabel(size: ShirtSize): string {
  const chest = size.chestInches ? ` · รอบอก ${size.chestInches}"` : "";
  return `${size.code}${chest}`;
}
