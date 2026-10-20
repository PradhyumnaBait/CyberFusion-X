import React, { useState, useMemo } from 'react';
import {
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Crosshair,
  ArrowUpRight,
  Globe,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
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
  isCaseCorrelated?: boolean;
}

const COUNTRY_HOTSPOTS: CountryHotspot[] = [
  {
    id: 'us-alaska',
    name: 'Alaska (USA)',
    mapLabel: 'ALASKA (USA)',
    flag: '🇺🇸',
    x: 108,
    y: 112,
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
    severity: 'HIGH',
    threatCountLabel: '16.4k',
    ipCount: 15432,
    domainCount: 8420,
    caseIoc: 'secure-hdfc-kyc-update.top',
    asnOrRail: 'Evilginx Reverse-Proxy CDN',
    isCaseCorrelated: true,
  },
  {
    id: 'mx',
    name: 'Mexico',
    mapLabel: 'MEXICO',
    flag: '🇲🇽',
    x: 182,
    y: 294,
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
    severity: 'MEDIUM',
    threatCountLabel: '6.6k',
    ipCount: 4120,
    domainCount: 6567,
  },
  {
    id: 'gl',
    name: 'Greenland (Denmark)',
    mapLabel: 'GREENLAND',
    flag: '🇬🇱',
    x: 418,
    y: 78,
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
    severity: 'LOW',
    threatCountLabel: '32',
    ipCount: 32,
    domainCount: 8,
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    mapLabel: 'UK',
    flag: '🇬🇧',
    x: 506,
    y: 182,
    severity: 'HIGH',
    threatCountLabel: '11.8k',
    ipCount: 11840,
    domainCount: 5410,
    caseIoc: '104.21.68.91 · SWIFT Wire Hub',
    asnOrRail: 'Cloudflare Proxy Hop / UK Clearing',
    isCaseCorrelated: true,
  },
  {
    id: 'fr',
    name: 'France',
    mapLabel: 'FRANCE',
    flag: '🇫🇷',
    x: 518,
    y: 216,
    severity: 'LOW',
    threatCountLabel: '180',
    ipCount: 180,
    domainCount: 94,
  },
  {
    id: 'es',
    name: 'Spain',
    mapLabel: 'SPAIN',
    flag: '🇪🇸',
    x: 486,
    y: 236,
    severity: 'LOW',
    threatCountLabel: '92',
    ipCount: 92,
    domainCount: 41,
  },
  {
    id: 'de',
    name: 'Germany (C2 Bulletproof)',
    mapLabel: 'GERMANY',
    flag: '🇩🇪',
    x: 546,
    y: 192,
    severity: 'HIGH',
    threatCountLabel: '18.2k',
    ipCount: 18230,
    domainCount: 9640,
    caseIoc: '185.220.101.44 (AS205100)',
    asnOrRail: 'F3 Netze Bulletproof C2 / Evilginx Relay',
    isCaseCorrelated: true,
  },
  {
    id: 'ru',
    name: 'Russian Federation',
    mapLabel: 'R U S S I A',
    flag: '🇷🇺',
    x: 760,
    y: 140,
    severity: 'HIGH',
    threatCountLabel: '14.1k',
    ipCount: 14120,
    domainCount: 7890,
    caseIoc: '91.219.236.174',
    asnOrRail: 'Bulletproof Fast-Flux Hosting',
  },
  {
    id: 'in',
    name: 'India (Victim Origin & Mule Hub)',
    mapLabel: 'I N D I A',
    flag: '🇮🇳',
    x: 768,
    y: 288,
    severity: 'HIGH',
    threatCountLabel: '9.6k',
    ipCount: 9640,
    domainCount: 4120,
    caseIoc: '+919820411892 · apex.verify.settlement@okaxis',
    asnOrRail: 'NPCI UPI / IMPS Mule Ring',
    isCaseCorrelated: true,
  },
  {
    id: 'cn',
    name: 'China',
    mapLabel: 'C H I N A',
    flag: '🇨🇳',
    x: 824,
    y: 248,
    severity: 'HIGH',
    threatCountLabel: '12.9k',
    ipCount: 12891,
    domainCount: 8120,
    caseIoc: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    asnOrRail: 'Tron TRC-20 USDT OTC Cashout',
    isCaseCorrelated: true,
  },
  {
    id: 'jp',
    name: 'Japan',
    mapLabel: 'JAPAN',
    flag: '🇯🇵',
    x: 946,
    y: 226,
    severity: 'LOW',
    threatCountLabel: '420',
    ipCount: 420,
    domainCount: 310,
  },
  {
    id: 'id',
    name: 'Indonesia',
    mapLabel: 'I N D O N E S I A',
    flag: '🇮🇩',
    x: 894,
    y: 366,
    severity: 'LOW',
    threatCountLabel: '780',
    ipCount: 780,
    domainCount: 390,
  },
  {
    id: 'au',
    name: 'Australia',
    mapLabel: 'A U S T R A L I A',
    flag: '🇦🇺',
    x: 918,
    y: 416,
    severity: 'LOW',
    threatCountLabel: '240',
    ipCount: 240,
    domainCount: 110,
  },
];

