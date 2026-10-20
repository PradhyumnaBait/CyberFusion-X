import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  UserCheck,
  UserPlus,
  LogIn,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BadgeCheck,
  Building2,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  User,
  Fingerprint,
} from 'lucide-react';
import { UserProfile } from '../types';

export interface DemoUserEntry extends UserProfile {
  demoPassword?: string;
  permissionsSummary?: string;
}

interface AuthPortalViewProps {
  initialMode?: 'LOGIN' | 'SIGNUP';
  onAuthenticated: (user: UserProfile, token: string) => void;
  onBackToHome: () => void;
}

const DEFAULT_DEMO_USERS: DemoUserEntry[] = [
  {
    id: 'usr-lead-01',
    username: 'arjun.verma',
    email: 'arjun.verma@cyberfusionx.gov.in',
    fullName: 'Cmdr. Arjun Verma',
    role: 'LEAD_INVESTIGATOR',
    badgeNumber: 'CFX-IND-001',
    organization: 'Financial Crimes & Digital Forensics Unit',
    mfaEnabled: true,
    createdAt: '2026-09-15T08:00:00Z',
    demoPassword: 'Forensics@2026',
    permissionsSummary:
      'Full Command Authority: Ingest & seal WORM evidence, run 1-byte tamper sandbox, merge knowledge-graph entities, and sign legal PDF dossiers.',
  },
  {
    id: 'usr-analyst-02',
    username: 'priya.nair',
    email: 'priya.nair@cyberfusionx.gov.in',
    fullName: 'Insp. Priya Nair',
    role: 'FORENSIC_ANALYST',
    badgeNumber: 'CFX-IND-014',
    organization: 'CyberFusion X Threat Intelligence Lab',
    mfaEnabled: false,
    createdAt: '2026-09-18T09:30:00Z',
    demoPassword: 'Analyst@2026',
    permissionsSummary:
      'Forensic Analysis Authority: Inspect OCR bounding boxes, link timeline kill-chain milestones, compute Dijkstra graph paths, and export case summaries.',
  },
  {
    id: 'usr-auditor-03',
    username: 'rohan.kulkarni',
    email: 'rohan.kulkarni@cyberfusionx.gov.in',
    fullName: 'Rohan Kulkarni',
    role: 'AUDITOR',
    badgeNumber: 'CFX-AUD-088',
    organization: 'Judicial Digital Evidence Verification Board',
    mfaEnabled: false,
    createdAt: '2026-09-20T11:15:00Z',
    demoPassword: 'Auditor@2026',
    permissionsSummary:
      'Read-Only Compliance Authority: Inspect unbroken chain-of-custody ledger, execute live SHA-256 & BLAKE3 re-verifications, and validate Merkle integrity.',
  },
];

