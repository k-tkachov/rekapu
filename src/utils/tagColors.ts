// Expanded palette of readable colors for tags (35 colors to minimize repetition)
const TAG_COLOR_PALETTE = [
  // Primary vibrant colors
  '#ef4444', // red-500
  '#f97316', // orange-500  
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  
  // Darker variants for more options
  '#dc2626', // red-600
  '#ea580c', // orange-600
  '#d97706', // amber-600
  '#ca8a04', // yellow-600
  '#65a30d', // lime-600
  '#16a34a', // green-600
  '#059669', // emerald-600
  '#0d9488', // teal-600
  '#0891b2', // cyan-600
  '#0284c7', // sky-600
  '#2563eb', // blue-600
  '#4f46e5', // indigo-600
  '#7c3aed', // violet-600
  '#9333ea', // purple-600
  '#c026d3', // fuchsia-600
  '#db2777', // pink-600
  '#e11d48', // rose-600
];

// Cache to ensure consistent colors for tag names
const tagColorCache = new Map<string, string>();

/**
 * Generate a consistent random color for a tag name
 * Uses a simple hash function to ensure the same tag always gets the same color
 * With 35 colors in the palette, repetition only occurs after 35+ unique tags
 */
export function getTagColor(tagName: string): string {
  // Check cache first
  if (tagColorCache.has(tagName)) {
    return tagColorCache.get(tagName)!;
  }
  
  // Generate a simple hash from the tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    const char = tagName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use hash to select color from palette
  const colorIndex = Math.abs(hash) % TAG_COLOR_PALETTE.length;
  const color = TAG_COLOR_PALETTE[colorIndex];
  
  // Cache the result
  tagColorCache.set(tagName, color);
  
  return color;
}

/**
 * Get a truly random color from the palette (for formal tag creation)
 */
export function getRandomTagColor(): string {
  const randomIndex = Math.floor(Math.random() * TAG_COLOR_PALETTE.length);
  return TAG_COLOR_PALETTE[randomIndex];
}
