import React, { useState, useMemo } from 'react';
import { Plus, Minus, Radar, ChevronDown, ArrowUpRight } from 'lucide-react';
import { ExtractedEntity } from '../types';

interface GlobalThreatOriginMapProps {
  entities: ExtractedEntity[];
  onInspectGraph: () => void;
}

interface CountryHotspot {
  id: string;
  name: string;
  mapLabel: string;
  flag: string;
  x: number;
  y: number;
  labelX?: number;
  labelY?: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  threatCountLabel: string;
  ipCount: number;
  domainCount: number;
  caseIoc?: string;
  asnOrRail?: string;
}

const COUNTRY_HOTSPOTS: CountryHotspot[] = [
  {
    id: 'us-alaska',
    name: 'Alaska (USA)',
    mapLabel: 'ALASKA (USA)',
    flag: '🇺🇸',
    x: 108,
    y: 112,
    labelX: 108,
    labelY: 130,
    severity: 'HIGH',
    threatCountLabel: '4.2k',
    ipCount: 4210,
    domainCount: 1890,
    caseIoc: 'Edge DNS Relay Node',
  },
  {
    id: 'ca',
    name: 'Canada',
    mapLabel: 'C A N A D A',
    flag: '🇨🇦',
    x: 192,
    y: 150,
    labelX: 192,
    labelY: 182,
    severity: 'LOW',
    threatCountLabel: '310',
    ipCount: 310,
    domainCount: 145,
  },
  {
    id: 'us',
    name: 'United States',
    mapLabel: 'UNITED STATES OF AMERICA',
    flag: '🇺🇸',
    x: 206,
    y: 230,
    labelX: 206,
    labelY: 256,
    severity: 'HIGH',
    threatCountLabel: '16k',
    ipCount: 15432,
    domainCount: 8420,
    caseIoc: 'secure-hdfc-kyc-update.top',
    asnOrRail: 'Evilginx Reverse-Proxy CDN',
  },
  {
    id: 'mx',
    name: 'Mexico',
    mapLabel: 'MEXICO',
    flag: '🇲🇽',
    x: 182,
    y: 294,
    labelX: 182,
    labelY: 310,
    severity: 'LOW',
    threatCountLabel: '640',
    ipCount: 640,
    domainCount: 290,
  },
  {
    id: 'co',
    name: 'Colombia',
    mapLabel: 'COLOMBIA',
    flag: '🇨🇴',
    x: 274,
    y: 348,
    labelX: 274,
    labelY: 362,
    severity: 'LOW',
    threatCountLabel: '520',
    ipCount: 520,
    domainCount: 210,
  },
  {
    id: 've',
    name: 'Venezuela',
    mapLabel: 'VENEZUELA',
    flag: '🇻🇪',
    x: 304,
    y: 338,
    labelX: 304,
    labelY: 330,
    severity: 'HIGH',
    threatCountLabel: '6.8k',
    ipCount: 6789,
    domainCount: 2410,
  },
  {
    id: 'br',
    name: 'Brazil',
    mapLabel: 'B R A Z I L',
    flag: '🇧🇷',
    x: 332,
    y: 382,
    labelX: 332,
    labelY: 402,
    severity: 'MEDIUM',
    threatCountLabel: '6.6k',
    ipCount: 4120,
    domainCount: 6567,
  },
  {
    id: 'gl',
    name: 'Greenland (Denmark)',
    mapLabel: 'GREENLAND (DENMARK)',
    flag: '🇬🇱',
    x: 418,
    y: 78,
    labelX: 418,
    labelY: 112,
    severity: 'LOW',
    threatCountLabel: '18',
    ipCount: 18,
    domainCount: 9,
  },
  {
    id: 'no',
    name: 'Norway',
    mapLabel: 'NORWAY',
    flag: '🇳🇴',
    x: 534,
    y: 148,
    labelX: 528,
    labelY: 162,
    severity: 'MEDIUM',
    threatCountLabel: '56',
    ipCount: 84,
    domainCount: 56,
  },
  {
    id: 'se',
    name: 'Sweden',
    mapLabel: 'SWEDEN',
    flag: '🇸🇪',
    x: 560,
    y: 136,
    labelX: 560,
    labelY: 150,
    severity: 'LOW',
    threatCountLabel: '45',
    ipCount: 45,
    domainCount: 12,
  },
  {
    id: 'fi',
    name: 'Finland',
    mapLabel: 'FINLAND',
    flag: '🇫🇮',
    x: 590,
    y: 132,
    labelX: 590,
    labelY: 144,
    severity: 'LOW',
    threatCountLabel: '112',
    ipCount: 112,
    domainCount: 91,
  },
  {
    id: 'ie',
    name: 'Ireland',
    mapLabel: 'IRELAND',
    flag: '🇮🇪',
    x: 488,
    y: 186,
    labelX: 478,
    labelY: 198,
    severity: 'MEDIUM',
    threatCountLabel: '5.2k',
    ipCount: 2890,
    domainCount: 5234,
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    mapLabel: 'UNITED KINGDOM',
    flag: '🇬🇧',
    x: 506,
    y: 182,
    labelX: 506,
    labelY: 174,
    severity: 'MEDIUM',
    threatCountLabel: '4.9k',
    ipCount: 3410,
    domainCount: 4890,
    caseIoc: 'GB29NWBK60161331926819',
    asnOrRail: 'SWIFT Wire Clearing Hub',
  },
  {
    id: 'fr',
    name: 'France',
    mapLabel: 'FRANCE',
    flag: '🇫🇷',
    x: 518,
    y: 208,
    labelX: 518,
    labelY: 220,
    severity: 'MEDIUM',
    threatCountLabel: '3.1k',
    ipCount: 3120,
    domainCount: 1980,
  },
  {
    id: 'de',
    name: 'Germany',
    mapLabel: 'GERMANY',
    flag: '🇩🇪',
    x: 546,
    y: 192,
    labelX: 546,
    labelY: 204,
    severity: 'HIGH',
    threatCountLabel: '11.4k',
    ipCount: 11420,
    domainCount: 4310,
    caseIoc: '185.220.101.44 (AS205100)',
    asnOrRail: 'Bulletproof C2 Relay Host',
  },
  {
    id: 'ch',
    name: 'Switzerland',
    mapLabel: 'SWITZERLAND',
    flag: '🇨🇭',
    x: 540,
    y: 212,
    labelX: 540,
    labelY: 224,
    severity: 'LOW',
    threatCountLabel: '23',
    ipCount: 23,
    domainCount: 19,
  },
  {
    id: 'dz',
    name: 'Algeria',
    mapLabel: 'A L G E R I A',
    flag: '🇩🇿',
    x: 518,
    y: 274,
    labelX: 518,
    labelY: 266,
    severity: 'MEDIUM',
    threatCountLabel: '1.8k',
    ipCount: 1840,
    domainCount: 920,
  },
  {
    id: 'ml',
    name: 'Mali',
    mapLabel: 'M A L I',
    flag: '🇲🇱',
    x: 484,
    y: 306,
    labelX: 508,
    labelY: 308,
    severity: 'MEDIUM',
    threatCountLabel: '1.2k',
    ipCount: 1210,
    domainCount: 640,
  },
  {
    id: 'ru',
    name: 'Russia',
    mapLabel: 'R U S S I A',
    flag: '🇷🇺',
    x: 772,
    y: 126,
    labelX: 772,
    labelY: 152,
    severity: 'MEDIUM',
    threatCountLabel: '7.9k',
    ipCount: 6420,
    domainCount: 7891,
    caseIoc: '91.219.236.174',
  },
  {
    id: 'kz',
    name: 'Kazakhstan',
    mapLabel: 'K A Z A K H S T A N',
    flag: '🇰🇿',
    x: 714,
    y: 196,
    labelX: 714,
    labelY: 212,
    severity: 'LOW',
    threatCountLabel: '410',
    ipCount: 410,
    domainCount: 190,
  },
  {
    id: 'ir',
    name: 'Iran',
    mapLabel: 'I R A N',
    flag: '🇮🇷',
    x: 678,
    y: 252,
    labelX: 678,
    labelY: 244,
    severity: 'MEDIUM',
    threatCountLabel: '2.9k',
    ipCount: 2890,
    domainCount: 1420,
  },
  {
    id: 'in',
    name: 'India',
    mapLabel: 'I N D I A',
    flag: '🇮🇳',
    x: 768,
    y: 288,
    labelX: 768,
    labelY: 280,
    severity: 'HIGH',
    threatCountLabel: '9.6k',
    ipCount: 9640,
    domainCount: 4120,
    caseIoc: '+919820411892 · apex.verify@okaxis',
    asnOrRail: 'NPCI UPI / IMPS Mule Ring',
  },
  {
    id: 'cn',
    name: 'China',
    mapLabel: 'C H I N A',
    flag: '🇨🇳',
    x: 814,
    y: 238,
    labelX: 814,
    labelY: 256,
    severity: 'HIGH',
    threatCountLabel: '12.9k',
    ipCount: 12891,
    domainCount: 6120,
    caseIoc: 'TQn9Y2khEsLJW1ChVWFMS…',
    asnOrRail: 'Offshore TRC-20 USDT Liquidity',
  },
  {
    id: 'jp',
    name: 'Japan',
    mapLabel: 'JAPAN',
    flag: '🇯🇵',
    x: 944,
    y: 236,
    labelX: 944,
    labelY: 226,
    severity: 'MEDIUM',
    threatCountLabel: '2.1k',
    ipCount: 2140,
    domainCount: 980,
  },
  {
    id: 'id',
    name: 'Indonesia',
    mapLabel: 'I N D O N E S I A',
    flag: '🇮🇩',
    x: 888,
    y: 356,
    labelX: 904,
    labelY: 372,
    severity: 'LOW',
    threatCountLabel: '780',
    ipCount: 780,
    domainCount: 340,
  },
];

