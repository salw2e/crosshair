// Crosshair model: sizes are pixels at 1080p.
export const DEFAULT = {color: '#00ffff', alpha: 1, thickness: 2, length: 4, gap: 2, outline: false, outlineThickness: 1, outlineAlpha: 0.5, dot: false, dotSize: 2, tStyle: false};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hex2 = n => n.toString(16).padStart(2, '0');
export const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
const round2 = v => Math.round(v * 100) / 100;

// Valorant profile code

const VAL_PRESETS = ['#ffffff', '#00ff00', '#7fff00', '#dfff00', '#ffff00', '#00ffff', '#ff00ff', '#ff0000'];

export function toValorant(m) {
  const t = ['0', 'P'], warn = [];
  const add = (k, v) => t.push(k, String(v));
  const preset = VAL_PRESETS.indexOf(m.color.toLowerCase());
  if (preset < 0) add('c', 8), add('u', m.color.slice(1).toUpperCase() + 'FF');
  else if (preset > 0) add('c', preset);
  if (!m.outline) add('h', 0);
  else {
    const ot = clamp(Math.round(m.outlineThickness), 1, 6);
    if (ot !== m.outlineThickness) warn.push(`Valorant outline thickness is 1 to 6, using ${ot}`);
    if (ot !== 1) add('t', ot);
    if (m.outlineAlpha !== 0.5) add('o', round2(m.outlineAlpha));
  }
  if (m.dot) {
    add('d', 1);
    const z = clamp(Math.round(m.dotSize), 1, 6);
    if (z !== m.dotSize) warn.push(`Valorant dot size is 1 to 6, using ${z}`);
    if (z !== 2) add('z', z);
    if (m.alpha !== 1) add('a', round2(m.alpha));
  }
  if (m.length === 0 || m.thickness === 0) add('0b', 0);
  else {
    const th = clamp(m.thickness, 0, 10), l = clamp(m.length, 0, 20), o = clamp(m.gap, 0, 20);
    if (th !== m.thickness) warn.push(`Valorant line thickness is 0 to 10, using ${th}`);
    if (l !== m.length) warn.push(`Valorant line length is 0 to 20, using ${l}`);
    if (o !== m.gap) warn.push(`Valorant gap is 0 to 20, using ${o}`);
    if (th !== 2) add('0t', th);
    if (l !== 6) add('0l', l);
    if (o !== 3) add('0o', o);
    if (m.alpha !== 0.8) add('0a', round2(m.alpha));
    add('0f', 0);
  }
  add('1b', 0);
  if (m.tStyle) warn.push('Valorant has no T style, the top line will show');
  return {code: t.join(';'), warn};
}

export function fromValorant(code) {
  code = code.trim();
  if (!/^\d+;/.test(code)) throw new Error('Not a Valorant code');
  const tok = code.split(';'), p = {};
  let sec = '';
  for (let i = 1; i < tok.length;) {
    if (['P', 'A', 'S'].includes(tok[i])) { sec = tok[i++]; continue; }
    if (sec === 'P') p[tok[i]] = tok[i + 1];
    i += 2;
  }
  const num = (k, d) => (p[k] !== undefined && !isNaN(parseFloat(p[k])) ? parseFloat(p[k]) : d);
  const c = num('c', 0);
  const color = c === 8 && /^[0-9a-f]{6}/i.test(p.u || '') ? '#' + p.u.slice(0, 6).toLowerCase() : VAL_PRESETS[clamp(Math.round(c), 0, 7)];
  const show = num('0b', 1) !== 0;
  return {
    color,
    alpha: show ? num('0a', 0.8) : num('a', 1),
    thickness: show ? num('0t', 2) : 0,
    length: show ? num('0l', 6) : 0,
    gap: num('0o', 3),
    outline: num('h', 1) !== 0,
    outlineThickness: num('t', 1),
    outlineAlpha: num('o', 0.5),
    dot: num('d', 0) !== 0,
    dotSize: num('z', 2),
    tStyle: false,
  };
}

// CS2 share code, the `CS...` format CS2 has used since 30/09/2026, and the CS2 era `CSGO-...` codes (v3, v4).
// Byte layout from github.com/akiver/csgo-sharecode (MIT).

const DICT = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
const N = BigInt(DICT.length);

function charsToBytes(chars, len) {
  let big = 0n;
  for (const ch of [...chars].reverse()) {
    const i = DICT.indexOf(ch);
    if (i < 0) throw new Error('Invalid character in code');
    big = big * N + BigInt(i);
  }
  const h = big.toString(16).padStart(len * 2, '0');
  if (h.length > len * 2) throw new Error('Invalid code');
  return Array.from({length: len}, (_, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16));
}

