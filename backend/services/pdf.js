'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const axios = require('axios');

// ── Brand colours ─────────────────────────────────────────────────────────────
const NAVY    = rgb(0.106, 0.165, 0.290); // #1B2A4A
const ORANGE  = rgb(0.910, 0.396, 0.102); // #E8651A
const WHITE   = rgb(1, 1, 1);
const LGREY   = rgb(0.949, 0.953, 0.961); // #F1F3F5
const MGREY   = rgb(0.557, 0.604, 0.651); // #8E9AA6
const BLACK   = rgb(0.11, 0.11, 0.11);

// Domain chart colours
const DOMAIN_COLORS = {
  access_ownership:    rgb(0.290, 0.565, 0.851), // #4A90D9 blue
  data_loss:           rgb(0.176, 0.831, 0.745), // #2DD4BF teal
  platform_limitation: rgb(0.910, 0.396, 0.102), // #E8651A orange
  stewardship:         rgb(0.133, 0.773, 0.369), // #22C55E green
};

const DOMAIN_LABELS = {
  access_ownership:    'Access & Ownership',
  data_loss:           'Data Loss',
  platform_limitation: 'Platform',
  stewardship:         'Stewardship',
};

const DOMAIN_MAX = {
  access_ownership: 40,
  data_loss: 20,
  platform_limitation: 20,
  stewardship: 20,
};

// Tier badge colours
const TIER_COLORS = {
  'Peace Champion':  rgb(0.133, 0.773, 0.369), // green
  'On Your Way':     rgb(0.290, 0.565, 0.851), // blue
  'Getting Clarity': rgb(0.910, 0.396, 0.102), // orange
  'Starting Fresh':  rgb(0.659, 0.333, 0.969), // purple
};

