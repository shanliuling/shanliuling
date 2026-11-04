// Profile card generator for github.com/shanliuling
// Usage: GITHUB_TOKEN=xxx node generate.mjs [outDir]
// Without a token it renders with fallback numbers (preview mode).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';
import * as si from 'simple-icons';

const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.resolve(process.argv[2] || path.join(HERE, 'dist'));
fs.mkdirSync(OUT, { recursive: true });

// ───────────────────────── config ─────────────────────────
const CFG = {
  login: 'shanliuling',
  name: 'Spark',
  hero: path.resolve(HERE, '../../assets/hero.gif'),
  subtitle: 'Programmer by day · Open-source builder by night',
  tagline: [
    'I build plugins & CLIs for the AI agent ecosystem.',
    'Sometimes I animate stick figures with code, too.',
  ],
  stack: [
    ['TypeScript', 'siTypescript'], ['React', 'siReact'], ['Node.js', 'siNodedotjs'],
    ['Python', 'siPython'], ['PostgreSQL', 'siPostgresql'],
  ],
  projects: [
    { repo: 'dsh-image-gen', desc: 'Chat-driven AI image generation', lang: 'TypeScript' },
    { repo: 'skills-sync', desc: 'Sync skills across all your AI apps', lang: 'TypeScript' },
  ],
  fallback: { stars: 1400, commits: 599, prs: 70 },
};

