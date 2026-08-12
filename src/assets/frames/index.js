/**
 * Frame Registry
 *
 * Register all frames here. Each frame needs:
 * - type: unique identifier (used as CSS class suffix)
 * - label: display name in the editor
 * - icon: emoji icon for the toolbar
 * - renderType: 'css' | 'image'
 * - src: imported image path (only for 'image' type)
 *
 * CSS frames are rendered via CSS classes in EditorPage.css.
 * Image frames are rendered as an overlay <img> on top of the photo.
 *
 * To add a new image frame:
 * 1. Place the frame image in this folder (src/assets/frames/)
 * 2. Import it below
 * 3. Add it to the CUSTOM_IMAGE_FRAMES array
 * 4. The frame image should have a transparent center where the photo shows through
 *
 * Example:
 *   import goldenFrame from './golden-ornate.png';
 *   { type: 'golden-ornate', label: 'Golden Ornate', icon: '👑', renderType: 'image', src: goldenFrame }
 */

// -- Import custom frame images here --
// import goldenFrame from './golden-ornate.png';
// import floralBorder from './floral-border.svg';

/**
 * Default CSS-rendered frames (built-in, no image files needed)
 */
const DEFAULT_CSS_FRAMES = [
  { type: null, label: 'None', icon: '⬜', renderType: 'css' },
  { type: 'polaroid', label: 'Polaroid', icon: '🖼️', renderType: 'css' },
  { type: 'vintage', label: 'Vintage', icon: '📜', renderType: 'css' },
  { type: 'floral', label: 'Floral', icon: '🌸', renderType: 'css' },
  { type: 'minimal', label: 'Minimal', icon: '▪️', renderType: 'css' },
  { type: 'scrapbook', label: 'Scrapbook', icon: '📌', renderType: 'css' },
];

/**
 * Custom image-based frames (add your own here!)
 * Uncomment and modify as needed.
 */
const CUSTOM_IMAGE_FRAMES = [
  // { type: 'golden-ornate', label: 'Golden Ornate', icon: '👑', renderType: 'image', src: goldenFrame },
  // { type: 'floral-border', label: 'Floral Border', icon: '🌺', renderType: 'image', src: floralBorder },
];

/**
 * All available frames — combines defaults + custom
 */
export const FRAMES = [...DEFAULT_CSS_FRAMES, ...CUSTOM_IMAGE_FRAMES];

export default FRAMES;
