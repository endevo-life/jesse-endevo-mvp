import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, RGB, PDFImage,
         pushGraphicsState, popGraphicsState, clip, endPath,
         appendBezierCurve, moveTo, closePath } from 'pdf-lib';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { PDFGenerationParams, DomainScores } from '../types/index';

// ── Brand colours ─────────────────────────────────────────────────────────────
const NAVY    = rgb(0.106, 0.165, 0.290); // #1B2A4A
const ORANGE  = rgb(0.910, 0.396, 0.102); // #E8651A
const WHITE   = rgb(1, 1, 1);
const LGREY   = rgb(0.925, 0.929, 0.937); // #ECEEEf
const MGREY   = rgb(0.557, 0.604, 0.651); // #8E9AA6
const BLACK   = rgb(0.11,  0.11,  0.11);
const LORANGE = rgb(0.996, 0.949, 0.929); // very light orange tint for NOTE bg

// Domain chart colours
const DOMAIN_COLORS: Record<keyof DomainScores, RGB> = {
  access_ownership:    rgb(0.290, 0.565, 0.851),
  data_loss:           rgb(0.176, 0.831, 0.745),
  platform_limitation: rgb(0.910, 0.396, 0.102),
  stewardship:         rgb(0.133, 0.773, 0.369),
};

const DOMAIN_LABELS: Record<keyof DomainScores, string> = {
  access_ownership:    'Your Logins & Accounts',
  data_loss:           'Your Files & Memories',
  platform_limitation: 'Your Apps & Platforms',
  stewardship:         'Sharing Your Digital Life',
};

const DOMAIN_MAX: DomainScores = {
  access_ownership:    40,
  data_loss:           20,
  platform_limitation: 20,
  stewardship:         20,
};

const TIER_COLORS: Record<string, RGB> = {
  'Peace Champion':  rgb(0.133, 0.773, 0.369),
  'On Your Way':     rgb(0.290, 0.565, 0.851),
  'Getting Clarity': rgb(0.910, 0.396, 0.102),
  'Starting Fresh':  rgb(0.659, 0.333, 0.969),
};

// ── Asset loaders ────────────────────────────────────────────────────────────
const LOGO_PATH  = path.resolve(__dirname, '../../logo_resized.png');
const JESSE_PATH = path.resolve(__dirname, '../../Jesse Image.png');

function loadLogo(): Buffer | null {
  try { return fs.readFileSync(LOGO_PATH); }
  catch (_) { console.warn('[PDF] Logo not found at', LOGO_PATH); return null; }
}

function loadJesse(): Buffer | null {
  try { return fs.readFileSync(JESSE_PATH); }
  catch (_) { console.warn('[PDF] Jesse image not found at', JESSE_PATH); return null; }
}

// ── Circular clipped image ────────────────────────────────────────────────────
function drawCircleImage(
  page: PDFPage, image: PDFImage,
  cx: number, cy: number, r: number,
  borderColor?: RGB, borderW = 3,
): void {
  const k = 0.5522847498;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(cx, cy + r),
    appendBezierCurve(cx + k * r, cy + r, cx + r, cy + k * r, cx + r, cy),
    appendBezierCurve(cx + r, cy - k * r, cx + k * r, cy - r, cx, cy - r),
    appendBezierCurve(cx - k * r, cy - r, cx - r, cy - k * r, cx - r, cy),
    appendBezierCurve(cx - r, cy + k * r, cx - k * r, cy + r, cx, cy + r),
    closePath(), clip(), endPath(),
  );
  page.drawImage(image, { x: cx - r, y: cy - r, width: r * 2, height: r * 2 });
  page.pushOperators(popGraphicsState());
  if (borderColor) {
    page.drawEllipse({ x: cx, y: cy, xScale: r, yScale: r, borderColor, borderWidth: borderW });
  }
}

