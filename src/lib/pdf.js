/* ============================================================
   CLIENT-SIDE PDF DOWNLOAD
   Rasterizes the quotation (html2canvas) and slices it across A4
   pages (jsPDF) — no server involved. Unlike a blind height-based
   slice, this looks at every <tr> and every element marked
   `.avoid-break` (the letterhead, client card, each terms section,
   totals, signature block) and only cuts a page at one of those safe
   boundaries, so a row or a section is never split across two pages.
   Trade-off (explained to and accepted by the user): text becomes a
   flattened image rather than the sharp, selectable text the native
   Print-to-PDF twin produces, and very long single rows can still
   force a hard cut if they don't fit on one page at all.
   ============================================================ */

async function loadDeps() {
  // html2canvas-pro (not the original html2canvas) — the original can't
  // parse the oklch()/lab() color functions Tailwind v4's default theme
  // renders into computed styles, and throws instead of drawing.
  const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);
  const JsPDF = jsPdfModule.jsPDF || jsPdfModule.default;
  return { html2canvas, JsPDF };
}

export async function downloadQuotationPdf(element, filename, { orientation = 'portrait' } = {}) {
  if (!element) throw new Error('Nothing to export');
  const { html2canvas, JsPDF } = await loadDeps();

  // Measure every row/section boundary in the LIVE, currently-displayed
  // DOM first (in CSS px, relative to `element`) — deliberately not
  // overriding html2canvas's windowWidth, so the clone it rasterizes
  // reflows identically to what's on screen right now and these
  // measurements line up with the pixels it produces.
  const elementRectBefore = element.getBoundingClientRect();
  const rawBreaks = [0, element.scrollHeight];
  element.querySelectorAll('tr, .avoid-break').forEach(el => {
    const r = el.getBoundingClientRect();
    rawBreaks.push(r.top - elementRectBefore.top);
    rawBreaks.push(r.bottom - elementRectBefore.top);
  });

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  // canvas.height should be element.scrollHeight * scale, but derive the
  // real ratio from what html2canvas actually produced rather than
  // assuming it, so any small internal rounding still lines up.
  const scaleFactor = canvas.height / element.scrollHeight;
  const safeBreaksPx = rawBreaks.map(b => Math.round(b * scaleFactor)).sort((a, b) => a - b);

  const pdf = new JsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const pxPerMm = canvas.width / pageWidthMm;
  const pageHeightPx = pageHeightMm * pxPerMm;

  let cursor = 0;
  let firstPage = true;
  const totalHeight = canvas.height;
  let guard = 0;

  while (cursor < totalHeight - 1 && guard < 500) {
    guard += 1;
    const idealEnd = cursor + pageHeightPx;
    let sliceEnd;
    if (idealEnd >= totalHeight) {
      sliceEnd = totalHeight;
    } else {
      const candidates = safeBreaksPx.filter(b => b > cursor + 4 && b <= idealEnd);
      sliceEnd = candidates.length ? candidates[candidates.length - 1] : idealEnd;
    }
    const sliceHeight = Math.max(1, Math.round(sliceEnd - cursor));

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, cursor, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
    if (!firstPage) pdf.addPage();
    const sliceHeightMm = sliceHeight / pxPerMm;
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, sliceHeightMm);
    firstPage = false;
    cursor = sliceEnd;
  }

  pdf.save(filename);
}
