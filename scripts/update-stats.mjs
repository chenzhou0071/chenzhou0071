// 从 GitHub API 拉取用户所有仓库的语言分布，生成 top-langs.svg
// 用法: node scripts/update-stats.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER = 'chenzhou0071';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// 需要从统计中排除的仓库（如课程作业、不想展示的项目）
const EXCLUDE_REPOS = ['Smart_Flower_Pot'];

// GitHub 语言颜色表（取自 linguist）
const LANG_COLORS = {
  C: '#555555',
  'C++': '#f34b7d',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Go: '#00ADD8',
  Vue: '#41b883',
  Shell: '#89e051',
  Makefile: '#427819',
  CMake: '#DA3434',
  Java: '#b07219',
  Rust: '#dea584',
  Dart: '#00B4AB',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Jupyter: '#DA5B0B',
  ObjectiveC: '#438eff',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Scala: '#c22d40',
  Lua: '#000080',
  R: '#198CE7',
  CSharp: '#178600',
  FSharp: '#b845fc',
  Dockerfile: '#384d54',
};

const COLOR_DEFAULT = '#8b949e';

async function fetchJson(url, { ignore404 = false } = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': USER } });
  if (!res.ok) {
    if (ignore404 && res.status === 404) return null;
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return res.json();
}

// 1. 获取所有仓库
const repos = await fetchJson(`https://api.github.com/users/${USER}/repos?per_page=100&type=all`);
console.log(`找到 ${repos.length} 个仓库`);

// 2. 汇总每个语言的总字节数
const langBytes = {};
for (const repo of repos) {
  if (repo.fork) continue;
  if (EXCLUDE_REPOS.includes(repo.name)) {
    console.log(`跳过 ${repo.name}（在排除列表中）`);
    continue;
  }
  const langs = await fetchJson(`https://api.github.com/repos/${USER}/${repo.name}/languages`, { ignore404: true });
  if (!langs) {
    console.log(`跳过 ${repo.name}（无公开语言数据）`);
    continue;
  }
  for (const [lang, bytes] of Object.entries(langs)) {
    langBytes[lang] = (langBytes[lang] || 0) + bytes;
  }
}

const entries = Object.entries(langBytes).sort((a, b) => b[1] - a[1]);
const total = entries.reduce((s, [, v]) => s + v, 0);
console.log('语言分布:', entries.map(([k, v]) => `${k} ${(v / total * 100).toFixed(1)}%`).join(', '));

// 3. 生成 SVG 卡片（仿 github-readme-stats 风格，无内部标题）
const W = 495;
const ROW_H = 28;
const HEADER = 20;
const PAD = 16;
const N = Math.min(entries.length, 8);
const H = HEADER + N * ROW_H + PAD;

const rows = entries.slice(0, N).map(([name, bytes], i) => {
  const pct = (bytes / total) * 100;
  const y = HEADER + i * ROW_H + 18;
  const color = LANG_COLORS[name] || COLOR_DEFAULT;
  const barX = 230;
  const barW = W - barX - PAD;
  const fillW = Math.max(2, (pct / 100) * barW);
  return `
    <circle cx="${PAD + 6}" cy="${y - 4}" r="5" fill="${color}" />
    <text x="${PAD + 18}" y="${y}" fill="#586069" font-family="Verdana, Geneva, sans-serif" font-size="14">${name}</text>
    <text x="${barX - 10}" y="${y}" fill="#586069" font-family="Verdana, Geneva, sans-serif" font-size="14" text-anchor="end">${pct.toFixed(1)}%</text>
    <rect x="${barX}" y="${y - 11}" width="${barW}" height="8" rx="4" fill="#e4e2e2" />
    <rect x="${barX}" y="${y - 11}" width="${fillW}" height="8" rx="4" fill="${color}" />
  `;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Top Languages">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="#ffffff" stroke="#e4e2e2" />
  ${rows}
</svg>`;

const out = join(ROOT, 'assets', 'top-langs.svg');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg, 'utf8');
console.log(`已生成 ${out} (${W}x${H})`);