// ── Fetch donut chart PNG from QuickChart ─────────────────────────────────────
async function fetchChartImage(domainScores) {
  const data = Object.values(domainScores);
  const labels = Object.keys(domainScores).map(k => DOMAIN_LABELS[k] || k);
  const colors = Object.keys(domainScores).map(k => {
    const c = DOMAIN_COLORS[k];
    if (!c) return '#999999';
    const r = Math.round(c.red * 255).toString(16).padStart(2, '0');
    const g = Math.round(c.green * 255).toString(16).padStart(2, '0');
    const b = Math.round(c.blue * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  });

  const config = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
    },
    options: {
      cutoutPercentage: 65,
      legend: { position: 'bottom', labels: { fontSize: 11, fontColor: '#475569' } },
      plugins: { datalabels: { display: false } },
    },
  };

  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=320&h=240&f=png&bkg=white`;

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 6000 });
    return Buffer.from(response.data);
  } catch (err) {
    console.error('[PDF] Chart fetch failed — skipping chart:', err.message);
    return null;
  }
}

// ── Helper: strip markdown + replace Unicode chars unsupported by WinAnsi ──────
function sanitize(text) {
  return text
    // Strip markdown formatting
    .replace(/^#{1,6}\s+/gm, '')           // ## Heading -> plain
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')   // **bold** -> bold
    .replace(/__([^_\n]+)__/g, '$1')       // __bold__ -> bold
    .replace(/^[*]\s+/gm, '- ')            // * bullet -> -
    // Unicode replacements
    .replace(/→|➔|➡/g, '->')
    .replace(/←/g, '<-')
    .replace(/[–—]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .replace(/✓|✔/g, '*')
    .replace(/[^\x00-\xFF]/g, ''); // strip any remaining non-latin chars
}

// ── Helper: wrap text into lines that fit within maxWidth ─────────────────────
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(test, fontSize);
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Helper: draw a filled rounded rectangle (approximated with rect) ──────────
function drawRect(page, x, y, w, h, color) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

// ── Generate the 2-page Jesse PDF ─────────────────────────────────────────────
async function generatePDF({ name, readiness_score, tier, domain_scores, plan }) {
  const pdfDoc = await PDFDocument.create();
  const helvetica       = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4: 595 × 842 pts
  const W = 595, H = 842;
  const margin = 44;
  const inner = W - margin * 2;

  // Attempt to fetch chart
  const chartBuffer = await fetchChartImage(domain_scores);
  let chartImage = null;
  if (chartBuffer) {
    try { chartImage = await pdfDoc.embedPng(chartBuffer); } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Score Profile
  // ═══════════════════════════════════════════════════════════════════════════
  const p1 = pdfDoc.addPage([W, H]);

  // ── Dark navy header bar ──────────────────────────────────────────────────
  drawRect(p1, 0, H - 110, W, 110, NAVY);

  // ENDevo wordmark
  p1.drawText('ENDevo', {
    x: margin, y: H - 38,
    font: helveticaBold, size: 11,
    color: ORANGE,
  });

  // JESSE title
  p1.drawText('JESSE', {
    x: margin, y: H - 62,
    font: helveticaBold, size: 26,
    color: WHITE,
  });

  // Subtitle
  p1.drawText('Digital Readiness Assessment', {
    x: margin, y: H - 82,
    font: helvetica, size: 12,
    color: rgb(0.580, 0.659, 0.749),
  });

  // Date + name (right-aligned)
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dateLabel = `${name}  ·  ${dateStr}`;
  const dateLabelW = helvetica.widthOfTextAtSize(dateLabel, 10);
  p1.drawText(dateLabel, {
    x: W - margin - dateLabelW, y: H - 62,
    font: helvetica, size: 10,
    color: rgb(0.580, 0.659, 0.749),
  });

  // ── Score section ─────────────────────────────────────────────────────────
  let yPos = H - 145;

  // Large score number
  const scoreStr = `${readiness_score}`;
  const scoreW   = helveticaBold.widthOfTextAtSize(scoreStr, 72);
  p1.drawText(scoreStr, {
    x: margin, y: yPos - 72,
    font: helveticaBold, size: 72,
    color: NAVY,
  });

  // "/100" suffix
  p1.drawText('/100', {
    x: margin + scoreW + 6, y: yPos - 52,
    font: helvetica, size: 22,
    color: MGREY,
  });

  // Tier badge
  const tierColor = TIER_COLORS[tier] ?? ORANGE;
  const tierW = helveticaBold.widthOfTextAtSize(tier, 13) + 24;
  drawRect(p1, margin, yPos - 100, tierW, 26, tierColor);
  p1.drawText(tier, {
    x: margin + 12, y: yPos - 91,
    font: helveticaBold, size: 13,
    color: WHITE,
  });

  // Jesse's opening line per tier
  const OPENING = {
    'Peace Champion':  "You're genuinely ahead of most people. Let's keep it that way.",
    'On Your Way':     "You've started — now let's close the gaps before they become problems.",
    'Getting Clarity': "You're more aware than most. A few focused steps will change everything.",
    'Starting Fresh':  "No worries — this is exactly the right place to start. Let's go.",
  };
  const openingLine = OPENING[tier] ?? '';
  const openingLines = wrapText(openingLine, helvetica, 13, inner * 0.55);
  openingLines.forEach((line, i) => {
    p1.drawText(line, {
      x: margin, y: yPos - 122 - (i * 18),
      font: helvetica, size: 13,
      color: rgb(0.278, 0.365, 0.455),
    });
  });

  // ── Domain breakdown chart ────────────────────────────────────────────────
  const chartTop = yPos - 175;

  if (chartImage) {
    const chartDims = chartImage.scaleToFit(260, 200);
    p1.drawImage(chartImage, {
      x: W - margin - chartDims.width,
      y: chartTop - chartDims.height,
      width: chartDims.width,
      height: chartDims.height,
    });
  }

  // ── Domain score bars (left side) ────────────────────────────────────────
  const barAreaW = inner * 0.52;
  const barH = 14;
  const barGap = 30;

  p1.drawText('Domain Breakdown', {
    x: margin, y: chartTop + 4,
    font: helveticaBold, size: 12,
    color: NAVY,
  });

  let barY = chartTop - 22;
  for (const [domain, raw] of Object.entries(domain_scores)) {
    const pct    = raw / DOMAIN_MAX[domain];
    const label  = DOMAIN_LABELS[domain] || domain;
    const barColor = DOMAIN_COLORS[domain] ?? ORANGE;
    const filledW = Math.round(barAreaW * pct);

    // Label
    p1.drawText(label, {
      x: margin, y: barY + 2,
      font: helvetica, size: 10,
      color: rgb(0.278, 0.365, 0.455),
    });

    // Track (grey)
    barY -= 16;
    drawRect(p1, margin, barY, barAreaW, barH, LGREY);

    // Fill
    if (filledW > 0) {
      drawRect(p1, margin, barY, filledW, barH, barColor);
    }

    // Percent label
    p1.drawText(`${Math.round(pct * 100)}%`, {
      x: margin + barAreaW + 6, y: barY + 2,
      font: helveticaBold, size: 9,
      color: barColor,
    });

    barY -= barGap;
  }

  // ── Horizontal divider ────────────────────────────────────────────────────
  const divY = Math.min(barY - 10, (chartImage ? chartTop - 210 : chartTop - 180));
  drawRect(p1, margin, divY, inner, 1, LGREY);

  // ── Disclaimer footer ─────────────────────────────────────────────────────
  const disclaimer = 'This report is for educational purposes only. Not legal or financial advice. Jesse by ENDevo  ·  endevo.life';
  p1.drawText(disclaimer, {
    x: margin, y: 28,
    font: helvetica, size: 8,
    color: MGREY,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2+ — 7-Day Action Plan (dynamic pagination)
  // ═══════════════════════════════════════════════════════════════════════════
  const footerH = 44;
  const minY    = footerH + 12;
  const lineH   = 15;

  function drawPlanFooter(page) {
    drawRect(page, 0, 0, W, footerH, NAVY);
    page.drawText('ENDevo — Plan. Protect. Peace.   ·   endevo.life', {
      x: margin, y: 16,
      font: helvetica, size: 9,
      color: rgb(0.580, 0.659, 0.749),
    });
  }

  let planPage = pdfDoc.addPage([W, H]);
  let py = H - 110;

  // Header bar on first plan page
  drawRect(planPage, 0, H - 80, W, 80, NAVY);
  planPage.drawText('Your 7-Day Digital Readiness Plan', {
    x: margin, y: H - 44,
    font: helveticaBold, size: 18,
    color: WHITE,
  });
  planPage.drawText(`Prepared for ${name}  ·  ${tier}`, {
    x: margin, y: H - 66,
    font: helvetica, size: 11,
    color: rgb(0.580, 0.659, 0.749),
  });

  function addPlanPage() {
    drawPlanFooter(planPage);
    planPage = pdfDoc.addPage([W, H]);
    py = H - margin;
  }

  const planLines = sanitize(plan).split('\n');

  for (const rawLine of planLines) {
    const line = rawLine.trimEnd();

    // Blank line -> small gap
    if (!line.trim()) {
      py -= 6;
      continue;
    }

    // "Day N:" heading
    if (/^Day \d+:/i.test(line)) {
      py -= 4;
      // Ensure enough room for heading + at least one body line
      if (py < minY + lineH * 2) addPlanPage();

      const [dayPart, ...rest] = line.split(':');
      const dayLabel  = `${dayPart}:`;
      const dayLabelW = helveticaBold.widthOfTextAtSize(dayLabel, 13);

      planPage.drawText(dayLabel, {
        x: margin, y: py,
        font: helveticaBold, size: 13,
        color: ORANGE,
      });
      if (rest.length) {
        planPage.drawText(rest.join(':').trim(), {
          x: margin + dayLabelW + 4, y: py,
          font: helveticaBold, size: 13,
          color: NAVY,
        });
      }
      py -= lineH + 4;
      continue;
    }

    // Body text — wrap and paginate
    const wrapped = wrapText(line, helvetica, 11, inner);
    for (const wl of wrapped) {
      if (py < minY) addPlanPage();
      planPage.drawText(wl, {
        x: margin, y: py,
        font: helvetica, size: 11,
        color: BLACK,
      });
      py -= lineH;
    }
  }

  // Footer on the last plan page
  drawPlanFooter(planPage);

  return Buffer.from(await pdfDoc.save());
}

module.exports = { generatePDF };
