export const CATEGORY_ORDER = [
    "Fashion",
    "Beauty & Health",
    "Food & Dining",
    "Grocery",
    "Sports & Outdoor",
    "Home & Living",
    "Electronics",
    "Services",
    "Leisure",
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];

/** Index into the --color-data-N palette; stable across 3D scene and charts. */
export function categoryIndex(category: string): number {
    const i = CATEGORY_ORDER.indexOf(category as Category);
    return i < 0 ? CATEGORY_ORDER.length : i;
}
