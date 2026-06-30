# Passport Photo Sheet Designer

A browser-based tool to create passport photo sheets from one or multiple images, with live preview, PDF/image export, and direct printing.

## Features

- Upload multiple images (drag-and-drop, file picker, paste support)
- Set copies per image
- Use default passport presets or custom sizes
- Choose paper size (4x6, 5x7, 6x8, A5, A4, A3, Letter, Legal, Tabloid, Custom)
- Real-time sheet preview with page navigation
- Optional cut marks, crop marks, and rulers
- Export as PNG, JPEG, or PDF
- Print directly from browser
- Frontend-only (no backend), static-host friendly (Netlify/GitHub Pages)

## Project Structure

- `index.html` - App layout and UI structure
- `style.css` - Styling, responsive rules, print styles
- `script.js` - Upload handling, layout logic, preview drawing, export/print logic

## Run Locally

No installation is required.

1. Open `index.html` in a modern browser.
2. Upload photos and configure settings.
3. Export or print the generated sheets.

Tip: A local static server can improve file handling consistency.

## Usage Flow

1. Upload one or more images.
2. Set copies for each image.
3. Select sheet size and passport size (or custom values).
4. Check live preview and page count.
5. Download PNG/JPEG/PDF or print.

## Print and PDF Notes

- For best quality, use PDF export and print at **Actual Size (100%)**.
- If browser print does not show 4x6 directly, use a PDF tool that supports custom paper sizes and set:
  - Width: `4 in` (`101.6 mm`)
  - Height: `6 in` (`152.4 mm`)
- Keep fit/scaling options disabled when exact size output is required.

## Browser Support

Recommended latest versions of:

- Chrome
- Edge
- Firefox

## License

Add your preferred license (MIT, Apache-2.0, etc.) in a `LICENSE` file.
