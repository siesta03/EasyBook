export const PHOTOSHOOT_CATEGORIES = [
  "Indoor Photoshoot",
  "Outdoor Photoshoot",
  "Wedding",
  "Sport",
  "Product",
] as const;

export type PhotoshootCategory = (typeof PHOTOSHOOT_CATEGORIES)[number];

export interface CategoryMeta {
  id: PhotoshootCategory;
  label: string;
  tagline: string;
  description: string;
  defaultBufferMinutes: number;
  badgeColor: string;
  accentGradient: string;
}

export const CATEGORY_METADATA: Record<PhotoshootCategory, CategoryMeta> = {
  "Indoor Photoshoot": {
    id: "Indoor Photoshoot",
    label: "Indoor Photoshoot",
    tagline: "Controlled Studio Lighting & Backdrops",
    description:
      "Portraits, headshots, family graduation, and editorial fashion shoots inside our fully equipped studio.",
    defaultBufferMinutes: 30,
    badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    accentGradient: "from-indigo-500 to-purple-500",
  },
  "Outdoor Photoshoot": {
    id: "Outdoor Photoshoot",
    label: "Outdoor Photoshoot",
    tagline: "Natural Golden Hour & Scenic Locations",
    description:
      "On-location lifestyle, convocation, couple, and urban/nature portraits with portable lighting.",
    defaultBufferMinutes: 45,
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    accentGradient: "from-emerald-500 to-teal-500",
  },
  Wedding: {
    id: "Wedding",
    label: "Wedding",
    tagline: "Timeless Pre-Wedding, Nikah & Reception",
    description:
      "Intimate solemnization, pre-wedding storytelling, and full-day reception photography packages.",
    defaultBufferMinutes: 60,
    badgeColor: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    accentGradient: "from-pink-500 to-rose-500",
  },
  Sport: {
    id: "Sport",
    label: "Sport",
    tagline: "High-Speed Action, Tournaments & Media Day",
    description:
      "Dynamic athlete portraits, live match sideline coverage, and full sports club media day sessions.",
    defaultBufferMinutes: 45,
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accentGradient: "from-amber-500 to-orange-500",
  },
  Product: {
    id: "Product",
    label: "Product",
    tagline: "E-Commerce Catalog, F&B & Brand Campaigns",
    description:
      "High-precision studio lighting for e-commerce white background, creative flatlays, and commercial lookbooks.",
    defaultBufferMinutes: 25,
    badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    accentGradient: "from-cyan-500 to-blue-500",
  },
};

export interface DefaultServiceSeed {
  name: string;
  category: PhotoshootCategory;
  description: string;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
}

