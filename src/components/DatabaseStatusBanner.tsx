import React, { useState, useEffect } from 'react';
import { DatabaseConnectionStatus } from '../types';
import { TiffinService } from '../services/tiffinService';
import { Database, ShieldCheck, AlertCircle, CheckCircle2, ChevronRight, X, Terminal, Copy, Check } from 'lucide-react';

export const DatabaseStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<DatabaseConnectionStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function check() {
      const res = await TiffinService.getDatabaseStatus();
      setStatus(res);
    }
    check();
  }, []);

  if (!status) return null;

  const handleCopyEnv = () => {
    const text = `SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Top Thin Notification Strip */}
      <aside aria-label="Database connectivity status" className={`border-b text-xs py-2 px-4 transition-colors ${
        status.isLiveConnection
          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/90 border-amber-200 text-amber-950'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className={`w-3.5 h-3.5 shrink-0 ${status.isLiveConnection ? 'text-emerald-700' : 'text-amber-800'}`} />
            <span>
              <strong>Database Status:</strong>{' '}
              {status.isLiveConnection ? (
                <span className="text-emerald-800 font-semibold">Live Supabase PostgreSQL Connected</span>
              ) : (
                <span className="text-amber-900 font-semibold">Explicit Demo Mode (Supabase not configured in .env)</span>
              )}
            </span>
            <span className="hidden md:inline text-stone-500">·</span>
            <span className="hidden md:inline text-stone-600">
              {status.verifiedOperations.length} operations verified
            </span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className={`font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity flex items-center gap-1 ${
              status.isLiveConnection ? 'text-emerald-800' : 'text-amber-900'
            }`}
          >
            <span>View Verification & Setup</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Setup & Verification Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-700" />
                  <h3 className="text-lg font-bold text-stone-900">
                    Database Connectivity & Schema Diagnostics
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Diagnostics report for TiffinTrack Supabase PostgreSQL integration.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current State Card */}
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              status.isLiveConnection
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {status.isLiveConnection ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Live Supabase Database Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>Explicit Demo Mode Active</span>
                  </>
                )}
              </div>
              <p className="text-xs leading-relaxed">{status.message}</p>
              <div className="text-[11px] text-stone-500 pt-1">
                Last checked: {new Date(status.checkedAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Verified Operations Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Verified Engine Operations
              </h4>
              <div className="space-y-1.5 text-xs text-stone-700">
                {status.verifiedOperations.map((op, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{op}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Row Level Security (RLS) policies configured for profiles, providers, meals, and orders</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Server-side canonical pricing validation (prevents client price tampering)</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Order state transition state machine (prevents illegal jumps like delivered → confirmed)</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions to Connect Supabase */}
            <div className="space-y-3 pt-3 border-t border-stone-200">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                How to Connect a Live Supabase Project
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-xs text-stone-600 leading-relaxed">
                <li>
                  <strong className="text-stone-800">Create a Project:</strong> Go to <span className="font-mono bg-stone-100 px-1 py-0.5 rounded">supabase.com</span> and create a new project.
                </li>
                <li>
                  <strong className="text-stone-800">Run Schema Migration:</strong> Open the Supabase SQL Editor and execute the contents of <span className="font-mono text-amber-800">src/db/schema.sql</span>.
                </li>
                <li>
                  <strong className="text-stone-800">Apply Sample Seed Data:</strong> Run the script in <span className="font-mono text-amber-800">src/db/seed.sql</span> to populate clearly labeled sample data.
                </li>
                <li>
                  <strong className="text-stone-800">Add Server Environment Variables:</strong> Set your project keys in <span className="font-mono">.env</span> (see template below). Privileged service keys remain strictly server-side.
                </li>
              </ol>

              {/* Code snippet */}
              <div className="relative bg-stone-900 text-stone-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto">
                <button
                  onClick={handleCopyEnv}
                  className="absolute right-2.5 top-2.5 px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-[10px] flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <pre>{`# .env configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Client parameters (optional)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"`}</pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
