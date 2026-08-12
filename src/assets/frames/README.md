# Frames

Folder ini berisi asset frame yang digunakan di Photo Editor.

## Format yang didukung
- `.svg` (recommended — scalable)
- `.png` (dengan transparent background, ukuran besar ≥ 1200×1200px)

## Cara menambahkan frame baru
1. Tambahkan file gambar frame ke folder ini
2. Update `index.js` di folder ini untuk mendaftarkan frame baru
3. Frame akan otomatis muncul di pilihan frame editor

## Naming convention
- Gunakan lowercase dengan dash: `polaroid-classic.svg`, `vintage-gold.png`

## Tips desain frame
- Buat dengan area transparan di tengah (tempat foto)
- Ukuran export minimal 1200×1200px untuk kualitas download yang baik
- Gunakan SVG jika memungkinkan agar scalable