function bytesToChars(bytes, count) {
  let big = BigInt('0x' + bytes.map(hex2).join('')), s = '';
  for (let i = 0; i < count; i++) { s += DICT[Number(big % N)]; big /= N; }
  return s;
}

const checksumOk = b => b[0] === b.slice(1).reduce((s, x) => s + x, 0) % 256;

export function cs2Bytes(x) {
  const bits = clamp(x.splitDistance, 0, 127) | (Math.round(x.innerSplitAlpha * 100) << 7) | ((Math.round(x.outerSplitAlpha * 100) - 30) << 14) | (Math.round(x.splitSizeRatio * 100) << 21) | (Number(x.scopeDotUseCrosshairColor) << 28);
  const b = new Array(32).fill(0);
  b[1] = 1;
  b[2] = x.screenHeight & 0xff;
  b[3] = x.screenHeight >> 8;
  b[4] = clamp(x.style, 0, 9) | (Number(x.followRecoil) << 5) | (Number(x.centerDotEnabled) << 6) | (Number(x.tStyleEnabled) << 7);
  [b[5], b[6], b[7], b[8]] = [x.red, x.green, x.blue, x.alpha];
  [b[9], b[10], b[11], b[12]] = [x.outlineRed, x.outlineGreen, x.outlineBlue, x.outlineAlpha];
  b[13] = clamp(x.thickness, 0, 32) | (clamp(x.outlineMode, 0, 2) << 6);
  const gap = clamp(x.gap, -3840, 3840);
  b[14] = gap & 0xff;
  b[15] = (gap >> 8) & 0xff;
  b[16] = clamp(x.length, 0, 255);
  b[17] = clamp(x.dynamicSpreadLimit, 0, 255);
  [b[18], b[19], b[20], b[21]] = [bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff];
  b[22] = Math.round(clamp(x.scopeDotScale, 0.1, 2) * 100) - 10;
  b[0] = b.reduce((s, v) => s + v, 0) & 0xff;
  return 'CS' + bytesToChars(b, 44);
}

export function cs2Fields(code) {
  code = code.trim();
  if (/^CS[A-Za-z0-9]{44}$/.test(code)) {
    const b = charsToBytes(code.slice(2), 32);
    if (!checksumOk(b) || b[1] !== 1) throw new Error('Invalid CS2 code');
    const bits = b[18] | (b[19] << 8) | (b[20] << 16) | (b[21] << 24);
    return {
      style: Math.min(b[4] & 0x1f, 9), followRecoil: !!(b[4] & 0x20), centerDotEnabled: !!(b[4] & 0x40), tStyleEnabled: !!(b[4] & 0x80),
      outlineMode: Math.min(b[13] >>> 6, 2), red: b[5], green: b[6], blue: b[7], alpha: b[8],
      outlineRed: b[9], outlineGreen: b[10], outlineBlue: b[11], outlineAlpha: b[12],
      gap: clamp(((b[14] | (b[15] << 8)) << 16) >> 16, -3840, 3840), length: b[16], thickness: Math.min(b[13] & 0x3f, 32),
      dynamicSpreadLimit: b[17], splitDistance: bits & 0x7f,
      innerSplitAlpha: Math.min((bits >> 7) & 0x7f, 100) / 100, outerSplitAlpha: (Math.min((bits >> 14) & 0x7f, 70) + 30) / 100,
      splitSizeRatio: Math.min((bits >> 21) & 0x7f, 100) / 100, screenHeight: Math.max(b[2] | (b[3] << 8), 240),
      scopeDotScale: Math.min((b[22] + 10) / 100, 2), scopeDotUseCrosshairColor: ((bits >>> 28) & 1) === 1,
    };
  }
  const m = code.match(/^CSGO((?:-?[A-Za-z0-9]{5}){5})$/);
  if (!m) throw new Error('Not a CS2 code');
  const b = charsToBytes(m[1].replace(/-/g, ''), 18);
  if (!checksumOk(b)) throw new Error('Invalid CS2 code');
  if (b[1] !== 3 && b[1] !== 4) throw new Error('This is an old CS:GO code, CS2 no longer accepts it');
  const bits = b[10] | (b[11] << 8) | (b[12] << 16) | (b[13] << 24);
  return {
    style: b[2] & 0xf, centerDotEnabled: !!(b[2] & 0x40), tStyleEnabled: !!(b[2] & 0x80),
    outlineMode: b[1] === 3 ? Number(!!(b[2] & 0x20)) : (b[13] >> 4) & 3,
    red: b[3], green: b[4], blue: b[5], alpha: b[6], outlineRed: 0, outlineGreen: 0, outlineBlue: 0, outlineAlpha: 255,
    gap: b[7], length: b[8], thickness: (bits >> 23) & 0x1f, screenHeight: Math.max(b[14] | (b[15] << 8), 240),
  };
}