export const GlobalThreatOriginMap: React.FC<GlobalThreatOriginMapProps> = ({
  entities,
  onInspectGraph,
}) => {
  const [selectedCountryId, setSelectedCountryId] = useState<string>('de');
  const [feedMode, setFeedMode] = useState<'DOMAIN' | 'IP'>('IP');
  const [timeframe, setTimeframe] = useState<'LAST_DAY' | 'LAST_7D' | 'ALL_TIME'>('ALL_TIME');
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [showAttackArcs, setShowAttackArcs] = useState<boolean>(true);

  const selectedHotspot = useMemo(
    () =>
      COUNTRY_HOTSPOTS.find((c) => c.id === selectedCountryId) ||
      COUNTRY_HOTSPOTS[14], // default to Germany C2
    [selectedCountryId]
  );

  const dotColor = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (severity) {
      case 'HIGH':
        return '#ef4444';
      case 'MEDIUM':
        return '#f59e0b';
      case 'LOW':
        return '#22c55e';
    }
  };

  return (
    <div className="bg-[#0B0F19] text-slate-100 rounded-xl border border-slate-800 shadow-xl overflow-hidden relative flex flex-col min-w-0 font-sans">
      {/* ── Top HUD Bar ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Cross-Jurisdiction Infrastructure &amp; Attack Origins</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-[10px] font-bold">
              {entities.length} correlated IOCs
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate max-w-xl">
            Live telemetry correlating seized relays (Germany C2 185.220.101.44) with India origin and offshore crypto settlement
          </p>
        </div>

        {/* HUD Segmented & Tactical Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Domain / IP Mode Segmented Switch */}
          <div className="inline-flex items-center bg-slate-950 border border-slate-700/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setFeedMode('DOMAIN')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                feedMode === 'DOMAIN'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Domain
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('IP')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                feedMode === 'IP'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              IP View
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="relative inline-flex items-center">
            <select
              aria-label="Threat Feed Time Window"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-lg pl-2.5 pr-7 py-1 text-[11px] font-mono font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="LAST_DAY">Last 24h</option>
              <option value="LAST_7D">Last 7d</option>
              <option value="ALL_TIME">All-Time</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Attack Vector Toggle */}
          <button
            type="button"
            onClick={() => setShowAttackArcs(!showAttackArcs)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition cursor-pointer ${
              showAttackArcs
                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {showAttackArcs ? 'Vectors: ON' : 'Vectors: OFF'}
          </button>

          {/* Inspect in Graph CTA */}
          <button
            onClick={onInspectGraph}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <span>Graph View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main Map Canvas Viewport ────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden p-3 bg-[#0B0F19] min-h-[380px] flex items-center justify-center">
        <svg
          viewBox="0 0 1024 512"
          className="w-full h-auto select-none block"
          style={{
            transform: `scale(${mapZoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <defs>
            <style>{`
              @keyframes packetFlowForward {
                from { stroke-dashoffset: 44; }
                to { stroke-dashoffset: 0; }
              }
              @keyframes packetFlowBackward {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: 44; }
              }
              .packet-stream-cyan {
                animation: packetFlowForward 2s linear infinite;
              }
              .packet-stream-magenta {
                animation: packetFlowForward 2.4s linear infinite;
              }
            `}</style>

            <filter id="glow-dot" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="stream-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="stream-magenta" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#ec4899" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Coordinate Graticule Grid (Subtle Latitude & Longitude) */}
          <g stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3">
            <line x1="0" y1="128" x2="1024" y2="128" />
            <line x1="0" y1="256" x2="1024" y2="256" />
            <line x1="0" y1="384" x2="1024" y2="384" />
            <line x1="256" y1="0" x2="256" y2="512" />
            <line x1="512" y1="0" x2="512" y2="512" />
            <line x1="768" y1="0" x2="768" y2="512" />
          </g>

          {/* Detailed Continental Vector Landmasses */}
          <g fill="#131C2E" stroke="#263554" strokeWidth="1.2" strokeLinejoin="round">
            {/* North America: Alaska */}
            <path d="M 45,95 Q 85,80 132,84 Q 146,110 138,135 Q 90,145 42,125 Z" />
            {/* Canada */}
            <path d="M 132,84 Q 220,70 280,72 Q 330,95 345,155 Q 310,195 270,195 Q 160,192 135,170 Q 128,125 132,84 Z" />
            {/* Greenland */}
            <path d="M 360,35 Q 465,22 485,75 Q 480,120 425,130 Q 375,115 360,35 Z" />
            {/* Contiguous United States */}
            <path d="M 138,192 Q 275,192 300,196 Q 312,238 275,274 Q 190,274 150,268 Q 125,230 138,192 Z" />
            {/* Mexico & Central America */}
            <path d="M 150,268 Q 220,274 242,318 Q 225,335 175,310 Z" />
            {/* South America: Colombia & Venezuela */}
            <path d="M 252,326 Q 320,320 338,355 Q 260,365 252,326 Z" />
            {/* South America: Brazil, Peru, Chile, Argentina */}
            <path d="M 260,365 Q 340,355 390,380 Q 380,440 300,480 Q 268,440 260,365 Z" />

            {/* British Isles */}
            <path d="M 478,172 Q 492,170 492,192 Q 476,192 478,172 Z" />
            <path d="M 498,160 Q 520,162 520,194 Q 498,194 498,160 Z" />
            {/* Scandinavia */}
            <path d="M 524,100 Q 590,92 602,148 Q 560,164 520,152 Z" />
            {/* Western & Central Europe */}
            <path d="M 486,200 Q 544,194 544,232 Q 476,246 486,200 Z" />
            <path d="M 544,174 Q 600,172 606,218 Q 544,222 544,174 Z" />
            <path d="M 536,220 Q 574,220 578,256 Q 544,256 536,220 Z" />
            <path d="M 598,172 Q 662,174 664,228 Q 598,224 598,172 Z" />

            {/* Africa */}
            <path d="M 452,252 Q 564,248 566,302 Q 444,304 452,252 Z" />
            <path d="M 564,250 Q 644,254 646,306 Q 566,302 564,250 Z" />
            <path d="M 444,304 Q 560,302 566,356 Q 452,354 444,304 Z" />
            <path d="M 560,302 Q 656,306 652,368 Q 566,356 560,302 Z" />
            <path d="M 518,356 Q 628,358 612,438 Q 536,438 518,356 Z" />
            <path d="M 640,388 Q 662,386 660,424 Q 638,424 640,388 Z" />

            {/* Middle East */}
            <path d="M 612,226 Q 682,224 684,248 Q 612,248 612,226 Z" />
            <path d="M 632,248 Q 720,242 724,298 Q 642,302 632,248 Z" />

            {/* Northern Eurasia & Russia */}
            <path d="M 602,80 Q 986,72 1018,140 Q 930,186 654,180 Q 602,150 602,80 Z" />
            {/* Central Asia */}
            <path d="M 662,180 Q 782,180 786,226 Q 666,228 662,180 Z" />
            {/* China & East Asia */}
            <path d="M 762,214 Q 922,200 934,274 Q 822,298 764,266 Z" />
            {/* India & South Asia */}
            <path d="M 722,256 Q 810,260 796,338 Q 756,346 724,290 Z" />
            {/* Japan */}
            <path d="M 936,212 Q 962,212 958,258 Q 934,256 936,212 Z" />
            {/* Southeast Asia & Indonesia */}
            <path d="M 822,298 Q 882,300 878,344 Q 824,342 822,298 Z" />
            <path d="M 830,352 Q 970,350 978,386 Q 834,384 830,352 Z" />
            {/* Australia */}
            <path d="M 866,392 Q 984,390 990,442 Q 872,444 866,392 Z" />
          </g>

          {/* ── Animated Bouncing Attack Trajectories (2 Stacked Layers) ─────── */}
          {showAttackArcs && (
            <g fill="none">
              {/* Trajectory 1: India Origin (768, 288) -> Germany C2 Relay (546, 192) */}
              {/* Layer 1: Base Glow */}
              <path
                d="M 768 288 Q 650 130 546 192"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeOpacity="0.25"
              />
              {/* Layer 2: Animated Packet Stream */}
              <path
                d="M 768 288 Q 650 130 546 192"
                stroke="url(#stream-cyan)"
                strokeWidth="2.5"
                strokeDasharray="8 14"
                className="packet-stream-cyan"
              />

              {/* Trajectory 2: Germany C2 (546, 192) -> US Phishing Ingress (206, 230) */}
              <path
                d="M 206 230 Q 370 110 546 192"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeOpacity="0.22"
              />
              <path
                d="M 206 230 Q 370 110 546 192"
                stroke="url(#stream-cyan)"
                strokeWidth="2.5"
                strokeDasharray="8 14"
                className="packet-stream-cyan"
              />

              {/* Trajectory 3: India Mule Ring (768, 288) -> China / Offshore USDT (824, 248) */}
              <path
                d="M 768 288 Q 805 210 824 248"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeOpacity="0.30"
              />
              <path
                d="M 768 288 Q 805 210 824 248"
                stroke="url(#stream-magenta)"
                strokeWidth="2.5"
                strokeDasharray="7 12"
                className="packet-stream-magenta"
              />

              {/* Trajectory 4: Germany (546, 192) -> UK Wire Hop (506, 182) */}
              <path
                d="M 546 192 Q 526 160 506 182"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeOpacity="0.25"
              />
              <path
                d="M 546 192 Q 526 160 506 182"
                stroke="url(#stream-magenta)"
                strokeWidth="2"
                strokeDasharray="6 10"
                className="packet-stream-magenta"
              />
            </g>
          )}

          {/* ── Pulsing Concentric Target Reticles ───────────────────────────── */}
          {COUNTRY_HOTSPOTS.map((spot) => {
            const isSelected = spot.id === selectedCountryId;
            const color = dotColor(spot.severity);

            return (
              <g
                key={spot.id}
                transform={`translate(${spot.x}, ${spot.y})`}
                onClick={() => setSelectedCountryId(spot.id)}
                className="cursor-pointer"
              >
                {/* Outer concentric pulsing ring */}
                <circle
                  r={isSelected ? '16' : '12'}
                  fill={color}
                  fillOpacity="0.18"
                  className="animate-pulse"
                />

                {/* Tactical reticle dashed ring */}
                <circle
                  r={isSelected ? '9' : '7'}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />

                {/* High-luminance center point */}
                <circle
                  r={isSelected ? '5.5' : '4'}
                  fill={color}
                  filter="url(#glow-dot)"
                  stroke="#0B0F19"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* Reference-Styled Non-Clipping Monospace Label Badges */}
          {/* India Origin Callout */}
          <g transform="translate(690, 275)" className="pointer-events-none select-none">
            <rect
              width="145"
              height="38"
              rx="6"
              fill="#0F172A"
              fillOpacity="0.88"
              stroke="#06b6d4"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <text x="10" y="16" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="700">
              ORIGIN: IN [India]
            </text>
            <text x="10" y="29" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Mule Ring +919820411892
            </text>
          </g>

          {/* Germany C2 Relay Callout */}
          <g transform="translate(450, 120)" className="pointer-events-none select-none">
            <rect
              width="175"
              height="40"
              rx="6"
              fill="#0F172A"
              fillOpacity="0.88"
              stroke="#ef4444"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <text x="10" y="16" fill="#fca5a5" fontSize="10" fontFamily="monospace" fontWeight="700">
              HOP 1: DE [Germany]
            </text>
            <text x="10" y="30" fill="#f87171" fontSize="9" fontFamily="monospace">
              C2: 185.220.101.44 (AS205100)
            </text>
          </g>

          {/* Bottom Coordinate Telemetry Strip on Map */}
          <g transform="translate(660, 480)" className="pointer-events-none select-none">
            <rect
              width="350"
              height="24"
              rx="4"
              fill="#0B0F19"
              fillOpacity="0.9"
              stroke="#1E293B"
            />
            <text
              x="175"
              y="16"
              textAnchor="middle"
              fill="#64748B"
              fontSize="8.5"
              fontFamily="monospace"
              letterSpacing="0.05em"
            >
              COORDINATE / TELEMETRY: INIT 1802279.08S.IV6 · GODSENAT6. 108.03
            </text>
          </g>
        </svg>

        {/* Floating Zoom & Canvas Controls */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl p-1 flex flex-col gap-1 shadow-lg">
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.min(1.4, +(z + 0.12).toFixed(2)))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.max(0.85, +(z - 0.12).toFixed(2)))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMapZoom(1)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Bottom Telemetry & Attribution Footer ───────────────────────────── */}
      <div className="px-5 py-3.5 bg-slate-900/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs min-w-0">
          <span className="text-slate-400 font-mono text-[11px]">Selected Jurisdiction:</span>
          <span className="font-bold text-white flex items-center gap-1.5 min-w-0">
            <span>{selectedHotspot.flag}</span>
            <span className="truncate">{selectedHotspot.name}</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="font-mono text-slate-300 text-[11px] truncate">
            {selectedHotspot.caseIoc || 'General Global Telemetry'}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 font-mono text-[11px] truncate">
            {selectedHotspot.asnOrRail || 'Carrier Infrastructure'}
          </span>
        </div>

        <button
          onClick={onInspectGraph}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span>Correlate in Incident Graph</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
