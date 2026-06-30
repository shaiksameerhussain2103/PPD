(() => {
  'use strict';

  const MM_PER_INCH = 25.4;
  const PREVIEW_DPI = 96;
  const EXPORT_DPI = 300;
  const MARGIN_MM = 2;
  const GAP_MM = 1;

  const paperSizes = {
    photo_4x6: { id: 'photo_4x6', name: '4x6 Photo Paper (Default)', width: 4, height: 6, unit: 'in' },
    photo_5x7: { id: 'photo_5x7', name: '5x7', width: 5, height: 7, unit: 'in' },
    photo_6x8: { id: 'photo_6x8', name: '6x8', width: 6, height: 8, unit: 'in' },
    a5: { id: 'a5', name: 'A5', width: 148, height: 210, unit: 'mm' },
    a4: { id: 'a4', name: 'A4', width: 210, height: 297, unit: 'mm' },
    a3: { id: 'a3', name: 'A3', width: 297, height: 420, unit: 'mm' },
    letter: { id: 'letter', name: 'Letter', width: 8.5, height: 11, unit: 'in' },
    legal: { id: 'legal', name: 'Legal', width: 8.5, height: 14, unit: 'in' },
    tabloid: { id: 'tabloid', name: 'Tabloid', width: 11, height: 17, unit: 'in' },
    custom: { id: 'custom', name: 'Custom', width: 210, height: 297, unit: 'mm' }
  };

  const passportPresets = {
    indian: { id: 'indian', name: 'Indian Passport (35x45 mm)', width: 35, height: 45, unit: 'mm' },
    us: { id: 'us', name: 'US Passport (2x2 inch)', width: 2, height: 2, unit: 'in' },
    visa: { id: 'visa', name: 'Visa', width: 35, height: 45, unit: 'mm' },
    stamp: { id: 'stamp', name: 'Stamp Size', width: 22, height: 22, unit: 'mm' },
    custom: { id: 'custom', name: 'Custom', width: 35, height: 45, unit: 'mm' }
  };

  const state = {
    images: [],
    pageIndex: 0,
    previewPages: [],
    showCutMarks: true,
    showCropMarks: true,
    showRulers: false,
    stats: {
      totalImages: 0,
      totalCopies: 0,
      utilization: 0,
      remaining: 100,
      paper: '4x6',
      printSize: '35x45 mm'
    }
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cache();
    fillSelect(els.paperSizeSelect, paperSizes, 'photo_4x6');
    fillSelect(els.passportPresetSelect, passportPresets, 'indian');
    bind();
    syncCustomFields();
    renderImageCards();
    renderPreview();
  }

  function cache() {
    [
      'uploadStep', 'dropZone', 'fileInput', 'browseBtn', 'clearAllBtn',
      'imageRows', 'imageCountText',
      'paperSizeSelect', 'paperUnitSelect', 'paperWidthInput', 'paperHeightInput',
      'paperUnitWrap', 'paperWidthWrap', 'paperHeightWrap',
      'passportPresetSelect', 'passportUnitSelect', 'passportWidthInput', 'passportHeightInput',
      'passportUnitWrap', 'passportWidthWrap', 'passportHeightWrap',
      'showCutMarks', 'showCropMarks', 'showRulers',
      'sheetCanvas', 'prevPageBtn', 'nextPageBtn', 'pageIndicator', 'previewMeta',
      'downloadPngBtn', 'downloadJpegBtn', 'downloadPdfBtn', 'printBtn', 'printPages'
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
    els.ctx = els.sheetCanvas.getContext('2d');
  }

  function bind() {
    els.browseBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    ['dragenter', 'dragover'].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.dropZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.dropZone.classList.remove('dragover');
      });
    });
    els.dropZone.addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));
    document.addEventListener('paste', (event) => {
      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      handleFiles([file]);
    });

    els.paperSizeSelect.addEventListener('change', () => {
      syncCustomFields();
      renderPreview();
    });
    els.passportPresetSelect.addEventListener('change', () => {
      syncCustomFields();
      renderPreview();
      renderStats();
    });
    ['paperUnitSelect', 'paperWidthInput', 'paperHeightInput', 'passportUnitSelect', 'passportWidthInput', 'passportHeightInput']
      .forEach((id) => els[id].addEventListener('input', () => {
        renderPreview();
      }));

    els.showCutMarks.addEventListener('change', () => {
      state.showCutMarks = els.showCutMarks.checked;
      renderPreview();
    });
    els.showCropMarks.addEventListener('change', () => {
      state.showCropMarks = els.showCropMarks.checked;
      renderPreview();
    });
    els.showRulers.addEventListener('change', () => {
      state.showRulers = els.showRulers.checked;
      renderPreview();
    });

    els.prevPageBtn.addEventListener('click', () => {
      state.pageIndex = Math.max(0, state.pageIndex - 1);
      renderPreview();
    });
    els.nextPageBtn.addEventListener('click', () => {
      state.pageIndex = Math.min(Math.max(0, state.previewPages.length - 1), state.pageIndex + 1);
      renderPreview();
    });

    els.clearAllBtn.addEventListener('click', clearAll);
    els.downloadPngBtn.addEventListener('click', () => exportRaster('png'));
    els.downloadJpegBtn.addEventListener('click', () => exportRaster('jpeg'));
    els.downloadPdfBtn.addEventListener('click', exportPdf);
    els.printBtn.addEventListener('click', printSheets);

    window.addEventListener('resize', renderPreview);
  }

  function fillSelect(select, source, selectedId) {
    select.innerHTML = '';
    Object.values(source).forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      option.selected = item.id === selectedId;
      select.appendChild(option);
    });
  }

  function syncCustomFields() {
    const paperCustom = els.paperSizeSelect.value === 'custom';
    els.paperUnitWrap.classList.toggle('hidden', !paperCustom);
    els.paperWidthWrap.classList.toggle('hidden', !paperCustom);
    els.paperHeightWrap.classList.toggle('hidden', !paperCustom);
    if (paperCustom) {
      if (!els.paperWidthInput.value) els.paperWidthInput.value = '210';
      if (!els.paperHeightInput.value) els.paperHeightInput.value = '297';
      if (!els.paperUnitSelect.value) els.paperUnitSelect.value = 'mm';
    }

    const passportCustom = els.passportPresetSelect.value === 'custom';
    els.passportUnitWrap.classList.toggle('hidden', !passportCustom);
    els.passportWidthWrap.classList.toggle('hidden', !passportCustom);
    els.passportHeightWrap.classList.toggle('hidden', !passportCustom);
    if (passportCustom) {
      if (!els.passportWidthInput.value) els.passportWidthInput.value = '35';
      if (!els.passportHeightInput.value) els.passportHeightInput.value = '45';
      if (!els.passportUnitSelect.value) els.passportUnitSelect.value = 'mm';
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadImage(dataUrl);
      state.images.push({
        id: cryptoId(),
        file,
        fileName: file.name,
        dataUrl,
        image,
        copies: 1,
        widthInput: '',
        heightInput: '',
        overrideUnit: 'mm',
        aspectLocked: false
      });
    }
    els.uploadStep.classList.add('minimized');
    els.fileInput.value = '';
    renderImageCards();
    renderPreview();
  }

  function renderImageCards() {
    els.imageRows.innerHTML = '';
    els.imageCountText.textContent = `${state.images.length} different image${state.images.length === 1 ? '' : 's'}`;

    if (!state.images.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-row';
      empty.textContent = 'Upload photos to create image cards automatically.';
      els.imageRows.appendChild(empty);
      renderStats();
      return;
    }

    state.images.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'image-row';
      row.innerHTML = `
        <div class="image-cell">
          <img class="row-thumb" src="${escapeHtmlAttr(item.dataUrl)}" alt="${escapeHtmlAttr(item.fileName)} preview" />
          <div class="row-name">
            <strong>${escapeHtml(item.fileName)}</strong>
            <small>${item.image.naturalWidth} x ${item.image.naturalHeight} px</small>
          </div>
        </div>
        <div>
          <input type="number" min="1" step="1" data-id="${item.id}" data-field="copies" value="${item.copies}" aria-label="Copies" />
        </div>
        <div class="row-size">
          <input type="number" min="0" step="0.1" data-id="${item.id}" data-field="widthInput" value="${item.widthInput}" placeholder="Width" aria-label="Width" />
          <input type="number" min="0" step="0.1" data-id="${item.id}" data-field="heightInput" value="${item.heightInput}" placeholder="Height" aria-label="Height" />
          <select data-id="${item.id}" data-field="overrideUnit" aria-label="Unit">
            <option value="mm" ${item.overrideUnit === 'mm' ? 'selected' : ''}>mm</option>
            <option value="cm" ${item.overrideUnit === 'cm' ? 'selected' : ''}>cm</option>
            <option value="in" ${item.overrideUnit === 'in' ? 'selected' : ''}>inch</option>
          </select>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" data-action="replace" data-id="${item.id}" type="button">Replace</button>
          <button class="btn btn-ghost" data-action="delete" data-id="${item.id}" type="button">Delete</button>
        </div>
      `;
      els.imageRows.appendChild(row);
    });

    els.imageRows.querySelectorAll('[data-field]').forEach((input) => {
      input.addEventListener('input', () => {
        const id = input.dataset.id;
        const field = input.dataset.field;
        const image = state.images.find((item) => item.id === id);
        if (!image) return;

        if (input.type === 'checkbox') {
          image[field] = input.checked;
        } else if (field === 'copies') {
          image.copies = Math.max(1, Number(input.value) || 1);
        } else {
          image[field] = input.value;
        }

        renderPreview();
      });
    });

    els.imageRows.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleCardAction(btn.dataset.action, btn.dataset.id));
    });

    renderStats();
  }

  function handleCardAction(action, id) {
    const idx = state.images.findIndex((item) => item.id === id);
    if (idx < 0) return;
    const image = state.images[idx];

    if (action === 'delete') {
      state.images.splice(idx, 1);
      if (!state.images.length) els.uploadStep.classList.remove('minimized');
      state.pageIndex = 0;
      renderImageCards();
      renderPreview();
      return;
    }

    if (action === 'replace') {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.onchange = async () => {
        const file = picker.files?.[0];
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        const img = await loadImage(dataUrl);
        image.file = file;
        image.fileName = file.name;
        image.dataUrl = dataUrl;
        image.image = img;
        renderImageCards();
        renderPreview();
      };
      picker.click();
    }
  }

  function clearAll() {
    state.images = [];
    state.pageIndex = 0;
    els.paperSizeSelect.value = 'photo_4x6';
    els.passportPresetSelect.value = 'indian';
    els.paperWidthInput.value = '';
    els.paperHeightInput.value = '';
    els.passportWidthInput.value = '';
    els.passportHeightInput.value = '';
    els.uploadStep.classList.remove('minimized');
    syncCustomFields();
    renderImageCards();
    renderPreview();
  }

  function getPaperSetting() {
    const selected = paperSizes[els.paperSizeSelect.value] || paperSizes.photo_4x6;
    if (selected.id !== 'custom') return selected;
    return {
      id: 'custom',
      name: 'Custom',
      width: Number(els.paperWidthInput.value) || 210,
      height: Number(els.paperHeightInput.value) || 297,
      unit: els.paperUnitSelect.value || 'mm'
    };
  }

  function getPassportSetting() {
    const selected = passportPresets[els.passportPresetSelect.value] || passportPresets.indian;
    if (selected.id !== 'custom') return selected;
    return {
      id: 'custom',
      name: 'Custom',
      width: Number(els.passportWidthInput.value) || 35,
      height: Number(els.passportHeightInput.value) || 45,
      unit: els.passportUnitSelect.value || 'mm'
    };
  }

  function createLayoutPages(dpi) {
    const paper = getPaperSetting();
    const pageW = mmToPx(unitToMm(paper.width, paper.unit), dpi);
    const pageH = mmToPx(unitToMm(paper.height, paper.unit), dpi);
    const margin = mmToPx(MARGIN_MM, dpi);
    const gap = mmToPx(GAP_MM, dpi);
    const defaultPassport = getPassportSetting();

    const tiles = [];
    state.images.forEach((img) => {
      const widthMm = img.widthInput ? unitToMm(Number(img.widthInput), img.overrideUnit) : unitToMm(defaultPassport.width, defaultPassport.unit);
      const heightMm = img.heightInput ? unitToMm(Number(img.heightInput), img.overrideUnit) : unitToMm(defaultPassport.height, defaultPassport.unit);
      const tileW = Math.max(1, mmToPx(widthMm, dpi));
      const tileH = Math.max(1, mmToPx(heightMm, dpi));
      for (let copy = 0; copy < Math.max(1, Number(img.copies) || 1); copy += 1) {
        tiles.push({ img, tileW, tileH });
      }
    });

    tiles.sort((a, b) => b.tileH * b.tileW - a.tileH * a.tileW);

    const usable = {
      x: margin,
      y: margin,
      w: Math.max(1, pageW - margin * 2),
      h: Math.max(1, pageH - margin * 2)
    };

    const pages = [];
    let currentPage = createEmptyPage(usable);

    tiles.forEach((tile) => {
      const placed = placeTileInPage(currentPage, tile, gap);
      if (!placed) {
        pages.push(currentPage);
        currentPage = createEmptyPage(usable);
        const fallbackPlaced = placeTileInPage(currentPage, tile, gap);
        if (!fallbackPlaced) {
          const clipped = {
            ...tile,
            x: usable.x,
            y: usable.y,
            tileW: Math.min(tile.tileW, usable.w),
            tileH: Math.min(tile.tileH, usable.h),
            rotated: false
          };
          currentPage.items.push(clipped);
        }
      }
    });

    if (currentPage.items.length || !pages.length) pages.push(currentPage);
    return { pages, pageW, pageH, margin, paperLabel: paper.name, defaultPassport };
  }

  function createEmptyPage(usableRect) {
    return {
      items: [],
      freeRects: [{ x: usableRect.x, y: usableRect.y, w: usableRect.w, h: usableRect.h }]
    };
  }

  function placeTileInPage(page, tile, gap) {
    let best = null;
    page.freeRects.forEach((rect, rectIndex) => {
      const options = [
        { w: tile.tileW, h: tile.tileH, rotated: false },
        { w: tile.tileH, h: tile.tileW, rotated: true }
      ];
      options.forEach((opt) => {
        if (opt.w <= rect.w && opt.h <= rect.h) {
          const waste = rect.w * rect.h - opt.w * opt.h;
          const shortSideLeftover = Math.min(rect.w - opt.w, rect.h - opt.h);
          if (
            !best ||
            waste < best.waste ||
            (waste === best.waste && shortSideLeftover < best.shortSideLeftover)
          ) {
            best = { rectIndex, rect, opt, waste, shortSideLeftover };
          }
        }
      });
    });

    if (!best) return false;

    const placed = {
      ...tile,
      x: best.rect.x,
      y: best.rect.y,
      tileW: best.opt.w,
      tileH: best.opt.h,
      rotated: best.opt.rotated
    };
    page.items.push(placed);

    splitFreeRects(page, best.rectIndex, placed, gap);
    pruneContainedFreeRects(page);
    return true;
  }

  function splitFreeRects(page, usedRectIndex, placed, gap) {
    const used = page.freeRects[usedRectIndex];
    const px = placed.x;
    const py = placed.y;
    const pw = placed.tileW;
    const ph = placed.tileH;

    page.freeRects.splice(usedRectIndex, 1);

    const right = {
      x: px + pw + gap,
      y: used.y,
      w: used.x + used.w - (px + pw + gap),
      h: used.h
    };
    const bottom = {
      x: used.x,
      y: py + ph + gap,
      w: used.w,
      h: used.y + used.h - (py + ph + gap)
    };
    const left = {
      x: used.x,
      y: used.y,
      w: px - used.x - gap,
      h: used.h
    };
    const top = {
      x: used.x,
      y: used.y,
      w: used.w,
      h: py - used.y - gap
    };

    [right, bottom, left, top].forEach((rect) => {
      if (rect.w > 1 && rect.h > 1) {
        page.freeRects.push(rect);
      }
    });
  }

  function pruneContainedFreeRects(page) {
    page.freeRects = page.freeRects.filter((rect, index, all) => {
      return !all.some((other, otherIndex) => {
        if (index === otherIndex) return false;
        return rect.x >= other.x && rect.y >= other.y && rect.x + rect.w <= other.x + other.w && rect.y + rect.h <= other.y + other.h;
      });
    });
  }

  function renderPreview() {
    const layout = createLayoutPages(PREVIEW_DPI);
    state.previewPages = layout.pages;
    state.pageIndex = clamp(state.pageIndex, 0, Math.max(0, layout.pages.length - 1));

    const dpr = window.devicePixelRatio || 1;
    const page = layout.pages[state.pageIndex] || { items: [] };
    els.sheetCanvas.width = Math.round(layout.pageW * dpr);
    els.sheetCanvas.height = Math.round(layout.pageH * dpr);
    els.sheetCanvas.style.width = `${layout.pageW}px`;
    els.sheetCanvas.style.height = `${layout.pageH}px`;

    const ctx = els.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPage(ctx, page, layout.pageW, layout.pageH, layout.margin, PREVIEW_DPI);

    els.pageIndicator.textContent = `Page ${state.pageIndex + 1} / ${Math.max(1, layout.pages.length)}`;
    els.previewMeta.textContent = page.items.length
      ? `${page.items.length} photo copies on this page, ${layout.pages.length} total page${layout.pages.length > 1 ? 's' : ''}`
      : 'Upload images to generate your live layout.';

    renderStats(layout);
  }

  function drawPage(ctx, page, pageW, pageH, margin, dpi) {
    ctx.clearRect(0, 0, pageW, pageH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageW, pageH);

    ctx.strokeStyle = 'rgba(19, 31, 47, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0.5, 0.5, pageW - 1, pageH - 1);

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(10, 124, 134, 0.3)';
    ctx.strokeRect(margin, margin, pageW - margin * 2, pageH - margin * 2);
    ctx.restore();

    if (state.showRulers) {
      drawRulers(ctx, pageW, pageH, dpi);
    }

    page.items.forEach((entry) => {
      drawPhoto(ctx, entry.img.image, entry.x, entry.y, entry.tileW, entry.tileH);
      if (state.showCropMarks) {
        ctx.save();
        ctx.strokeStyle = 'rgba(14, 124, 134, 0.6)';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(entry.x, entry.y, entry.tileW, entry.tileH);
        ctx.restore();
      }
      if (state.showCutMarks) {
        drawCutMarks(ctx, entry.x, entry.y, entry.tileW, entry.tileH, mmToPx(2.3, dpi));
      }
    });
  }

  function drawRulers(ctx, pageW, pageH, dpi) {
    const step = mmToPx(10, dpi);
    ctx.save();
    ctx.strokeStyle = 'rgba(19, 31, 47, 0.2)';
    ctx.fillStyle = 'rgba(19, 31, 47, 0.5)';
    ctx.font = '10px "Segoe UI"';
    for (let x = 0; x < pageW; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, 10);
      ctx.stroke();
      ctx.fillText(String(Math.round(pxToMm(x, dpi))), x + 2, 12);
    }
    for (let y = 0; y < pageH; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(10, y + 0.5);
      ctx.stroke();
      ctx.fillText(String(Math.round(pxToMm(y, dpi))), 12, y + 10);
    }
    ctx.restore();
  }

  function drawPhoto(ctx, image, x, y, w, h) {
    const imgRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = w / h;
    let drawW = w;
    let drawH = h;
    let dx = x;
    let dy = y;
    if (imgRatio > boxRatio) {
      drawH = w / imgRatio;
      dy += (h - drawH) * 0.5;
    } else {
      drawW = h * imgRatio;
      dx += (w - drawW) * 0.5;
    }
    ctx.drawImage(image, dx, dy, drawW, drawH);
  }

  function drawCutMarks(ctx, x, y, w, h, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.46)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size, y); ctx.lineTo(x, y);
    ctx.moveTo(x, y - size); ctx.lineTo(x, y);
    ctx.moveTo(x + w, y - size); ctx.lineTo(x + w, y);
    ctx.moveTo(x + w, y); ctx.lineTo(x + w + size, y);
    ctx.moveTo(x - size, y + h); ctx.lineTo(x, y + h);
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + h + size);
    ctx.moveTo(x + w, y + h); ctx.lineTo(x + w + size, y + h);
    ctx.moveTo(x + w, y + h); ctx.lineTo(x + w, y + h + size);
    ctx.stroke();
    ctx.restore();
  }

  function renderStats(layout = null) {
    const effectiveLayout = layout || createLayoutPages(PREVIEW_DPI);
    const paper = getPaperSetting();
    const passport = getPassportSetting();
    const totalCopies = state.images.reduce((sum, item) => sum + Math.max(1, Number(item.copies) || 1), 0);

    let occupied = 0;
    effectiveLayout.pages.forEach((page) => {
      page.items.forEach((entry) => {
        occupied += entry.tileW * entry.tileH;
      });
    });

    const pageArea = effectiveLayout.pageW * effectiveLayout.pageH * Math.max(1, effectiveLayout.pages.length);
    const utilization = pageArea ? (occupied / pageArea) * 100 : 0;

    const allSizes = new Set(
      state.images.map((img) => {
        const w = img.widthInput ? `${img.widthInput}${img.overrideUnit}` : `${passport.width}${passport.unit}`;
        const h = img.heightInput ? `${img.heightInput}${img.overrideUnit}` : `${passport.height}${passport.unit}`;
        return `${w}x${h}`;
      })
    );

    state.stats.totalImages = state.images.length;
    state.stats.totalCopies = totalCopies;
    state.stats.paper = paper.name;
    state.stats.printSize = allSizes.size <= 1 ? `${passport.width}x${passport.height} ${passport.unit}` : 'Mixed sizes';
    state.stats.utilization = utilization;
    state.stats.remaining = Math.max(0, 100 - utilization);
  }

  function exportRaster(format) {
    const layout = createLayoutPages(EXPORT_DPI);
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = format === 'png' ? 'png' : 'jpg';

    layout.pages.forEach((page, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = layout.pageW;
      canvas.height = layout.pageH;
      const ctx = canvas.getContext('2d');
      drawPage(ctx, page, layout.pageW, layout.pageH, layout.margin, EXPORT_DPI);
      const dataUrl = canvas.toDataURL(mime, format === 'png' ? 1 : 0.97);
      downloadDataUrl(dataUrl, `passport-sheet-page-${index + 1}.${ext}`);
    });
  }

  function exportPdf() {
    const layout = createLayoutPages(EXPORT_DPI);
    const images = layout.pages.map((page) => {
      const canvas = document.createElement('canvas');
      canvas.width = layout.pageW;
      canvas.height = layout.pageH;
      const ctx = canvas.getContext('2d');
      drawPage(ctx, page, layout.pageW, layout.pageH, layout.margin, EXPORT_DPI);
      return canvas.toDataURL('image/jpeg', 0.98).split(',')[1];
    });
    const pdfBytes = buildPdfFromImages(images, layout.pageW, layout.pageH, EXPORT_DPI);
    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'passport-photo-sheets.pdf');
  }

  function printSheets() {
    const layout = createLayoutPages(EXPORT_DPI);
    els.printPages.innerHTML = '';
    layout.pages.forEach((page) => {
      const canvas = document.createElement('canvas');
      canvas.width = layout.pageW;
      canvas.height = layout.pageH;
      const ctx = canvas.getContext('2d');
      drawPage(ctx, page, layout.pageW, layout.pageH, layout.margin, EXPORT_DPI);
      const wrapper = document.createElement('div');
      wrapper.className = 'print-page';
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      wrapper.appendChild(img);
      els.printPages.appendChild(wrapper);
    });
    window.print();
  }

  function buildPdfFromImages(base64Images, widthPx, heightPx, dpi) {
    const widthPt = (widthPx / dpi) * 72;
    const heightPt = (heightPx / dpi) * 72;
    const objects = ['', ''];
    const pages = [];

    const addObj = (body) => {
      const index = objects.length + 1;
      objects.push(`${index} 0 obj\n${body}\nendobj\n`);
      return index;
    };

    base64Images.forEach((image, index) => {
      const bytes = base64ToUint8Array(image);
      const imageObj = addObj(`<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n${uint8ArrayToBinary(bytes)}\nendstream`);
      const stream = `q\n${widthPt} 0 0 ${heightPt} 0 0 cm\n/Im${index} Do\nQ`;
      const contentObj = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const pageObj = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /XObject << /Im${index} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
      pages.push(pageObj);
    });

    objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pages.map((p) => `${p} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`;
    objects[0] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((obj) => {
      offsets.push(pdf.length);
      pdf += obj;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((off) => {
      pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new TextEncoder().encode(pdf);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  function downloadDataUrl(dataUrl, name) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = name;
    link.click();
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function mmToPx(mm, dpi) {
    return (mm / MM_PER_INCH) * dpi;
  }

  function pxToMm(px, dpi) {
    return (px / dpi) * MM_PER_INCH;
  }

  function unitToMm(value, unit) {
    const numeric = Number(value) || 0;
    if (unit === 'cm') return numeric * 10;
    if (unit === 'in') return numeric * MM_PER_INCH;
    return numeric;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cryptoId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  function escapeHtmlAttr(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function uint8ArrayToBinary(bytes) {
    let out = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return out;
  }
})();
