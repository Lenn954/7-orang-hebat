/**
 * Sticker Registry
 *
 * Register all stickers here. Each sticker needs:
 * - id: unique identifier
 * - label: display name
 * - src: imported image or emoji string
 * - type: 'emoji' | 'image'
 *
 * To add a new image sticker:
 * 1. Place the image file in this folder (src/assets/stickers/)
 * 2. Import it below
 * 3. Add it to the STICKERS array
 *
 * Example:
 *   import mySticker from './my-sticker.svg';
 *   { id: 'my-sticker', label: 'My Sticker', src: mySticker, type: 'image' }
 */

// -- Import custom sticker images here --
// import heartRed from './heart-red.svg';
// import starGold from './star-gold.svg';

/**
 * Default emoji stickers (built-in, no files needed)
 */
const DEFAULT_EMOJI_STICKERS = [
  { id: 'heart', label: 'Heart', src: '❤️', type: 'emoji' },
  { id: 'star', label: 'Star', src: '⭐', type: 'emoji' },
  { id: 'flower', label: 'Flower', src: '🌸', type: 'emoji' },
  { id: 'ribbon', label: 'Ribbon', src: '🎀', type: 'emoji' },
  { id: 'sparkle', label: 'Sparkle', src: '✨', type: 'emoji' },
  { id: 'butterfly', label: 'Butterfly', src: '🦋', type: 'emoji' },
  { id: 'speech', label: 'Speech', src: '💬', type: 'emoji' },
  { id: 'pin', label: 'Pin', src: '📌', type: 'emoji' },
  { id: 'rainbow', label: 'Rainbow', src: '🌈', type: 'emoji' },
  { id: 'pink-heart', label: 'Pink Heart', src: '💖', type: 'emoji' },
  { id: 'clover', label: 'Clover', src: '🍀', type: 'emoji' },
  { id: 'music', label: 'Music', src: '🎵', type: 'emoji' },
];

/**
 * Custom image stickers (add your own here!)
 * Uncomment and modify as needed.
 */
const CUSTOM_IMAGE_STICKERS = [
  // { id: 'heart-red', label: 'Red Heart', src: heartRed, type: 'image' },
  // { id: 'star-gold', label: 'Gold Star', src: starGold, type: 'image' },
];

/**
 * All available stickers — combines defaults + custom
 */
export const STICKERS = [...DEFAULT_EMOJI_STICKERS, ...CUSTOM_IMAGE_STICKERS];

export default STICKERS;
