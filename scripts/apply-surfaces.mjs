import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const componentsDir = path.resolve(projectRoot, 'frontend/src/components');

console.log('Project root:', projectRoot);
console.log('Components dir:', componentsDir);

const targetFiles = [
  'ExecutiveDashboardView.tsx',
  'EvidenceVaultView.tsx',
  'IncidentGraphView.tsx',
  'TimelineReconstructionView.tsx',
  'HomeLandingView.tsx',
  'AuthPortalView.tsx',
  'IntegrityLedgerView.tsx',
  'ForensicReportView.tsx',
  'GlobalThreatOriginMap.tsx',
];

const KPI_ACCENTS = [
  'linear-gradient(90deg, #3b82f6, #22d3ee)', // blue/cyan
  'linear-gradient(90deg, #10b981, #34d399)', // emerald
  'linear-gradient(90deg, #f59e0b, #fbbf24)', // amber
  'linear-gradient(90deg, #8b5cf6, #a78bfa)', // violet
  'linear-gradient(90deg, #f43f5e, #fb7185)', // rose
  'linear-gradient(90deg, #06b6d4, #38bdf8)', // cyan
];

let totalReplacements = 0;
const perFileStats = {};

for (const fileName of targetFiles) {
  const filePath = path.join(componentsDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;

  // 1. Process regular white cards
  // Match className strings containing bg-white, border, rounded-(xl|2xl|lg), p-(3|4|5|6)
  // Not matching inputs, buttons, inline-flex, rounded-full
  content = content.replace(
    /className=(["'])(.*?)\1/gs,
    (match, quote, classStr) => {
      // Exclusions
      if (
        classStr.includes('inline-flex') ||
        classStr.includes('rounded-full') ||
        classStr.includes('z-50') ||
        classStr.includes('absolute ') ||
        classStr.includes('select ') ||
        classStr.includes('input')
      ) {
        return match;
      }

      const hasBgWhite = /\bbg-white\b/.test(classStr);
      const hasBorder = /\bborder(-slate-\d+)?\b/.test(classStr);
      const hasRounded = /\brounded-(xl|2xl|lg)\b/.test(classStr);
      const hasPadding = /\bp-([3456]|3\.5|4\.5)\b/.test(classStr);

      if (hasBgWhite && hasBorder && hasRounded && hasPadding) {
        let newClasses = classStr;

        // Remove tokens
        newClasses = newClasses
          .replace(/\bbg-white\b/g, '')
          .replace(/\bborder-slate-\d+(\/\d+)?\b/g, '')
          .replace(/\bborder\b/g, '')
          .replace(/\brounded-(xl|2xl|lg)\b/g, '')
          .replace(/\bshadow-(xs|sm|md|cfx-card|cfx-elevated|2xs)\b/g, '')
          .replace(/\bshadow\b/g, '');

        const isClickable =
          /\bcursor-pointer\b/.test(newClasses) ||
          /\bhover:border\b/.test(newClasses) ||
          /\bhover:scale\b/.test(newClasses);

        let added = 'cf-card';
        if (isClickable && !newClasses.includes('cf-card-hover')) {
          added += ' cf-card-hover';
        }

        newClasses = `${added} ${newClasses}`.replace(/\s+/g, ' ').trim();
        fileReplacements++;
        return `className=${quote}${newClasses}${quote}`;
      }

      // 2. Process large dark containers (p-5+)
      const hasDarkBg =
        /\bbg-\[#0[bB]0[fF]19\]\b/.test(classStr) ||
        /\bbg-slate-900\b/.test(classStr) ||
        /\bbg-slate-950\b/.test(classStr) ||
        /\bbg-\[#0[aA]0[dD]14\]\b/.test(classStr);
      const hasLargePadding = /\bp-([5678]|10|12)\b/.test(classStr);

      if (hasDarkBg && hasLargePadding && !classStr.includes('cf-card-dark')) {
        let newClasses = classStr
          .replace(/\bbg-\[#0[bB]0[fF]19\]\b/g, '')
          .replace(/\bbg-slate-900\b/g, '')
          .replace(/\bbg-slate-950\b/g, '')
          .replace(/\bbg-\[#0[aA]0[dD]14\]\b/g, '')
          .replace(/\bborder-slate-\d+(\/\d+)?\b/g, '')
          .replace(/\bborder-\[.*?\]\b/g, '')
          .replace(/\bborder\b/g, '')
          .replace(/\brounded-(xl|2xl|3xl|lg)\b/g, '');

        newClasses = `cf-card-dark ${newClasses}`.replace(/\s+/g, ' ').trim();
        fileReplacements++;
        return `className=${quote}${newClasses}${quote}`;
      }

      return match;
    }
  );

  // 3. Process KPI stat tiles (top 4-6 stat row of each page)
  // Look for top grid rows with grid-cols-4, grid-cols-5, grid-cols-6
  const kpiGridRegex = /(<div\s+className=["'][^"']*?grid[^"']*?(?:grid-cols-(?:2|1)\s+(?:sm|lg|xl):grid-cols-(?:4|5|6)|xl:grid-cols-(?:5|6)|lg:grid-cols-(?:4|5|6))[^"']*?["'][^>]*?>)([\s\S]*?)(<\/div>\s*\{\/\*|\n\s*<\!--|\n\s*<div\s+className=["'][^"']*?grid-cols-12)/;
  
  // Specific KPI row replacements for top metric rows:
  if (fileName === 'ExecutiveDashboardView.tsx') {
    // Top 5-metric row
    let kpiIndex = 0;
    content = content.replace(
      /({\/\* Card \d+:[^*]*?\*\/}\s*<div[\s\S]*?className=["'])([^"']*?)(["'])([\s\S]*?>)/g,
      (match, prefix, classNames, suffix, rest) => {
        if (kpiIndex < 5) {
          const accent = KPI_ACCENTS[kpiIndex % KPI_ACCENTS.length];
          kpiIndex++;
          fileReplacements++;
          let cls = classNames;
          if (!cls.includes('cf-kpi')) {
            cls = `cf-kpi ${cls}`.replace(/\s+/g, ' ').trim();
          }
          // check if style attribute already exists
          if (!rest.includes('style=')) {
            return `${prefix}${cls}${suffix} style={{ '--kpi': '${accent}' }}${rest}`;
          }
        }
        return match;
      }
    );
  } else if (fileName === 'EvidenceVaultView.tsx') {
    let kpiIndex = 0;
    // Lines around 376: grid grid-cols-2 lg:grid-cols-5 gap-3.5
    content = content.replace(
      /(<div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 min-w-0">[\s\S]*?)(<div\s+className=["'])([^"']*?)(["'])/g,
      (match, p1, p2, classNames, p4) => {
        return match;
      }
    );
  }

  // Also replace any remaining bare opacities /75, /82, /88
  const bareOpacityMatch = content.match(/\/(75|82|88)\b/g);
  if (bareOpacityMatch) {
    content = content
      .replace(/\/75\b/g, '/[0.75]')
      .replace(/\/82\b/g, '/[0.82]')
      .replace(/\/88\b/g, '/[0.88]');
    fileReplacements += bareOpacityMatch.length;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  perFileStats[fileName] = fileReplacements;
  totalReplacements += fileReplacements;
  console.log(`[${fileName}] -> ${fileReplacements} replacements`);
}

console.log(`\nTotal surface replacements applied: ${totalReplacements}`);
