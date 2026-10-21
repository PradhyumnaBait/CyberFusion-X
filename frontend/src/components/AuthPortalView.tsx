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
    fullName: 'Cmdr. Arjun Verma (Lead Forensics)',
    role: 'LEAD_INVESTIGATOR',
    badgeNumber: 'CFX-IND-001',
    organization: 'CyberFusion X Financial Crimes & Digital Forensics Unit',
    mfaEnabled: true,
    createdAt: '2026-09-15T08:00:00Z',
    demoPassword: 'Forensics@2026',
    permissionsSummary:
      'Full Command Access: Create cases, ingest/seal evidence, run 1-byte tamper sandbox, merge graph entities, and sign PDF/STIX dossiers.',
  },
  {
    id: 'usr-analyst-02',
    username: 'priya.nair',
    email: 'priya.nair@cyberfusionx.gov.in',
    fullName: 'Priya Nair (Senior Threat Analyst)',
    role: 'FORENSIC_ANALYST',
    badgeNumber: 'CFX-IND-014',
    organization: 'CyberFusion X Threat Intelligence Lab',
    mfaEnabled: false,
    createdAt: '2026-09-18T09:30:00Z',
    demoPassword: 'Analyst@2026',
    permissionsSummary:
      'Forensic Analyst Access: Upload evidence, inspect OCR bounding boxes, annotate timelines & knowledge graphs, and export reports.',
  },
  {
    id: 'usr-auditor-03',
    username: 'rohan.kulkarni',
    email: 'rohan.kulkarni@cyberfusionx.gov.in',
    fullName: 'Rohan Kulkarni (Judicial Chain-of-Custody Auditor)',
    role: 'AUDITOR',
    badgeNumber: 'CFX-AUD-088',
    organization: 'Judicial Digital Evidence Verification Board',
    mfaEnabled: false,
    createdAt: '2026-09-20T11:15:00Z',
    demoPassword: 'Auditor@2026',
    permissionsSummary:
      'Judicial Auditor Access: Read-only chain-of-custody inspection, live SHA-256/BLAKE3 re-verification, Merkle audit validation, and PDF export.',
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

  // Login Form State
  const [loginUsername, setLoginUsername] = useState<string>('arjun.verma');
  const [loginPassword, setLoginPassword] = useState<string>('Forensics@2026');

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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

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
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || 'Authentication failed. Check your credentials.');
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
    setSubmitting(true);
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
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!signupUsername.trim() || !signupPassword.trim()) {
      setErrorMsg('Username and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: signupFullName || signupUsername,
          username: signupUsername,
          email: signupEmail,
          role: signupRole,
          organization: signupOrg,
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || 'Registration failed.');
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
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200/90 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home Page</span>
            </button>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
                CyberFusion <span className="text-blue-600">X</span> · Investigator Identity Portal
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>PBKDF2-HMAC-SHA256 · HS256 JWT · RFC-6238 TOTP</span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Portal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Columns: Login / Sign Up Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                  mode === 'LOGIN'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4 text-blue-600" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                  mode === 'SIGNUP'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4 text-orange-500" />
                <span>Sign Up / Register</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === 'LOGIN' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">
                    Sign In to Forensic Workspace
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your investigator credentials below, or select any Demo Persona on the right for 1-click access.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Investigator Username or Email
                    </label>
                    <input
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="arjun.verma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* RFC 6238 TOTP Status Strip */}
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-blue-800 font-semibold">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      <span>Active RFC-6238 TOTP Token:</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-extrabold text-blue-700">
                      {totpPreview}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/15 transition"
                >
                  <span>
                    {submitting
                      ? 'Authenticating Session...'
                      : 'Authenticate & Enter Forensic Workspace'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-orange-400" />
                </button>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">
                    Register New Investigator Account
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Creates a PBKDF2-HMAC-SHA256 credentialed investigator profile and logs the registration in the Chain-of-Custody ledger.
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
                      placeholder="e.g., Insp. Meera Deshmukh"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold"
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
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
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
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                      >
                        <option value="LEAD_INVESTIGATOR">
                          LEAD_INVESTIGATOR
                        </option>
                        <option value="FORENSIC_ANALYST">
                          FORENSIC_ANALYST
                        </option>
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
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Organization / Forensic Unit
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={signupOrg}
                        onChange={(e) => setSignupOrg(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create a strong investigator password"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Creating Investigator Account...'
                      : 'Create Account & Launch Workspace'}
                  </span>
                </button>
              </form>
            )}
          </div>

          {/* Right 7 Columns: Pre-Configured Demo Investigator Accounts for Instant Exploration */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Demo Access</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Demo Investigator Personas (1-Click Login)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select any of the 3 pre-configured forensic personas below to immediately explore all features of CyberFusion X under different RBAC roles.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {demoUsers.map((demo, idx) => {
                  const isLead = demo.role === 'LEAD_INVESTIGATOR';
                  const isAnalyst = demo.role === 'FORENSIC_ANALYST';
                  return (
                    <div
                      key={demo.id}
                      className={`p-5 rounded-2xl border transition ${
                        loginUsername === demo.username
                          ? 'bg-blue-50/40 border-blue-400 shadow-xs'
                          : 'bg-slate-50/80 hover:bg-white border-slate-200/90'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-xs ${
                              isLead
                                ? 'bg-slate-900'
                                : isAnalyst
                                ? 'bg-blue-600'
                                : 'bg-emerald-600'
                            }`}
                          >
                            {idx === 0 ? 'AV' : idx === 1 ? 'PN' : 'RK'}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-extrabold text-slate-900">
                                {demo.fullName}
                              </h3>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  isLead
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : isAnalyst
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {demo.role}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-600">
                                Badge: {demo.badgeNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {demo.organization}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                        {demo.permissionsSummary ||
                          'Authorized forensic investigator session with Chain-of-Custody ledger tracking.'}
                      </p>

                      {/* Credentials Box + Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                            User: <strong className="text-slate-900">{demo.username}</strong>
                          </span>
                          {demo.demoPassword && (
                            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                              Pass:{' '}
                              <strong className="text-slate-900">
                                {demo.demoPassword}
                              </strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMode('LOGIN');
                              setLoginUsername(demo.username);
                              if (demo.demoPassword) {
                                setLoginPassword(demo.demoPassword);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition"
                          >
                            Fill Form
                          </button>

                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleOneClickDemoLogin(demo)}
                            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>1-Click Demo Login →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Security Assurance Footer */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-900">
                <div className="flex items-center gap-2.5">
                  <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Every login, role switch, and evidence operation is cryptographically recorded in the SHA-256 Chain-of-Custody Merkle Ledger.
                  </span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