export const GlobalThreatOriginMap: React.FC<GlobalThreatOriginMapProps> = ({
  entities,
  onInspectGraph,
}) => {
  const [selectedCountryId, setSelectedCountryId] = useState<string>('us');
  const [feedMode, setFeedMode] = useState<'DOMAIN' | 'IP'>('DOMAIN');
  const [timeframe, setTimeframe] = useState<'LAST_DAY' | 'LAST_7D' | 'ALL_TIME'>(
    'LAST_DAY'
  );
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [showAttackArcs, setShowAttackArcs] = useState<boolean>(true);

  const selectedHotspot = useMemo(
    () =>
      COUNTRY_HOTSPOTS.find((c) => c.id === selectedCountryId) ||
      COUNTRY_HOTSPOTS[2],
    [selectedCountryId]
  );

  const totalFeedsDisplay = useMemo(() => {
    const base =
      feedMode === 'DOMAIN'
        ? 457354567
        : 389120445;
    const mult =
      timeframe === 'LAST_DAY' ? 1 : timeframe === 'LAST_7D' ? 4 : 12;
    return (base * mult + entities.length * 142).toLocaleString();
  }, [feedMode, timeframe, entities.length]);

  const dotColor = (sev: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (sev === 'HIGH') return '#ef4444';
    if (sev === 'MEDIUM') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div
      className="rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden text-slate-100 select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 18%, #141923 0%, #0b0d12 65%, #080a0e 100%)',
      }}
    >
      {/* Top Header Bar (Modeled on image-1.png CORETIS Header) */}
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
        {/* Left: Brand & Map Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-wider text-white uppercase">
                CORETIS
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold tracking-wider uppercase">
                BETA
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
                · Global Threat &amp; Infrastructure Origin Map
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cross-Border C2 Relay, Phishing Domain &amp; Financial Mule Telemetry
            </p>
          </div>
        </div>

        {/* Center: Total Threat Feeds Counter */}
        <div className="text-center">
          <div className="text-[11px] font-semibold text-slate-400 tracking-wide">
            Total Threat Feeds
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold text-blue-500 tracking-tight">
            {totalFeedsDisplay}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAttackArcs((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              showAttackArcs
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {showAttackArcs ? 'Attack Arcs: ON' : 'Attack Arcs: OFF'}
          </button>
          <button
            type="button"
            onClick={onInspectGraph}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
          >
            <span>Inspect in Graph</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main World Map Canvas (Ref: image-1.png) */}
      <div className="relative px-4 py-2 overflow-hidden">
        <svg
          viewBox="0 0 1100 450"
          className="w-full h-[340px] sm:h-[390px] transition-transform duration-200"
          style={{
            transform: `scale(${mapZoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            <filter id="glow-dot" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="arc-grad-red" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Geopolitical World Landmasses & Country Borders (#1c2026 fill, #2d333d stroke) */}
          <g
            fill="#1c2026"
            stroke="#2e3440"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            {/* Alaska */}
            <path d="M 55,90 L 130,82 L 142,125 L 95,135 L 48,120 Z" />
            {/* Canada */}
            <path d="M 132,85 L 255,75 L 318,110 L 335,165 L 285,195 L 145,188 L 128,140 Z" />
            {/* Greenland & Svalbard & Iceland */}
            <path d="M 355,32 L 478,24 L 492,85 L 435,132 L 378,118 Z" />
            <path d="M 542,46 L 574,42 L 578,60 L 546,62 Z" />
            <path d="M 442,138 L 470,136 L 472,150 L 444,152 Z" />
            {/* United States */}
            <path d="M 135,188 L 292,192 L 304,232 L 268,274 L 154,270 L 126,228 Z" />
            {/* Mexico & Central America */}
            <path d="M 154,270 L 222,272 L 246,322 L 214,332 L 166,304 Z" />
            {/* Colombia & Venezuela */}
            <path d="M 254,324 L 322,324 L 334,360 L 258,365 Z" />
            {/* Brazil & South America */}
            <path d="M 258,365 L 334,360 L 386,378 L 374,432 L 288,444 L 264,405 Z" />

            {/* UK & Ireland */}
            <path d="M 476,174 L 494,174 L 494,194 L 476,194 Z" />
            <path d="M 496,162 L 518,164 L 522,196 L 496,196 Z" />
            {/* Scandinavia (Norway, Sweden, Finland) */}
            <path d="M 522,102 L 598,96 L 608,158 L 564,166 L 520,156 Z" />
            {/* Western & Central Europe (France, Spain, Germany, Italy, Poland, Ukraine) */}
            <path d="M 484,202 L 542,196 L 544,232 L 478,246 Z" />
            <path d="M 542,176 L 596,174 L 604,218 L 542,222 Z" />
            <path d="M 538,222 L 572,222 L 578,252 L 546,254 Z" />
            <path d="M 596,174 L 656,176 L 662,226 L 598,224 Z" />

            {/* Africa (North, West, East, Central, South) */}
            <path d="M 456,254 L 562,250 L 566,302 L 446,304 Z" />
            <path d="M 562,254 L 638,256 L 642,306 L 566,302 Z" />
            <path d="M 446,304 L 558,302 L 564,354 L 456,352 Z" />
            <path d="M 558,302 L 654,306 L 648,368 L 564,354 Z" />
            <path d="M 518,354 L 624,358 L 608,434 L 538,434 Z" />
            <path d="M 642,388 L 660,386 L 658,422 L 640,422 Z" />

            {/* Middle East (Turkey, Iraq, Iran, Saudi Arabia) */}
            <path d="M 612,228 L 678,226 L 682,248 L 614,248 Z" />
            <path d="M 632,248 L 716,242 L 724,296 L 644,302 Z" />

            {/* Russia & Northern Eurasia */}
            <path d="M 604,82 L 986,76 L 1018,142 L 928,186 L 654,182 L 604,154 Z" />
            {/* Kazakhstan & Central Asia */}
            <path d="M 662,182 L 778,182 L 784,226 L 668,228 Z" />
            {/* Mongolia */}
            <path d="M 784,184 L 882,184 L 886,214 L 786,216 Z" />
            {/* China & East Asia */}
            <path d="M 762,216 L 916,204 L 932,276 L 824,298 L 764,268 Z" />
            {/* India & South Asia */}
            <path d="M 724,256 L 808,262 L 792,336 L 758,342 L 728,292 Z" />
            {/* Japan */}
            <path d="M 936,214 L 960,214 L 956,256 L 934,254 Z" />
            {/* Southeast Asia & Indonesia */}
            <path d="M 824,298 L 878,302 L 874,344 L 826,340 Z" />
            <path d="M 832,352 L 968,350 L 976,384 L 836,382 Z" />
            {/* Australia */}
            <path d="M 868,392 L 982,390 L 990,440 L 874,442 Z" />
          </g>

          {/* Country Labels on Map (Ref: image-1.png spaced uppercase labels) */}
          <g
            fill="#8b95a5"
            fontSize="7.5"
            fontWeight="700"
            letterSpacing="0.14em"
            textAnchor="middle"
            className="pointer-events-none"
          >
            <text x="96" y="130">ALASKA (USA)</text>
            <text x="198" y="176" fontSize="9">C A N A D A</text>
            <text x="208" y="254" fontSize="8">UNITED STATES OF AMERICA</text>
            <text x="186" y="308">MEXICO</text>
            <text x="278" y="358">COLOMBIA</text>
            <text x="332" y="402" fontSize="9">B R A Z I L</text>
            <text x="422" y="106">GREENLAND (DENMARK)</text>
            <text x="556" y="54">SVALBARD (NORWAY)</text>
            <text x="502" y="172" fontSize="6.5">UK</text>
            <text x="514" y="220">FRANCE</text>
            <text x="492" y="242">SPAIN</text>
            <text x="556" y="206">GERMANY</text>
            <text x="556" y="242">ITALY</text>
            <text x="618" y="204">UKRAINE</text>
            <text x="512" y="274">A L G E R I A</text>
            <text x="562" y="276">L I B Y A</text>
            <text x="608" y="278">E G Y P T</text>
            <text x="496" y="314">M A L I</text>
            <text x="542" y="314">N I G E R</text>
            <text x="576" y="324">C H A D</text>
            <text x="614" y="324">S U D A N</text>
            <text x="668" y="282">SAUDI ARABIA</text>
            <text x="682" y="246">I R A N</text>
            <text x="774" y="150" fontSize="10">R U S S I A</text>
            <text x="716" y="208">K A Z A K H S T A N</text>
            <text x="836" y="202">M O N G O L I A</text>
            <text x="826" y="258" fontSize="9.5">C H I N A</text>
            <text x="766" y="298" fontSize="8.5">I N D I A</text>
            <text x="948" y="228">JAPAN</text>
            <text x="904" y="372">I N D O N E S I A</text>
            <text x="928" y="422">A U S T R A L I A</text>
          </g>

          {/* Optional Cross-Border Forensic Attack Correlation Arcs */}
          {showAttackArcs && (
            <g fill="none" stroke="url(#arc-grad-red)" strokeWidth="1.8" strokeDasharray="5 4">
              {/* US (206, 230) -> UK (506, 182) */}
              <path d="M 206 230 Q 355 120 506 182" />
              {/* UK (506, 182) -> Germany C2 (546, 192) */}
              <path d="M 506 182 Q 526 165 546 192" />
              {/* Germany C2 (546, 192) -> India UPI Rail (768, 288) */}
              <path d="M 546 192 Q 665 185 768 288" />
              {/* India UPI Rail (768, 288) -> China/Offshore USDT (814, 238) */}
              <path d="M 768 288 Q 795 250 814 238" />
            </g>
          )}

          {/* Glowing Severity Dots on Countries (Ref: image-1.png) */}
          {COUNTRY_HOTSPOTS.map((spot) => {
            const isSelected = spot.id === selectedCountryId;
            const color = dotColor(spot.severity);
            return (
              <g
                key={spot.id}
                transform={`translate(${spot.x}, ${spot.y})`}
                onClick={() => setSelectedCountryId(spot.id)}
                onMouseEnter={() => setSelectedCountryId(spot.id)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <circle
                    r="13"
                    fill={color}
                    fillOpacity="0.22"
                    stroke={color}
                    strokeWidth="1.2"
                  />
                )}
                <circle
                  r={isSelected ? '5.5' : '4.2'}
                  fill={color}
                  filter="url(#glow-dot)"
                  stroke="#0b0d12"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}

          {/* Interactive Floating Country Tooltip Card (Modeled 1:1 on image-1.png "🇺🇸 United States Threats:16k") */}
          {selectedHotspot && (
            <g
              transform={`translate(${Math.min(
                840,
                Math.max(30, selectedHotspot.x + 14)
              )}, ${Math.max(24, selectedHotspot.y - 44)})`}
              onClick={onInspectGraph}
              className="cursor-pointer"
            >
              <rect
                width="225"
                height={selectedHotspot.caseIoc ? '52' : '36'}
                rx="9"
                fill="#12151c"
                fillOpacity="0.95"
                stroke={dotColor(selectedHotspot.severity)}
                strokeOpacity="0.7"
                strokeWidth="1.3"
              />
              <text x="12" y="22" fontSize="12" fill="#ffffff" fontWeight="700">
                {selectedHotspot.flag} {selectedHotspot.name}
              </text>
              <text
                x="213"
                y="22"
                textAnchor="end"
                fontSize="11.5"
                fontFamily="monospace"
                fontWeight="800"
                fill={dotColor(selectedHotspot.severity)}
              >
                Threats:{selectedHotspot.threatCountLabel}
              </text>
              {selectedHotspot.caseIoc && (
                <text
                  x="12"
                  y="41"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fill="#94a3b8"
                >
                  IOC: {selectedHotspot.caseIoc}
                </text>
              )}
            </g>
          )}
        </svg>

        {/* Top-Right Vertical Zoom Pill (+ / - Ref: image-1.png) */}
        <div className="absolute top-4 right-5 bg-[#141820]/90 backdrop-blur border border-white/10 rounded-full flex flex-col overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() =>
              setMapZoom((z) => Math.min(1.35, +(z + 0.12).toFixed(2)))
            }
            className="p-2.5 text-slate-300 hover:text-white hover:bg-white/5 border-b border-white/10 transition"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setMapZoom((z) => Math.max(0.85, +(z - 0.12).toFixed(2)))
            }
            className="p-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Map Overlay Controls Row: Left (Domain | IP) + Center (High | Medium | Low Legend) */}
        <div className="px-3 pb-2 flex flex-wrap items-center justify-between gap-3">
          {/* Bottom-Left: Domain | IP Capsule Switcher (Ref: image-1.png) */}
          <div className="inline-flex items-center bg-[#141820] border border-white/10 rounded-full p-1">
            <button
              type="button"
              onClick={() => setFeedMode('DOMAIN')}
              className={`px-4 py-1 rounded-full text-xs font-bold transition ${
                feedMode === 'DOMAIN'
                  ? 'bg-[#222733] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Domain
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('IP')}
              className={`px-4 py-1 rounded-full text-xs font-bold transition ${
                feedMode === 'IP'
                  ? 'bg-[#222733] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              IP
            </button>
          </div>

          {/* Bottom-Center: Severity Legend Pill (Ref: image-1.png) */}
          <div className="inline-flex items-center gap-5 bg-[#141820] border border-white/10 rounded-xl px-4 py-1.5 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_8px_#ef4444]" />
              High
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-[0_0_8px_#f59e0b]" />
              Medium
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#22c55e]" />
              Low
            </span>
          </div>

          <div className="hidden sm:block text-[11px] font-mono text-slate-400">
            Click any country marker to inspect telemetry
          </div>
        </div>
      </div>

      {/* Bottom Section: Threat Feed Statistics + 4 Country Ranking Cards (Modeled 1:1 on image-1.png) */}
      <div className="px-6 pt-3 pb-5 border-t border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
            Threat Feed Statistics
          </h4>

          {/* Timeframe Selector (Last Day v) */}
          <div className="relative inline-flex items-center">
            <select
              aria-label="Threat Feed Time Window"
              value={timeframe}
              onChange={(e) =>
                setTimeframe(
                  e.target.value as 'LAST_DAY' | 'LAST_7D' | 'ALL_TIME'
                )
              }
              className="appearance-none bg-[#141820] hover:bg-[#1c222d] border border-white/10 rounded-xl pl-3.5 pr-8 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="LAST_DAY">Last Day</option>
              <option value="LAST_7D">Last 7 Days</option>
              <option value="ALL_TIME">Case Window</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>

        {/* 4 Statistics Cards Grid (Ref: image-1.png) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Most Malicious IPs */}
          <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-400">
              Most Malicious IPs
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                { id: 'us', flag: '🇺🇸', name: 'United States', count: '15,432' },
                { id: 'cn', flag: '🇨🇳', name: 'China', count: '12,891' },
                { id: 'de', flag: '🇩🇪', name: 'Germany (C2)', count: '11,420' },
                { id: 've', flag: '🇻🇪', name: 'Venezuela', count: '6,789' },
              ].map((row) => (
                <div
                  key={row.id}
                  onClick={() => setSelectedCountryId(row.id)}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/5 px-1.5 py-1 rounded-lg transition"
                >
                  <span className="flex items-center gap-2 text-slate-200 font-medium">
                    <span>{row.flag}</span>
                    <span>{row.name}</span>
                  </span>
                  <span className="font-mono font-bold text-red-500">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Most Malicious Domains */}
          <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-400">
              Most Malicious Domains
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                { id: 'ru', flag: '🇷🇺', name: 'Russia', count: '7,891' },
                { id: 'br', flag: '🇧🇷', name: 'Brazil', count: '6,567' },
                { id: 'ie', flag: '🇮🇪', name: 'Ireland', count: '5,234' },
                { id: 'in', flag: '🇮🇳', name: 'India (Phish)', count: '4,120' },
              ].map((row) => (
                <div
                  key={row.id}
                  onClick={() => setSelectedCountryId(row.id)}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/5 px-1.5 py-1 rounded-lg transition"
                >
                  <span className="flex items-center gap-2 text-slate-200 font-medium">
                    <span>{row.flag}</span>
                    <span>{row.name}</span>
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Least Malicious IPs */}
          <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-400">
              Least Malicious IPs
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                { id: 'ch', flag: '🇨🇭', name: 'Switzerland', count: '23' },
                { id: 'se', flag: '🇸🇪', name: 'Sweden', count: '45' },
                { id: 'fi', flag: '🇫🇮', name: 'Finland', count: '112' },
                { id: 'gl', flag: '🇬🇱', name: 'Greenland', count: '18' },
              ].map((row) => (
                <div
                  key={row.id}
                  onClick={() => setSelectedCountryId(row.id)}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/5 px-1.5 py-1 rounded-lg transition"
                >
                  <span className="flex items-center gap-2 text-slate-200 font-medium">
                    <span>{row.flag}</span>
                    <span>{row.name}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Least Malicious Domains */}
          <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-400">
              Least Malicious Domains
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                { id: 'se', flag: '🇸🇪', name: 'Sweden', count: '12' },
                { id: 'no', flag: '🇳🇴', name: 'Norway', count: '56' },
                { id: 'fi', flag: '🇫🇮', name: 'Finland', count: '91' },
                { id: 'ca', flag: '🇨🇦', name: 'Canada', count: '145' },
              ].map((row) => (
                <div
                  key={row.id}
                  onClick={() => setSelectedCountryId(row.id)}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/5 px-1.5 py-1 rounded-lg transition"
                >
                  <span className="flex items-center gap-2 text-slate-200 font-medium">
                    <span>{row.flag}</span>
                    <span>{row.name}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Live Sync Status (Ref: image-1.png bottom bar) */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Data Syncing · Active Case Geo-Correlation Enabled</span>
          </div>
          <div>
            Selected Origin:{' '}
            <strong className="text-slate-200">
              {selectedHotspot.flag} {selectedHotspot.name}
            </strong>{' '}
            ({selectedHotspot.caseIoc || 'Global Threat Telemetry'})
          </div>
        </div>
      </div>
    </div>
  );
};
