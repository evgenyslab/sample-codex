import type { TagMetadata } from '../types';

// Predefined color palette for tags - visually distinct colors
const TAG_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple
  '#f43f5e', // rose
  '#eab308', // yellow
  '#22c55e', // green
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#fb923c', // orange-400
  '#818cf8', // indigo-400
  '#2dd4bf', // teal-400
];

/**
 * Generates consistent colors for tags based on alphabetical order
 * Only generates colors for tags that have one or more samples
 *
 * @param tags - Array of tag metadata with sample counts
 * @returns Map of tag ID to hex color string
 */
export function generateTagColors(tags: TagMetadata[]): Map<number, string> {
  // Filter to tags with samples and sort alphabetically
  const tagsWithSamples = tags
    .filter(t => t.sample_count > 0 && t.name)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Assign colors based on alphabetical position
  const colorMap = new Map<number, string>();
  tagsWithSamples.forEach((tag, index) => {
    const color = TAG_COLORS[index % TAG_COLORS.length] || '#6b7280'; // Fallback to gray
    colorMap.set(tag.id, color);
  });

  return colorMap;
}
