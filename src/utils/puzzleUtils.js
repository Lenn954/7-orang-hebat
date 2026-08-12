/**
 * puzzleUtils.js
 * Utility functions for puzzle logic: slicing images, shuffling, and checking completion.
 */

/**
 * Slice an image (data URL) into a grid of pieces.
 * @param {string} imageSrc - Data URL of the captured image
 * @param {number} gridSize - Number of rows/cols (3 or 4)
 * @returns {Promise<Array<{id: number, dataUrl: string, correctIndex: number}>>}
 */
export async function sliceImage(imageSrc, gridSize) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const pieces = [];
      // Use the smaller dimension to make a square crop
      const size = Math.min(img.width, img.height);
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      const pieceSize = size / gridSize;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = pieceSize;
          canvas.height = pieceSize;

          ctx.drawImage(
            img,
            offsetX + col * pieceSize,
            offsetY + row * pieceSize,
            pieceSize,
            pieceSize,
            0,
            0,
            pieceSize,
            pieceSize
          );

          const index = row * gridSize + col;
          pieces.push({
            id: index,
            dataUrl: canvas.toDataURL('image/jpeg', 0.9),
            correctIndex: index,
          });
        }
      }

      resolve(pieces);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * Ensures no piece stays in its original position.
 * @param {Array} array
 * @returns {Array}
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  let isSamePosition = true;

  while (isSamePosition) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Check that at least some pieces moved
    isSamePosition = shuffled.every((piece, index) => piece.correctIndex === index);
  }

  return shuffled;
}

/**
 * Check if all pieces are in their correct positions.
 * @param {Array} pieces - Current arrangement of pieces
 * @returns {boolean}
 */
export function isPuzzleComplete(pieces) {
  return pieces.every((piece, index) => piece.correctIndex === index);
}