export const DEFAULT_CATEGORY_PACKAGES: DefaultServiceSeed[] = [
  // 1. Indoor Photoshoot
  {
    name: "Studio Portrait & Headshots",
    category: "Indoor Photoshoot",
    description:
      "Professional studio lighting, 2 backdrop changes, and 8 retouched high-resolution portraits.",
    price: 180.0,
    durationMinutes: 60,
    bufferMinutes: 20,
    isActive: true,
  },
  {
    name: "Indoor Family & Graduation Session",
    category: "Indoor Photoshoot",
    description:
      "Warm indoor studio setup for families or graduation groups up to 8 pax, 20 edited photos & all softcopies.",
    price: 350.0,
    durationMinutes: 90,
    bufferMinutes: 30,
    isActive: true,
  },
  {
    name: "Full Studio Editorial & Fashion",
    category: "Indoor Photoshoot",
    description:
      "Creative director assisted studio concept shoot with multi-light setups, 3 outfit changes & 30 retouched images.",
    price: 580.0,
    durationMinutes: 150,
    bufferMinutes: 30,
    isActive: true,
  },

  // 2. Outdoor Photoshoot
  {
    name: "Golden Hour Mini Outdoor",
    category: "Outdoor Photoshoot",
    description:
      "Natural light outdoor portrait or couple session at a scenic park or urban spot with 12 edited high-res photos.",
    price: 250.0,
    durationMinutes: 60,
    bufferMinutes: 45,
    isActive: true,
  },
  {
    name: "Outdoor Lifestyle & Convocation",
    category: "Outdoor Photoshoot",
    description:
      "On-location outdoor shoot across 2 nearby spots, ideal for convocation, couple, or family memories (25 edited photos).",
    price: 420.0,
    durationMinutes: 120,
    bufferMinutes: 45,
    isActive: true,
  },
  {
    name: "Half-Day Location Adventure Shoot",
    category: "Outdoor Photoshoot",
    description:
      "Extended outdoor location exploration with portable strobe lighting, multiple outfits, and 45 master-retouched images.",
    price: 780.0,
    durationMinutes: 240,
    bufferMinutes: 60,
    isActive: true,
  },

  // 3. Wedding
  {
    name: "Intimate Solemnization (Nikah / ROM)",
    category: "Wedding",
    description:
      "Complete coverage of solemnization ceremony, family portraits, and couple portrait session with 150+ edited photos.",
    price: 950.0,
    durationMinutes: 180,
    bufferMinutes: 60,
    isActive: true,
  },
  {
    name: "Pre-Wedding / Engagement Concept",
    category: "Wedding",
    description:
      "Romantic indoor + outdoor pre-wedding session with styling guidance, 2 themes, and 40 signature retouched portraits.",
    price: 1280.0,
    durationMinutes: 240,
    bufferMinutes: 60,
    isActive: true,
  },
  {
    name: "Full Day Wedding Reception & Ceremony",
    category: "Wedding",
    description:
      "Full-day 8-hour storytelling coverage from preparation to reception, 2 photographers, and 400+ high-res edited images.",
    price: 2400.0,
    durationMinutes: 480,
    bufferMinutes: 90,
    isActive: true,
  },

  // 4. Sport
  {
    name: "Athlete Action Portrait Session",
    category: "Sport",
    description:
      "Dramatic high-speed strobe & rim-light athlete portraits in studio or court with 10 high-impact retouched shots.",
    price: 220.0,
    durationMinutes: 60,
    bufferMinutes: 30,
    isActive: true,
  },
  {
    name: "Match / Tournament Live Coverage",
    category: "Sport",
    description:
      "Fast-telephoto sideline action photography for football, badminton, basketball, or motorsport events (80+ action shots).",
    price: 480.0,
    durationMinutes: 120,
    bufferMinutes: 45,
    isActive: true,
  },
  {
    name: "Team & Club Media Day Package",
    category: "Sport",
    description:
      "Complete squad headshots, group banners, and dynamic pose setups for sports clubs, gyms, and fitness brands.",
    price: 850.0,
    durationMinutes: 180,
    bufferMinutes: 60,
    isActive: true,
  },

  // 5. Product
  {
    name: "E-Commerce White Background Pack",
    category: "Product",
    description:
      "Crisp, color-accurate catalog photography for up to 10 products on pure white or solid studio backdrops.",
    price: 200.0,
    durationMinutes: 60,
    bufferMinutes: 20,
    isActive: true,
  },
  {
    name: "Creative Commercial & Flatlay",
    category: "Product",
    description:
      "Styled prop flatlays, textured surfaces, and hero lighting for cosmetics, F&B, or fashion accessories (20 commercial images).",
    price: 450.0,
    durationMinutes: 120,
    bufferMinutes: 30,
    isActive: true,
  },
  {
    name: "Full Brand Campaign & Lookbook",
    category: "Product",
    description:
      "High-end advertising product & model lifestyle integration shoot with custom set design and 35 retouched campaign assets.",
    price: 880.0,
    durationMinutes: 210,
    bufferMinutes: 45,
    isActive: true,
  },
];

export function formatMYR(amount: number | string | { toString(): string } | null | undefined): string {
  if (amount === null || amount === undefined) return "RM 0.00";
  const num = typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  if (isNaN(num)) return "RM 0.00";
  return `RM ${num.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getCategoryBadgeClass(category?: string | null): string {
  if (!category) return CATEGORY_METADATA["Indoor Photoshoot"].badgeColor;
  const meta = CATEGORY_METADATA[category as PhotoshootCategory];
  return meta?.badgeColor || "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

