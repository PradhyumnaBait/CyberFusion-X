import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
  LogOut,
  FolderLock,
  ChevronDown,
  Bell,
  MoreHorizontal,
} from 'lucide-react';
import { ForensicCaseSummary, UserProfile } from '../../types';

export interface WorkspaceHeaderProps {
  onNavigateHome: () => void;
  cases: ForensicCaseSummary[];
  activeCaseId: string;
  onSelectCase: (caseId: string) => void;
  onOpenNewCaseModal: () => void;
  onReanalyzeCase: () => void;
  onResetDemo: () => void;
  onOpenSearchModal: () => void;
  currentUser: UserProfile | null;
  availableUsers: UserProfile[];
  onSwitchInvestigatorRole: (username: string) => void;
  onLogout: () => void;
  sseStatus?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  onNavigateHome,
  cases,
  activeCaseId,
  onSelectCase,
  onOpenNewCaseModal,
  onReanalyzeCase,
  onResetDemo,
  onOpenSearchModal,
  currentUser,
  availableUsers,
  onSwitchInvestigatorRole,
  onLogout,
  sseStatus = 'Java 21 Virtual Threads & SSE Active',
}) => {
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-3 z-40 mx-3 lg:mx-6 rounded-[22px] cf-glass px-4 h-16 flex items-center justify-between gap-3 text-slate-900 transition-all select-none">
      {/* LEFT SECTION: Logo (Clicks to Overview) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer group focus:outline-none"
          title="Return to Public Overview"
          aria-label="Return to Public Overview"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center text-white">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              CyberFusion <span className="text-blue-600">X</span>
            </span>
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase mt-0.5">
              DIGITAL FORENSICS LAB
            </span>
          </div>
        </button>
      </div>

      {/* CENTER SECTION: Case Selector & New Case Button */}
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-center max-w-xl">
        {/* Case Selector Capsule */}
        <div className="cf-glass-pill px-3 py-1.5 flex items-center gap-2.5 w-full max-w-[320px] sm:max-w-[380px] min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
            <FolderLock className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase leading-none">
              CASE SELECTOR
            </span>
            <div className="relative inline-flex items-center w-full">
              <select
                aria-label="Select Active Forensic Case"
                value={activeCaseId}
                onChange={(e) => onSelectCase(e.target.value)}
                className="appearance-none bg-transparent text-slate-900 font-bold text-xs pr-4 py-0.5 focus:outline-none w-full truncate cursor-pointer leading-tight"
              >
                {cases.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="bg-white text-slate-900"
                  >
                    {c.caseNumber} — {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* New Case Button */}
        <button
          onClick={onOpenNewCaseModal}
          className="cf-btn-primary px-3 py-2 text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          title="Create New Investigation Case"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Case</span>
        </button>
      </div>

      {/* RIGHT SECTION: Persona Selector, Search, Utilities & User */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Persona Selector Capsule */}
        <div className="hidden md:flex cf-glass-pill px-3 py-1.5 items-center gap-2.5 min-w-0 shrink-0">
          <div className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase leading-none">
              PERSONA
            </span>
            <div className="relative inline-flex items-center">
              <select
                aria-label="Switch Investigator Role"
                value={currentUser?.username || ''}
                onChange={(e) => onSwitchInvestigatorRole(e.target.value)}
                className="appearance-none bg-transparent text-slate-900 font-bold text-xs pr-4 py-0.5 focus:outline-none max-w-[130px] sm:max-w-[160px] truncate cursor-pointer leading-tight"
              >
                {!currentUser && (
                  <option value="" disabled className="bg-white text-slate-900">
                    Select Persona...
                  </option>
                )}
                {availableUsers.map((u) => (
                  <option
                    key={u.id}
                    value={u.username}
                    className="bg-white text-slate-900"
                  >
                    {u.fullName} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Global IOC Search Trigger */}
        <button
          onClick={onOpenSearchModal}
          className="w-9 h-9 rounded-full cf-glass-pill flex items-center justify-center text-slate-600 hover:text-blue-600 transition shrink-0 cursor-pointer"
          title="Search IOCs (Cmd+K)"
          aria-label="Search IOCs"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Live SSE Telemetry Bell */}
        <div
          className="w-9 h-9 rounded-full cf-glass-pill flex items-center justify-center relative text-slate-600 shrink-0"
          title={sseStatus}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
        </div>

        {/* Overflow Menu ("⋯") for Reset Demo & Re-analyze Engine */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            className="w-9 h-9 rounded-full cf-glass-pill flex items-center justify-center text-slate-600 hover:text-slate-900 transition shrink-0 cursor-pointer"
            title="Investigation Engine Actions"
            aria-label="Investigation Engine Actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showOverflowMenu && (
            <div className="absolute right-0 mt-2 w-64 cf-card p-2 shadow-xl z-50 animate-fadeIn space-y-1">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  INVESTIGATOR ENGINE
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {currentUser?.fullName} ({currentUser?.role})
                </div>
              </div>

              {/* Re-analyze Graph Action */}
              <button
                onClick={() => {
                  setShowOverflowMenu(false);
                  onReanalyzeCase();
                }}
                className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition text-left cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Re-run PageRank &amp; OCR Engine</span>
              </button>

              {/* Reset Demo Baseline Action */}
              <button
                onClick={() => {
                  setShowOverflowMenu(false);
                  onResetDemo();
                }}
                className="w-full px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 rounded-lg flex items-center gap-2 transition text-left cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Reset Demo to Baseline State</span>
              </button>

              {/* Live SSE Telemetry */}
              <div className="px-3 py-1.5 text-[10px] font-mono text-slate-400 border-t border-slate-100">
                <span className="text-emerald-600 font-bold">• </span>
                {sseStatus}
              </div>
            </div>
          )}
        </div>

        {/* Direct Sign Out Action */}
        <button
          onClick={onLogout}
          className="w-9 h-9 rounded-full cf-glass-pill flex items-center justify-center text-red-600 hover:bg-red-50 hover:text-red-700 transition shrink-0 cursor-pointer"
          title="Sign Out of Investigator Session"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