// ── QuickChart doughnut ───────────────────────────────────────────────────────
async function fetchChartImage(domainScores: DomainScores): Promise<Buffer | null> {
  const data   = Object.values(domainScores);
  const labels = (Object.keys(domainScores) as (keyof DomainScores)[]).map(k => DOMAIN_LABELS[k] ?? k);
  const colors = (Object.keys(domainScores) as (keyof DomainScores)[]).map(k => {
    const c = DOMAIN_COLORS[k];
    if (!c) return '#999999';
    return `#${Math.round(c.red*255).toString(16).padStart(2,'0')}${Math.round(c.green*255).toString(16).padStart(2,'0')}${Math.round(c.blue*255).toString(16).padStart(2,'0')}`;
  });

  const config = {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      cutoutPercentage: 65,
      legend: { position: 'bottom', labels: { fontSize: 11, fontColor: '#475569' } },
      plugins: { datalabels: { display: false } },
    },
  };

  try {
    const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=320&h=240&f=png&bkg=white`;
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 6000 });
    return Buffer.from(res.data);
  } catch (err) {
    console.error('[PDF] Chart fetch failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Text helpers ──────────────────────────────────────────────────────────────
function sanitize(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^[*]\s+/gm, '- ')
    .replace(/→|➔|➡/g, '->')
    .replace(/←/g, '<-')
    .replace(/[–—]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/•/g, '- ')
    .replace(/✓|✔/g, '*')
    .replace(/[^\x00-\xFF]/g, '');
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: RGB): void {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

// ── Main PDF generator ────────────────────────────────────────────────────────
export async function generatePDF({ name, readiness_score, tier, domain_scores, plan }: PDFGenerationParams): Promise<Buffer> {
  const pdfDoc        = await PDFDocument.create();
  const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // PDF metadata — shows correctly in mobile viewers and OS previews
  const dateISO = new Date().toISOString().slice(0, 10);
  pdfDoc.setTitle(`${name} - 7Day Plan - ${dateISO}`);
  pdfDoc.setAuthor('Jesse by ENDevo');
  pdfDoc.setSubject('Your Personal Digital Readiness Plan');
  pdfDoc.setKeywords(['digital readiness', 'ENDevo', 'Jesse', tier]);

  const W = 595, H = 842, margin = 44;
  const inner = W - margin * 2; // 507

  // Embed logo
  const logoBuf = loadLogo();
  let logoImage: PDFImage | null = null;
  if (logoBuf) {
    try { logoImage = await pdfDoc.embedPng(logoBuf); }
    catch (_) { console.warn('[PDF] Logo embed failed'); }
  }

  // Embed Jesse avatar
  const jesseBuf = loadJesse();
  let jesseImage: PDFImage | null = null;
  if (jesseBuf) {
    try { jesseImage = await pdfDoc.embedPng(jesseBuf); }
    catch (_) { console.warn('[PDF] Jesse image embed failed'); }
  }

  // Fetch chart
  const chartBuf = await fetchChartImage(domain_scores);
  let chartImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (chartBuf) {
    try { chartImage = await pdfDoc.embedPng(chartBuf); }
    catch (_) { /* skip */ }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Score Profile
  // ═══════════════════════════════════════════════════════════════════════════
  const p1 = pdfDoc.addPage([W, H]);

  // White header + orange accent
  const HEADER_H = 88, ACCENT_H = 4;
  drawRect(p1, 0, H - HEADER_H, W, HEADER_H, WHITE);
  drawRect(p1, 0, H - HEADER_H - ACCENT_H, W, ACCENT_H, ORANGE);

  // Logo in header
  if (logoImage) {
    const d = logoImage.scaleToFit(148, 58);
    p1.drawImage(logoImage, {
      x: margin,
      y: H - HEADER_H + (HEADER_H - d.height) / 2,
      width: d.width, height: d.height,
    });
  } else {
    p1.drawText('ENDevo', { x: margin, y: H - 36, font: helveticaBold, size: 18, color: NAVY });
    p1.drawText('PLAN. PROTECT. PEACE.', { x: margin, y: H - 54, font: helveticaBold, size: 8, color: ORANGE });
  }

  // Right side header labels
  const dateStr     = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const reportLabel = 'Digital Readiness Assessment';
  const dateLabel   = `${name}  ·  ${dateStr}`;
  p1.drawText(reportLabel, {
    x: W - margin - helveticaBold.widthOfTextAtSize(reportLabel, 10),
    y: H - 36, font: helveticaBold, size: 10, color: NAVY,
  });
  p1.drawText(dateLabel, {
    x: W - margin - helvetica.widthOfTextAtSize(dateLabel, 9),
    y: H - 54, font: helvetica, size: 9, color: MGREY,
  });

  // Score section
  let yPos = H - HEADER_H - ACCENT_H - 32;
  const scoreStr = `${readiness_score}`;
  const scoreW   = helveticaBold.widthOfTextAtSize(scoreStr, 72);
  p1.drawText(scoreStr, { x: margin, y: yPos - 72, font: helveticaBold, size: 72, color: NAVY });
  p1.drawText('/100',   { x: margin + scoreW + 6, y: yPos - 52, font: helvetica, size: 22, color: MGREY });

  // Tier badge
  const tierColor = TIER_COLORS[tier] ?? ORANGE;
  const tierW     = helveticaBold.widthOfTextAtSize(tier, 12) + 22;
  drawRect(p1, margin, yPos - 100, tierW, 24, tierColor);
  p1.drawText(tier, { x: margin + 11, y: yPos - 91, font: helveticaBold, size: 12, color: WHITE });

  // Opening line
  const OPENING: Record<string, string> = {
    'Peace Champion':  "You're genuinely ahead of most people. Let's keep it that way.",
    'On Your Way':     "You've started — now let's close the gaps before they become problems.",
    'Getting Clarity': "You're more aware than most. A few focused steps will change everything.",
    'Starting Fresh':  "Good news — this is exactly the right place to start. Let's do this.",
  };
  wrapText(OPENING[tier] ?? '', helvetica, 12, inner * 0.62).forEach((l, i) => {
    p1.drawText(l, { x: margin, y: yPos - 118 - i * 17, font: helvetica, size: 12, color: rgb(0.278, 0.365, 0.455) });
  });

  // Jesse avatar — small circle, right side of score section
  if (jesseImage) {
    const jr  = 38;
    const jcx = W - margin - jr - 4;
    const jcy = yPos - 55;
    drawCircleImage(p1, jesseImage, jcx, jcy, jr, ORANGE, 3);
  }

  // Chart (right side)
  const chartTop = yPos - 170;
  if (chartImage) {
    const cd = chartImage.scaleToFit(255, 195);
    p1.drawImage(chartImage, { x: W - margin - cd.width, y: chartTop - cd.height, width: cd.width, height: cd.height });
  }

  // Domain bars (left side)
  const barAreaW = inner * 0.52, barH = 13, barGap = 28;
  p1.drawText('Your Digital Life', { x: margin, y: chartTop + 4, font: helveticaBold, size: 11, color: NAVY });
  let barY = chartTop - 20;
  for (const [domain, raw] of Object.entries(domain_scores) as [keyof DomainScores, number][]) {
    const pct = raw / DOMAIN_MAX[domain];
    const label = DOMAIN_LABELS[domain] ?? domain;
    const bc    = DOMAIN_COLORS[domain] ?? ORANGE;
    p1.drawText(label, { x: margin, y: barY + 2, font: helvetica, size: 9, color: rgb(0.278, 0.365, 0.455) });
    barY -= 14;
    drawRect(p1, margin, barY, barAreaW, barH, LGREY);
    const fw = Math.round(barAreaW * pct);
    if (fw > 0) drawRect(p1, margin, barY, fw, barH, bc);
    p1.drawText(`${Math.round(pct * 100)}%`, { x: margin + barAreaW + 5, y: barY + 2, font: helveticaBold, size: 8, color: bc });
    barY -= barGap;
  }

  // ── Journey tracker ────────────────────────────────────────────────────────
  const TRACK_Y     = 170; // y-center of circles
  const CIRCLE_R    = 12;
  const totalSpan   = inner;
  const step        = totalSpan / 6; // spacing between 7 circles

  p1.drawText('YOUR 7-DAY JOURNEY', {
    x: margin, y: TRACK_Y + CIRCLE_R + 18,
    font: helveticaBold, size: 8, color: NAVY,
  });

  for (let d = 0; d < 7; d++) {
    const cx = margin + d * step + CIRCLE_R;
    const cy = TRACK_Y;
    const isToday = d === 0;

    // Circle fill / border
    if (isToday) {
      p1.drawEllipse({ x: cx, y: cy, xScale: CIRCLE_R, yScale: CIRCLE_R, color: ORANGE });
    } else {
      p1.drawEllipse({ x: cx, y: cy, xScale: CIRCLE_R, yScale: CIRCLE_R, borderColor: LGREY, borderWidth: 1, color: WHITE });
    }

    // Number inside circle
    const num = `${d + 1}`;
    const numW = (isToday ? helveticaBold : helvetica).widthOfTextAtSize(num, 8);
    p1.drawText(num, {
      x: cx - numW / 2, y: cy - 4,
      font: isToday ? helveticaBold : helvetica,
      size: 8,
      color: isToday ? WHITE : MGREY,
    });

    // Label below circle
    const lbl = isToday ? 'Today' : `Day ${d + 1}`;
    const lblW = helvetica.widthOfTextAtSize(lbl, 7);
    p1.drawText(lbl, {
      x: cx - lblW / 2, y: cy - CIRCLE_R - 11,
      font: isToday ? helveticaBold : helvetica,
      size: 7,
      color: isToday ? ORANGE : MGREY,
    });
  }

  // Thin divider above tracker
  drawRect(p1, margin, TRACK_Y + CIRCLE_R + 10, inner, 1, LGREY);

  // Disclaimer footer
  p1.drawText(
    'This is your personal guide — not legal or financial advice. Jesse by ENDevo  ·  https://endevo.life',
    { x: margin, y: 24, font: helvetica, size: 7.5, color: MGREY }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2+ — 7-Day Action Plan
  // ═══════════════════════════════════════════════════════════════════════════

  // Layout constants
  const LEFT_W  = 148; // left column width (day info)
  const COL_GAP = 20;  // gap between columns
  const RIGHT_X = margin + LEFT_W + COL_GAP; // right column start x
  const RIGHT_W = W - margin - RIGHT_X;      // right column width

  const CB_SIZE = 12; // checkbox square
  const CB_GAP  = 8;  // gap between checkbox and text
  const TEXT_X  = RIGHT_X + CB_SIZE + CB_GAP; // text after checkbox
  const TEXT_W  = RIGHT_W - CB_SIZE - CB_GAP; // text wrap width

  const FOOTER_H = 48;
  const MIN_Y    = FOOTER_H + 16;
  const LINE_H   = 14;

  // ── Plan page footer ──────────────────────────────────────────────────────
  function drawPlanFooter(page: PDFPage): void {
    drawRect(page, 0, 0, W, FOOTER_H, NAVY);

    page.drawText('https://endevo.life', {
      x: margin, y: 18, font: helveticaBold, size: 9, color: ORANGE,
    });
    page.drawText('ENDevo — Plan. Protect. Peace.', {
      x: margin, y: 6, font: helvetica, size: 8, color: rgb(0.580, 0.659, 0.749),
    });

    if (logoImage) {
      const fd = logoImage.scaleToFit(76, 30);
      // White backing so logo reads on dark footer
      drawRect(page, W - margin - fd.width - 8, (FOOTER_H - fd.height) / 2 - 4, fd.width + 16, fd.height + 8, WHITE);
      page.drawImage(logoImage, {
        x: W - margin - fd.width,
        y: (FOOTER_H - fd.height) / 2,
        width: fd.width, height: fd.height,
      });
    }
  }

  // ── Plan page header ──────────────────────────────────────────────────────
  const PLAN_HDR_H = 76;
  function addPlanPage(): PDFPage {
    const pg = pdfDoc.addPage([W, H]);
    drawRect(pg, 0, H - PLAN_HDR_H, W, PLAN_HDR_H, NAVY);
    pg.drawText('Your 7-Day Digital Readiness Plan', {
      x: margin, y: H - 40, font: helveticaBold, size: 17, color: WHITE,
    });
    pg.drawText(`Prepared for ${name}  ·  ${tier}`, {
      x: margin, y: H - 60, font: helvetica, size: 11, color: rgb(0.580, 0.659, 0.749),
    });
    if (logoImage) {
      const hd = logoImage.scaleToFit(90, 44);
      const hx = W - margin - hd.width;
      const hy = H - PLAN_HDR_H + (PLAN_HDR_H - hd.height) / 2;
      drawRect(pg, hx - 6, hy - 4, hd.width + 12, hd.height + 8, WHITE);
      pg.drawImage(logoImage, { x: hx, y: hy, width: hd.width, height: hd.height });
    }
    return pg;
  }

  // AcroForm — enables interactive (saveable) checkboxes in PDF viewers
  const form  = pdfDoc.getForm();
  let   cbIdx = 0;

  let planPage = addPlanPage();
  let py = H - PLAN_HDR_H - 24;

  function newPage(): void {
    drawPlanFooter(planPage);        // close current page
    planPage = pdfDoc.addPage([W, H]); // blank continuation page
    py = H - margin - 12;            // footer drawn at end of all content
  }

  // ── Parse and render plan ─────────────────────────────────────────────────
  const lines = sanitize(plan).split('\n');

  let dayNum   = 0;
  let dayTitle = '';
  let dayStartY = py;   // y where the current day section began (for left column)

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trimEnd();
    if (!line.trim()) { py -= 5; continue; }

    // ── Day heading ──────────────────────────────────────────────────────────
    if (/^Day \d+:/i.test(line)) {
      // Gap before each new day (except the very first)
      if (dayNum > 0) py -= 10;

      // Ensure enough room for heading + at least one checkbox row
      if (py < MIN_Y + 80) newPage();

      dayStartY = py;

      const m = line.match(/^Day (\d+):\s*(.+)/i);
      dayNum   = parseInt(m?.[1] ?? '0', 10);
      dayTitle = m?.[2] ?? line;

      // ── LEFT COLUMN: "DAY N" + title ─────────────────────────────────────
      planPage.drawText(`DAY ${String(dayNum).padStart(2, '0')}`, {
        x: margin, y: dayStartY,
        font: helveticaBold, size: 8, color: ORANGE,
      });

      const titleLines = wrapText(dayTitle, helveticaBold, 16, LEFT_W);
      titleLines.forEach((tl, i) => {
        planPage.drawText(tl, {
          x: margin, y: dayStartY - 14 - i * 20,
          font: helveticaBold, size: 16, color: NAVY,
        });
      });

      // ── RIGHT COLUMN: starts at same y ───────────────────────────────────
      // py stays at dayStartY; checkboxes will flow from here
      continue;
    }

    // ── Checkbox item: "- Bold Title | Description" ──────────────────────────
    if (line.startsWith('- ')) {
      const raw   = line.slice(2).trim();
      const pivot = raw.indexOf('|');
      const bold  = pivot >= 0 ? raw.slice(0, pivot).trim() : raw;
      const desc  = pivot >= 0 ? raw.slice(pivot + 1).trim() : '';

      const boldLines = wrapText(bold, helveticaBold, 11, TEXT_W);
      const descLines = desc ? wrapText(desc, helvetica, 10, TEXT_W) : [];
      const itemH     = boldLines.length * LINE_H + descLines.length * 13 + 8;

      if (py < MIN_Y + itemH) newPage();

      // Interactive checkbox widget (AcroForm — saveable in any PDF viewer)
      const cbBoxX = RIGHT_X;
      const cbBoxY = py - CB_SIZE + 4;
      const cb = form.createCheckBox(`cb_${++cbIdx}`);
      cb.addToPage(planPage, {
        x: cbBoxX, y: cbBoxY,
        width: CB_SIZE, height: CB_SIZE,
        textColor: NAVY,
        backgroundColor: WHITE,
        borderColor: NAVY,
        borderWidth: 1,
      });

      // Bold title lines
      boldLines.forEach((bl, i) => {
        planPage.drawText(bl, {
          x: TEXT_X, y: py - i * LINE_H,
          font: helveticaBold, size: 11, color: NAVY,
        });
      });
      py -= boldLines.length * LINE_H;

      // Description lines
      descLines.forEach(dl => {
        if (py < MIN_Y) newPage();
        planPage.drawText(dl, {
          x: TEXT_X, y: py,
          font: helvetica, size: 10, color: MGREY,
        });
        py -= 13;
      });

      py -= 6; // gap between items
      continue;
    }

    // ── NOTE line ─────────────────────────────────────────────────────────────
    if (line.startsWith('NOTE:')) {
      const noteText  = line.slice(5).trim();
      const noteLines = wrapText(noteText, helvetica, 9, inner - 6);
      const noteH     = noteLines.length * 13 + 14;

      py -= 8;
      if (py < MIN_Y + noteH) newPage();

      // Light orange bg block
      drawRect(planPage, margin, py - noteLines.length * 13 - 4, inner, noteLines.length * 13 + 12, LORANGE);
      // Orange left bar
      drawRect(planPage, margin, py - noteLines.length * 13 - 4, 3, noteLines.length * 13 + 12, ORANGE);

      noteLines.forEach((nl, i) => {
        planPage.drawText(nl, {
          x: margin + 8, y: py - i * 13,
          font: helvetica, size: 9, color: ORANGE,
        });
      });
      py -= noteH;

      // Divider between days
      py -= 6;
      drawRect(planPage, margin, py, inner, 1, LGREY);
      py -= 10;
      continue;
    }

    // Fallback plain text
    const wrapped = wrapText(line, helvetica, 11, inner);
    for (const wl of wrapped) {
      if (py < MIN_Y) newPage();
      planPage.drawText(wl, { x: margin, y: py, font: helvetica, size: 11, color: BLACK });
      py -= LINE_H;
    }
  }

  // ── My Notes — interactive text field at the end ──────────────────────────
  const NOTES_FIELD_H = 120;
  const NOTES_TOTAL   = 16 + 14 + 8 + NOTES_FIELD_H + 16;

  py -= 16;
  if (py < MIN_Y + NOTES_TOTAL) newPage();

  // Section label
  planPage.drawText('My Notes', {
    x: margin, y: py,
    font: helveticaBold, size: 12, color: NAVY,
  });
  py -= 14;
  planPage.drawText('Write down anything that stands out or that you want to remember.', {
    x: margin, y: py,
    font: helvetica, size: 9, color: MGREY,
  });
  py -= 10;

  // Saveable multi-line text field (addToPage first so /DA entry exists)
  const notesField = form.createTextField('my_notes');
  notesField.enableMultiline();
  notesField.addToPage(planPage, {
    x: margin, y: py - NOTES_FIELD_H,
    width: inner, height: NOTES_FIELD_H,
    backgroundColor: rgb(0.988, 0.992, 0.996),
    borderColor: LGREY,
    borderWidth: 1,
  });
  notesField.setFontSize(10);
  py -= NOTES_FIELD_H + 16;

  drawPlanFooter(planPage);

  return Buffer.from(await pdfDoc.save());
}
