import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Network,
  Clock,
  Lock,
  FileText,
} from 'lucide-react';

export type InvestigationStageId =
  | 'OVERVIEW'
  | 'EVIDENCE'
  | 'GRAPH'
  | 'TIMELINE'
  | 'INTEGRITY'
  | 'REPORT';

export interface InvestigationStepperProps {
  activeStage: InvestigationStageId;
  onSelectStage: (stage: InvestigationStageId) => void;
  evidenceCount?: number;
  entityCount?: number;
  timelineCount?: number;
}

interface StepDefinition {
  id: InvestigationStageId;
  num: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'evidence' | 'entity' | 'timeline';
}

const STEPS: StepDefinition[] = [
  {
    id: 'OVERVIEW',
    num: '01',
    name: 'Ingest',
    icon: LayoutDashboard,
  },
  {
    id: 'EVIDENCE',
    num: '02',
    name: 'Analyze',
    icon: FolderKanban,
    badgeKey: 'evidence',
  },
  {
    id: 'GRAPH',
    num: '03',
    name: 'Reconstruct',
    icon: Network,
    badgeKey: 'entity',
  },
  {
    id: 'TIMELINE',
    num: '04',
    name: 'Correlate',
    icon: Clock,
    badgeKey: 'timeline',
  },
  {
    id: 'INTEGRITY',
    num: '05',
    name: 'Validate',
    icon: Lock,
  },
  {
    id: 'REPORT',
    num: '06',
    name: 'Report',
    icon: FileText,
  },
];

export const InvestigationStepper: React.FC<InvestigationStepperProps> = ({
  activeStage,
  onSelectStage,
  evidenceCount,
  entityCount,
  timelineCount,
}) => {
  const getBadgeValue = (key?: 'evidence' | 'entity' | 'timeline') => {
    if (key === 'evidence') return evidenceCount;
    if (key === 'entity') return entityCount;
    if (key === 'timeline') return timelineCount;
    return undefined;
  };

  return (
    <nav
      aria-label="Investigation Workflow Stages"
      className="sticky top-[calc(0.75rem+4rem+0.5rem)] z-30 mx-3 lg:mx-6 mt-2 rounded-[22px] cf-glass p-1.5 transition-all select-none"
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto snap-x no-scrollbar w-full"
      >
        {STEPS.map((step, index) => {
          const isActive = activeStage === step.id;
          const badge = getBadgeValue(step.badgeKey);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <button
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'step' : undefined}
                aria-controls={`panel-${step.id}`}
                id={`tab-${step.id}`}
                onClick={() => onSelectStage(step.id)}
                className={`group relative flex items-center justify-center gap-2 px-3 py-2 rounded-[18px] transition-all duration-200 cursor-pointer flex-1 min-w-0 snap-center focus:outline-none ${
                  isActive
                    ? 'bg-gradient-to-b from-sky-400 to-blue-600 text-white ring-1 ring-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_8px_24px_-6px_rgba(37,99,235,0.65)] scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:cf-glass-pill bg-transparent'
                }`}
              >
                {/* Round Icon Chip */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-200/60 text-slate-500 group-hover:bg-white group-hover:text-blue-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Two-line label (small mono '01' over name) */}
                <div
                  className={`flex flex-col text-left min-w-0 ${
                    isActive ? 'flex' : 'hidden lg:flex'
                  }`}
                >
                  <span
                    className={`text-[9px] font-mono font-bold tracking-wider leading-none ${
                      isActive ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {step.num}
                  </span>
                  <span className="text-xs font-bold tracking-tight truncate leading-tight">
                    {step.name}
                  </span>
                </div>

                {/* 16px dot count badge */}
                {typeof badge === 'number' && (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0 ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>

              {/* Tiny dashed connector between steps (hidden below lg) */}
              {index < STEPS.length - 1 && (
                <div className="hidden lg:block w-3 sm:w-5 border-t border-dashed border-slate-300/80 mx-0.5 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default InvestigationStepper;