const CS2_BASE = {style: 4, followRecoil: false, dynamicSpreadLimit: 181, splitDistance: 7, innerSplitAlpha: 1, outerSplitAlpha: 0.5, splitSizeRatio: 0.35, screenHeight: 1080, scopeDotScale: 1, scopeDotUseCrosshairColor: false};

export function toCs2Fields(m) {
  const [red, green, blue] = rgb(m.color);
  return {...CS2_BASE, red, green, blue, alpha: Math.round(m.alpha * 255), centerDotEnabled: m.dot, tStyleEnabled: m.tStyle,
    outlineMode: m.outline ? 1 : 0, outlineRed: 0, outlineGreen: 0, outlineBlue: 0, outlineAlpha: Math.round(m.outlineAlpha * 255),
    gap: Math.round(m.gap), length: Math.round(m.length), thickness: Math.round(m.thickness)};
}

export function toCs2(m) {
  const warn = [];
  if (m.outline && m.outlineThickness !== 1) warn.push('CS2 outlines are always 1 px');
  if (m.dot && m.dotSize !== m.thickness) warn.push('The CS2 dot is the same size as the line thickness');
  const f = toCs2Fields(m);
  const cmds = [
    `cl_crosshairstyle ${f.style}`, `cl_crosshair_thickness ${f.thickness}`, `cl_crosshair_length ${f.length}`, `cl_crosshair_gap ${f.gap}`,
    `cl_crosshaircolor_r ${f.red}`, `cl_crosshaircolor_g ${f.green}`, `cl_crosshaircolor_b ${f.blue}`, `cl_crosshaircolor_a ${f.alpha}`,
    `cl_crosshair_drawoutline ${f.outlineMode}`, `cl_crosshairoutline_a ${f.outlineAlpha}`, `cl_crosshairdot ${Number(f.centerDotEnabled)}`,
    `cl_crosshair_t ${Number(f.tStyleEnabled)}`, `cl_crosshair_screen_height ${f.screenHeight}`,
  ].join('; ');
  return {code: cs2Bytes(f), cmds, warn};
}

export function fromCs2(code) {
  const x = cs2Fields(code), k = 1080 / x.screenHeight;
  const px = v => Math.round(v * k);
  const warn = [];
  if (x.style !== 4 && x.style !== 5 && x.style !== 6 && x.style !== 8 && x.style !== 9) warn.push('This is a dynamic crosshair, shown here without the movement spread');
  return {
    m: {color: toHex(x.red, x.green, x.blue), alpha: round2(x.alpha / 255), thickness: px(x.thickness), length: x.style === 6 ? 0 : px(x.length), gap: px(x.gap),
      outline: x.outlineMode > 0, outlineThickness: 1, outlineAlpha: round2(x.outlineAlpha / 255), dot: x.centerDotEnabled || x.style === 6, dotSize: Math.max(1, px(x.thickness)), tStyle: x.tStyleEnabled},
    warn,
  };
}

// Overwatch 2 has no share code, so it gets the settings to enter by hand.
export function toOverwatch(m) {
  return [
    ['Type', 'Crosshairs'],
    ['Show Accuracy', 'Off'],
    ['Color', m.color.toUpperCase()],
    ['Thickness', clamp(Math.round(m.thickness), 1, 15)],
    ['Crosshair Length', clamp(Math.round(m.length), 0, 100)],
    ['Center Gap', clamp(Math.round(m.gap), 0, 100)],
    ['Opacity', Math.round(m.alpha * 100) + '%'],
    ['Outline Opacity', (m.outline ? Math.round(m.outlineAlpha * 100) : 0) + '%'],
    ['Dot Size', m.dot ? clamp(Math.round(m.dotSize), 1, 30) : 0],
    ['Dot Opacity', (m.dot ? Math.round(m.alpha * 100) : 0) + '%'],
    ['Scale With Resolution', 'On'],
  ];
}

export function importCode(code) {
  code = code.trim();
  if (/^\d+;/.test(code)) return {m: fromValorant(code), warn: [], from: 'Valorant'};
  if (/^CS/.test(code)) return {...fromCs2(code), from: 'CS2'};
  throw new Error('Paste a Valorant code (0;P;...) or a CS2 code (CS...)');
}