// ───────────────────────── data ─────────────────────────
async function fetchData() {
  const token = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
  const now = new Date();
  if (!token) return mock(now);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const monthAgo = new Date(now.getTime() - 29 * 864e5);
  const q = `query($login:String!,$y:DateTime!,$m:DateTime!,$to:DateTime!){
    user(login:$login){
      repositories(ownerAffiliations:OWNER,isFork:false,first:100,orderBy:{field:STARGAZERS,direction:DESC}){
        nodes{ name description stargazerCount primaryLanguage{ name color } } }
      year: contributionsCollection(from:$y,to:$to){ totalCommitContributions restrictedContributionsCount }
      month: contributionsCollection(from:$m,to:$to){ contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } }
      pullRequests{ totalCount }
    } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-card' },
    body: JSON.stringify({ query: q, variables: { login: CFG.login, y: yearStart.toISOString(), m: monthAgo.toISOString(), to: now.toISOString() } }),
  });
  const json = await res.json();
  if (!json.data?.user) { console.error('GraphQL failed, using fallback:', JSON.stringify(json.errors || json)); return mock(now); }
  const u = json.data.user;
  const repos = u.repositories.nodes;
  const days = u.month.contributionCalendar.weeks.flatMap(w => w.contributionDays)
    .filter(d => new Date(d.date) >= new Date(monthAgo.toISOString().slice(0, 10)));
  return {
    preview: false,
    updated: now,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    commits: u.year.totalCommitContributions + u.year.restrictedContributionsCount,
    prs: u.pullRequests.totalCount,
    days: days.map(d => d.contributionCount),
    projects: CFG.projects.map(p => {
      const r = repos.find(x => x.name === p.repo);
      return { ...p, stars: r?.stargazerCount ?? 0, lang: r?.primaryLanguage?.name ?? p.lang, color: r?.primaryLanguage?.color };
    }),
  };
}
function mock(now) {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return {
    preview: true, updated: now, ...CFG.fallback,
    days: Array.from({ length: 30 }, (_, i) => Math.round(Math.max(0, 6 + 5 * Math.sin(i / 3) + rnd() * 8 - (i % 7 === 6 ? 5 : 0)))),
    projects: CFG.projects.map((p, i) => ({ ...p, stars: [1300, 60][i] ?? 0 })),
  };
}

// ───────────────────────── fonts → paths ─────────────────────────
const loadFont = f => opentype.parse(fs.readFileSync(require.resolve(f)).buffer.slice(0));
const F = {
  sans4: loadFont('@fontsource/inter/files/inter-latin-400-normal.woff'),
  sans5: loadFont('@fontsource/inter/files/inter-latin-500-normal.woff'),
  sans7: loadFont('@fontsource/inter/files/inter-latin-700-normal.woff'),
  sans8: loadFont('@fontsource/inter/files/inter-latin-800-normal.woff'),
  mono4: loadFont('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'),
  mono5: loadFont('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff'),
};
const width = (s, font, size, ls = 0) => font.getAdvanceWidth(s, size) + ls * size * (s.length - 1);
// spans: [[text, fill], ...]; returns svg + end x
function text(spans, x, y, size, font, { anchor = 'start', ls = 0, opacity } = {}) {
  if (typeof spans === 'string') spans = [[spans, 'currentColor']];
  const total = spans.reduce((s, [t]) => s + width(t, font, size, ls), 0) + (spans.length - 1) * ls * size;
  let cx = anchor === 'end' ? x - total : anchor === 'middle' ? x - total / 2 : x;
  let out = '';
  for (const [t, fill] of spans) {
    let d = '';
    if (ls) { for (const ch of t) { d += font.getPath(ch, cx, y, size).toPathData(2); cx += font.getAdvanceWidth(ch, size) + ls * size; } }
    else { d = font.getPath(t, cx, y, size).toPathData(2); cx += font.getAdvanceWidth(t, size); }
    if (d) out += `<path d="${d}" fill="${fill}"${opacity ? ` opacity="${opacity}"` : ''}/>`;
  }
  return out;
}
const fmt = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);

// ───────────────────────── themes ─────────────────────────
const THEMES = {
  dark: {
    bg: '#0a0f1c', bg2: '#0d1424', panel: '#0f172a', panelHi: '#131c31', line: '#1e293b', line2: '#27344b',
    text: '#e2e8f0', sub: '#94a3b8', mute: '#64748b', dim: '#475569',
    accent: '#38bdf8', accent2: '#818cf8', glow: '#1d4ed8', grid: '#16203a',
    code: { kw: '#c084fc', key: '#7dd3fc', str: '#fbbf24', punc: '#64748b', plain: '#e2e8f0', num: '#475569' },
    tiles: ['#fbbf24', '#38bdf8', '#a78bfa'],
  },
  light: {
    bg: '#ffffff', bg2: '#f8fafc', panel: '#f8fafc', panelHi: '#f1f5f9', line: '#e2e8f0', line2: '#cbd5e1',
    text: '#0f172a', sub: '#475569', mute: '#64748b', dim: '#94a3b8',
    accent: '#0284c7', accent2: '#6366f1', glow: '#7dd3fc', grid: '#eef2f7',
    code: { kw: '#9333ea', key: '#0369a1', str: '#b45309', punc: '#94a3b8', plain: '#0f172a', num: '#94a3b8' },
    tiles: ['#d97706', '#0284c7', '#7c3aed'],
  },
};

// ───────────────────────── icons ─────────────────────────
const lucide = {
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  commit: '<circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/>',
  pr: '<circle cx="5" cy="6" r="3"/><path d="M5 9v12"/><circle cx="19" cy="18" r="3"/><path d="m15 9-3-3 3-3"/><path d="M12 6h5a2 2 0 0 1 2 2v7"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  pkg: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/>',
};
const icon = (name, x, y, s, color) =>
  `<g transform="translate(${x} ${y}) scale(${s / 24})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${lucide[name]}</g>`;
const brand = (key, x, y, s, color) =>
  `<g transform="translate(${x} ${y}) scale(${s / 24})"><path d="${si[key].path}" fill="${color}"/></g>`;

// ───────────────────────── render ─────────────────────────
const W = 1200, H = 620;
function render(T, D, heroB64) {
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">`);
  o.push(`<defs>
    <linearGradient id="name" x1="0" x2="1"><stop offset="0" stop-color="${T.accent}"/><stop offset="1" stop-color="${T.accent2}"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${T.glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${T.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.accent}" stop-opacity="0.35"/><stop offset="1" stop-color="${T.accent}" stop-opacity="0"/></linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.accent}"/><stop offset="1" stop-color="${T.accent2}"/></linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${T.grid}"/></pattern>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="24"/></clipPath>
    <clipPath id="hero"><rect x="656" y="44" width="244" height="244" rx="22"/></clipPath>
  </defs>`);
  // background
  o.push(`<g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="${T.bg}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>`);
  o.push(`<circle cx="778" cy="166" r="260" fill="url(#glow)"/></g>`);
  o.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="23.5" stroke="${T.line}"/>`);

  // ── left: heading
  const LX = 48;
  o.push(text([['# ', T.dim], ["Hi, I'm ", T.text], [CFG.name, 'url(#name)']], LX, 104, 52, F.sans8, { ls: -0.02 }));
  o.push(text([[CFG.subtitle, T.accent]], LX, 144, 16, F.mono5));
  CFG.tagline.forEach((l, i) => o.push(text([[l, T.sub]], LX, 186 + i * 26, 17, F.sans4)));

  // tech pills
  let px = LX; const py = 236;
  for (const [label, key] of CFG.stack) {
    const w = 14 + 16 + 8 + width(label, F.sans5, 13) + 14;
    o.push(`<rect x="${px + 0.5}" y="${py + 0.5}" width="${w - 1}" height="33" rx="9" fill="${T.panel}" stroke="${T.line}"/>`);
    o.push(brand(key, px + 14, py + 9, 16, '#' + si[key].hex));
    o.push(text([[label, T.sub]], px + 38, py + 22, 13, F.sans5));
    px += w + 8;
  }

  // code block
  const CY = 296, CW = 568, CH = 276;
  o.push(`<rect x="${LX + 0.5}" y="${CY + 0.5}" width="${CW - 1}" height="${CH - 1}" rx="16" fill="${T.panel}" stroke="${T.line}"/>`);
  ['#f87171', '#fbbf24', '#34d399'].forEach((c, i) => o.push(`<circle cx="${LX + 22 + i * 18}" cy="${CY + 22}" r="5.5" fill="${c}" opacity="0.85"/>`));
  o.push(text([['spark.ts', T.mute]], LX + CW / 2, CY + 27, 12, F.mono4, { anchor: 'middle' }));
  o.push(`<line x1="${LX}" x2="${LX + CW}" y1="${CY + 44.5}" y2="${CY + 44.5}" stroke="${T.line}"/>`);
  const c = T.code;
  const lines = [
    [['const ', c.kw], ['spark', c.plain], [' = {', c.punc]],
    [['  builds', c.key], [':  ', c.punc], ['[', c.punc], ['"agent plugins"', c.str], [', ', c.punc], ['"dev CLIs"', c.str], [', ', c.punc], ['"AI workflows"', c.str], ['],', c.punc]],
    [['  shipped', c.key], [': ', c.punc], ['[', c.punc], ['"dsh-image-gen"', c.str], [', ', c.punc], ['"skills-sync"', c.str], ['],', c.punc]],
    [['  side', c.key], [':    ', c.punc], ['"code-animated stick-figure shorts"', c.str], [',', c.punc]],
    [['  based', c.key], [':   ', c.punc], ['"Taipei"', c.str], [',', c.punc]],
    [['  motto', c.key], [':   ', c.punc], ['"ship it first, make it pretty later"', c.str], [',', c.punc]],
    [['};', c.punc]],
    [],
    [['// open source is hard, walk and cherish.', c.num]],
  ];
  lines.forEach((spans, i) => {
    const y = CY + 74 + i * 22.5;
    o.push(text([[String(i + 1).padStart(2, ' '), T.dim]], LX + 20, y, 13, F.mono4));
    if (spans.length) o.push(text(spans, LX + 54, y, 13.5, F.mono4));
  });

  // ── right: hero
  o.push(`<rect x="652" y="40" width="252" height="252" rx="26" fill="url(#ring)" opacity="0.9"/>`);
  o.push(`<rect x="655" y="43" width="246" height="246" rx="23" fill="${T.bg}"/>`);
  o.push(`<image href="data:image/gif;base64,${heroB64}" x="656" y="44" width="244" height="244" clip-path="url(#hero)" preserveAspectRatio="xMidYMid slice"/>`);

  // stat tiles
  const tiles = [
    ['star', 'Stars earned', fmt(D.stars)],
    ['commit', `Commits ${D.updated.getUTCFullYear()}`, fmt(D.commits)],
    ['pr', 'Pull requests', fmt(D.prs)],
  ];
  tiles.forEach(([ic, label, val], i) => {
    const x = 922, y = 40 + i * 86, w = 230, h = 76, col = T.tiles[i];
    o.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="14" fill="${T.panel}" stroke="${T.line}"/>`);
    o.push(icon(ic, x + 16, y + 15, 15, col));
    o.push(text([[label, T.mute]], x + 38, y + 27, 12.5, F.sans5));
    o.push(text([[val, col]], x + 16, y + 62, 28, F.sans7, { ls: -0.01 }));
  });

  // activity panel
  const AX = 652, AY = 308, AW = 500, AH = 126;
  o.push(`<rect x="${AX + 0.5}" y="${AY + 0.5}" width="${AW - 1}" height="${AH - 1}" rx="14" fill="${T.panel}" stroke="${T.line}"/>`);
  o.push(icon('activity', AX + 16, AY + 14, 15, T.accent));
  const total = D.days.reduce((a, b) => a + b, 0);
  o.push(text([['Last 30 days', T.mute]], AX + 38, AY + 26, 12.5, F.sans5));
  o.push(text([[`${total} contributions`, T.sub]], AX + AW - 16, AY + 26, 12.5, F.sans5, { anchor: 'end' }));
  const gx = AX + 16, gy = AY + 40, gw = AW - 32, gh = 70, max = Math.max(1, ...D.days);
  const pts = D.days.map((v, i) => [gx + (i / (D.days.length - 1)) * gw, gy + gh - (v / max) * gh]);
  // smooth curve (catmull-rom → bezier)
  let dPath = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    dPath += ` C${c1.map(n => n.toFixed(1)).join(' ')} ${c2.map(n => n.toFixed(1)).join(' ')} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  [0, 0.5, 1].forEach(t => o.push(`<line x1="${gx}" x2="${gx + gw}" y1="${(gy + gh * t).toFixed(1)}" y2="${(gy + gh * t).toFixed(1)}" stroke="${T.line}" stroke-dasharray="2 4"/>`));
  o.push(`<path d="${dPath} L${gx + gw} ${gy + gh} L${gx} ${gy + gh} Z" fill="url(#area)"/>`);
  o.push(`<path d="${dPath}" stroke="${T.accent}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  const last = pts[pts.length - 1];
  o.push(`<circle cx="${last[0]}" cy="${last[1]}" r="7" fill="${T.accent}" opacity="0.25"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${T.accent}"/>`);

  // project cards
  D.projects.slice(0, 2).forEach((p, i) => {
    const x = 652 + i * 255, y = 448, w = 245, h = 124;
    o.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="14" fill="${T.panel}" stroke="${T.line}"/>`);
    o.push(`<rect x="${x + 16}" y="${y + 16}" width="30" height="30" rx="8" fill="${T.panelHi}" stroke="${T.line2}"/>`);
    o.push(icon('pkg', x + 23, y + 23, 16, T.accent));
    o.push(text([[p.repo, T.text]], x + 56, y + 36, 15, F.sans7));
    let desc = p.desc || '';
    while (desc.length > 3 && width(desc, F.sans4, 12.5) > w - 32) desc = desc.replace(/…$/, "").slice(0, -1).trimEnd() + "…";
    o.push(text([[desc, T.sub]], x + 16, y + 74, 12.5, F.sans4));
    o.push(`<circle cx="${x + 21}" cy="${y + 101}" r="4.5" fill="${p.color || '#3178c6'}"/>`);
    o.push(text([[p.lang, T.mute]], x + 32, y + 105, 12, F.sans5));
    o.push(icon('star', x + w - 16 - 13 - 6 - width(fmt(p.stars), F.sans5, 12), y + 94, 13, T.mute));
    o.push(text([[fmt(p.stars), T.mute]], x + w - 16, y + 105, 12, F.sans5, { anchor: 'end' }));
  });

  // footer
  const stamp = `updated ${D.updated.toISOString().slice(0, 10)}${D.preview ? ' · preview data' : ''}`;
  o.push(text([[stamp, T.dim]], W - 48, 598, 11.5, F.mono4, { anchor: 'end' }));
  o.push(text([['github.com/' + CFG.login, T.dim]], LX, 598, 11.5, F.mono4));
  o.push('</svg>');
  return o.join('\n');
}

const D = await fetchData();
const hero = fs.readFileSync(CFG.hero).toString('base64');
fs.writeFileSync(path.join(OUT, 'profile.svg'), render(THEMES.dark, D, hero));
fs.writeFileSync(path.join(OUT, 'profile-light.svg'), render(THEMES.light, D, hero));
console.log(`wrote ${OUT}/profile.svg & profile-light.svg`, D.preview ? '(preview data)' : '');