export const AuthPortalView: React.FC<AuthPortalViewProps> = ({
  initialMode = 'LOGIN',
  onAuthenticated,
  onBackToHome,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>(initialMode);
  const [demoUsers, setDemoUsers] =
    useState<DemoUserEntry[]>(DEFAULT_DEMO_USERS);
  const [totpPreview, setTotpPreview] = useState<string>('482910');

  // Password visibility controls
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);

  // Login Form State (starts empty per requirements)
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Sign Up Form State
  const [signupFullName, setSignupFullName] = useState<string>('');
  const [signupUsername, setSignupUsername] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupRole, setSignupRole] = useState<
    'LEAD_INVESTIGATOR' | 'FORENSIC_ANALYST' | 'AUDITOR'
  >('FORENSIC_ANALYST');
  const [signupOrg, setSignupOrg] = useState<string>(
    'CyberFusion X Digital Forensics Division'
  );
  const [signupPassword, setSignupPassword] = useState<string>('');

  // Feedback, Errors, and Loading State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activePersonaLoading, setActivePersonaLoading] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    fetch('/api/v1/auth/demo-users')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.users && data.users.length > 0) {
          setDemoUsers(data.users);
        }
      })
      .catch(() => {});

    fetch('/api/v1/auth/totp-preview')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.currentTotpCode) {
          setTotpPreview(data.currentTotpCode);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || 'Authentication failed. Check your investigator credentials.');
        return;
      }
      onAuthenticated(data.user, data.token);
    } catch {
      setErrorMsg('Unable to reach the Java 21 Authentication Servlet.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOneClickDemoLogin = async (demo: DemoUserEntry) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    setActivePersonaLoading(demo.username);
    try {
      const res = await fetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: demo.username }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onAuthenticated(data.user, data.token);
      } else {
        setErrorMsg(data.error || 'Demo login failed.');
      }
    } catch {
      setErrorMsg('Unable to reach the Java 21 Authentication Servlet.');
    } finally {
      setSubmitting(false);
      setActivePersonaLoading(null);
    }
  };

  const handleFillForm = (demo: DemoUserEntry) => {
    setMode('LOGIN');
    setLoginUsername(demo.username);
    if (demo.demoPassword) {
      setLoginPassword(demo.demoPassword);
    }
    setErrorMsg(null);
    setFeedbackMsg(`Credentials for ${demo.fullName} loaded into the sign-in form.`);
    setTimeout(() => {
      setFeedbackMsg((prev) => (prev?.includes(demo.fullName) ? null : prev));
    }, 4500);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    if (!signupUsername.trim() || !signupPassword.trim()) {
      setErrorMsg('Username and password are required to register an account.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: signupFullName.trim() || signupUsername.trim(),
          username: signupUsername.trim(),
          email: signupEmail.trim(),
          role: signupRole,
          organization: signupOrg.trim(),
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || 'Registration failed. Username may already exist.');
        return;
      }
      onAuthenticated(data.user, data.token);
    } catch {
      setErrorMsg('Unable to reach the Java 21 Registration Servlet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F7F8FA] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-slate-900">
      {/* =========================================================================
          1. CLEAN TOP NAVIGATION BAR (Opaque, High-Contrast Light Mode)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#DCE2E8] px-4 sm:px-6 lg:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="px-3 py-1.5 rounded-lg bg-[#F0F2F4] hover:bg-[#E9EDF2] border border-[#DCE2E8] text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Return to Public Overview"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>

            <div className="h-5 w-px bg-[#DCE2E8] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900">
                    CyberFusion <span className="text-blue-600">X</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline">
                    AUTH GATEWAY
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Investigator Authentication &amp; RBAC Access
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-[#F0F2F4] px-3 py-1.5 rounded-lg border border-[#DCE2E8]">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden md:inline font-medium">PBKDF2-HMAC-SHA256 · HS256 JWT</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-500">RFC-6238 TOTP</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN PORTAL BODY (Deliberate 5 / 7 Asymmetrical Split Layout)
          ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* =====================================================================
              LEFT COLUMN (Approx 42%): AUTHENTICATION PANEL (Sign In / Register)
              ===================================================================== */}
          <div className="cf-card lg:col-span-5 -[inset_0_1px_0_0_rgba(255,255,255,0.9),0_2px_4px_rgba(15,23,42,0.03),0_12px_28px_-6px_rgba(15,23,42,0.07)] p-6 sm:p-7 space-y-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />
            
            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#F0F2F4] p-1 rounded-xl border border-[#DCE2E8]">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                  setFeedbackMsg(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mode === 'LOGIN'
                    ? 'bg-white text-slate-900 shadow-xs border border-[#DCE2E8]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setErrorMsg(null);
                  setFeedbackMsg(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mode === 'SIGNUP'
                    ? 'bg-white text-slate-900 shadow-xs border border-[#DCE2E8]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                <span>Register Account</span>
              </button>
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Feedback Message Box (e.g. Fill Form Confirmation) */}
            {feedbackMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 font-semibold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{feedbackMsg}</div>
              </div>
            )}

            {mode === 'LOGIN' ? (
              /* ===============================================================
                 SIGN IN FORM
                 =============================================================== */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Investigator Sign In
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Provide your credentialed account or select any pre-configured persona on the right for instant 1-click evaluation.
                  </p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Investigator Username or Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="e.g. arjun.verma"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded transition cursor-pointer"
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* RFC 6238 TOTP Status Strip */}
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-blue-800 font-semibold">
                      <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Live RFC-6238 TOTP:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-extrabold text-blue-700 text-xs">
                        {totpPreview}
                      </span>
                      <span className="text-[10px] text-blue-600/80 font-mono">30s cycle</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  {submitting && !activePersonaLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Authenticate &amp; Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ===============================================================
                 REGISTRATION / SIGN UP FORM
                 =============================================================== */
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Register Investigator Account
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Creates a PBKDF2-HMAC-SHA256 credentialed investigator profile logged directly into the Chain-of-Custody ledger.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Full Name &amp; Title
                    </label>
                    <input
                      type="text"
                      required
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="e.g. Insp. Meera Deshmukh"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        placeholder="meera.deshmukh"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] font-mono font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        RBAC Role
                      </label>
                      <select
                        value={signupRole}
                        onChange={(e) =>
                          setSignupRole(
                            e.target.value as
                              | 'LEAD_INVESTIGATOR'
                              | 'FORENSIC_ANALYST'
                              | 'AUDITOR'
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      >
                        <option value="LEAD_INVESTIGATOR">LEAD_INVESTIGATOR</option>
                        <option value="FORENSIC_ANALYST">FORENSIC_ANALYST</option>
                        <option value="AUDITOR">AUDITOR</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Official Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="meera.deshmukh@cyberfusionx.gov.in"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Organization / Unit
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={signupOrg}
                        onChange={(e) => setSignupOrg(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Account Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Create a strong investigator password"
                        className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#F7F8FA] border border-[#DCE2E8] font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded transition cursor-pointer"
                        title={showSignupPassword ? 'Hide password' : 'Show password'}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account &amp; Launch Workspace</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* =====================================================================
              RIGHT COLUMN (Approx 58%): PRE-CONFIGURED DEMO INVESTIGATOR ACCESS
              ===================================================================== */}
          <div className="cf-card lg:col-span-7 -[inset_0_1px_0_0_rgba(255,255,255,0.9),0_2px_4px_rgba(15,23,42,0.03),0_12px_28px_-6px_rgba(15,23,42,0.07)] p-6 sm:p-7 space-y-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />
            
            {/* Header section with badge */}
            <div className="border-b border-slate-200 pb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Demonstration Access</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Demo Investigator Profiles (1-Click Login)
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Experience CyberFusion X under real role-based access control. Click <strong>1-Click Login</strong> on any profile to immediately launch that persona, or use <strong>Fill Form</strong> to review credentials.
              </p>
            </div>

            {/* Persona Profiles List */}
            <div className="space-y-4">
              {demoUsers.map((demo, idx) => {
                const isLead = demo.role === 'LEAD_INVESTIGATOR';
                const isAnalyst = demo.role === 'FORENSIC_ANALYST';
                const isAuditor = demo.role === 'AUDITOR';
                const isCurrentFormMatch = loginUsername === demo.username;
                const isLoadingThisPersona = activePersonaLoading === demo.username;

                return (
                  <div
                    key={demo.id}
                    className={`rounded-xl border p-4 sm:p-5 transition ${
                      isCurrentFormMatch
                        ? 'bg-blue-50/40 border-blue-400 shadow-xs ring-1 ring-blue-400/40'
                        : 'bg-[#F7F8FA] hover:bg-slate-50/90 border-[#DCE2E8]'
                    }`}
                  >
                    {/* Persona Header: Identity, Role, Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Avatar initials with role-coded background */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-xs ${
                            isLead
                              ? 'bg-slate-900'
                              : isAnalyst
                              ? 'bg-blue-600'
                              : 'bg-emerald-700'
                          }`}
                        >
                          {idx === 0 ? 'AV' : idx === 1 ? 'PN' : 'RK'}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900">
                              {demo.fullName}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isLead
                                  ? 'bg-slate-100 text-slate-900 border-slate-300'
                                  : isAnalyst
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {demo.role.replace('_', ' ')}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white border border-[#DCE2E8] font-mono text-[10px] font-bold text-slate-600">
                              {demo.badgeNumber}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {demo.organization}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Distinct Key Permission Difference */}
                    <div className="mt-3 p-2.5 rounded-lg bg-white border border-[#DCE2E8] text-xs text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800">
                        {isLead
                          ? 'Full Command Access: '
                          : isAnalyst
                          ? 'Forensic Analysis Access: '
                          : 'Judicial Compliance Access: '}
                      </span>
                      <span>
                        {demo.permissionsSummary ||
                          'Authorized forensic investigator session with Chain-of-Custody ledger tracking.'}
                      </span>
                    </div>

                    {/* Bottom Action Strip: Credentials + Actions */}
                    <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-white border border-[#DCE2E8] text-slate-700">
                          user: <strong className="text-slate-900 font-bold">{demo.username}</strong>
                        </span>
                        {demo.demoPassword && (
                          <span className="px-2 py-0.5 rounded bg-white border border-[#DCE2E8] text-slate-700">
                            pass: <strong className="text-slate-900 font-bold">{demo.demoPassword}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleFillForm(demo)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-[#DCE2E8] text-xs font-semibold text-slate-700 flex items-center gap-1 transition cursor-pointer"
                          title={`Copy credentials for ${demo.fullName} into the Sign In form`}
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Fill Form</span>
                        </button>

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleOneClickDemoLogin(demo)}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
                        >
                          {isLoadingThisPersona ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Launching...</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>1-Click Login →</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cryptographic Ledger Assurance Footer */}
            <div className="p-3.5 rounded-xl bg-[#F0F2F4] border border-[#DCE2E8] flex items-center justify-between gap-3 text-xs text-slate-700">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="leading-relaxed">
                  Every sign-in, role switch, and evidentiary modification is recorded in the cryptographically chained SHA-256 Merkle Ledger.
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 hidden sm:block" />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
