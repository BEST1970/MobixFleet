import { NavLink, useLocation } from 'react-router-dom';
import { Upload, BarChart3, Truck } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';

const NAV_ITEMS = [
  { to: '/', label: 'Upload', icon: Upload },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { reset } = useAnalysis();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Local data banner ── */}
      <div className="bg-cfe-blue-dark text-white text-center text-xs py-1.5 font-medium tracking-wide">
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Alle data blijft lokaal in je browser — er wordt niets verstuurd
        </span>
      </div>

      {/* ── Top navigation ── */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <NavLink to="/" className="flex items-center gap-3 group" onClick={() => reset()}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cfe-green to-cfe-teal flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <span className="text-lg font-bold text-slate-800 tracking-tight">
                  Mobix <span className="text-[#6EB550]">Fleet</span>
                </span>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium -mt-0.5">
                  CFE Group · Spoorkranen
                </p>
              </div>
            </NavLink>

            {/* Nav items */}
            <nav className="flex items-center gap-1" aria-label="Hoofdnavigatie">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => {
                    if (to === '/') reset();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-[#6EB550]/10 text-[#6EB550]'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`
                  }
                  aria-current={location.pathname === to ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        Mobix Fleet · CFE Group · Vlootanalyse
      </footer>
    </div>
  );
}
