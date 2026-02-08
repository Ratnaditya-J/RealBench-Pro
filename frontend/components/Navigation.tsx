'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Zap, LayoutDashboard, Trophy, Play, Shield, Bot, Settings,
  ChevronDown, AlertCircle, Eye, TrendingUp, Cog, Scale, FlaskConical
} from 'lucide-react';

// Main navigation items
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/evaluate', label: 'Evaluate', icon: Play },
];

// Safety navigation with dropdown
const safetyItems = {
  main: { href: '/safety', label: 'Safety', icon: Shield },
  items: [
    { 
      label: '🔴 Critical Risks', 
      description: 'Self-improvement, autonomy, sabotage',
      href: '/safety?category=critical',
      color: 'text-red-400',
    },
    { 
      label: '🟠 Deception Risks', 
      description: 'Alignment faking, manipulation, collusion',
      href: '/safety?category=deception',
      color: 'text-orange-400',
    },
    { 
      label: '🟢 Capability Eval', 
      description: 'Benchmarks, contamination, research math',
      items: [
        { label: 'Research Math', href: '/research-math', icon: FlaskConical },
      ],
      color: 'text-emerald-400',
    },
    { 
      label: '⚙️ Detection Methods', 
      description: 'How we identify risks',
      items: [
        { label: 'Ensemble Judges', href: '/ensemble', icon: Scale },
      ],
      color: 'text-slate-300',
    },
  ],
};

export default function Navigation() {
  const pathname = usePathname();
  const [safetyOpen, setSafetyOpen] = useState(false);

  const isSafetyActive = pathname.startsWith('/safety') || 
                         pathname.startsWith('/research-math') || 
                         pathname.startsWith('/ensemble');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <Zap className="relative w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                RealBench Pro
              </h1>
              <p className="text-[10px] text-slate-500 -mt-0.5 tracking-wider uppercase">
                AI Evaluation Platform
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 group
                    ${isActive 
                      ? 'text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg" />
                  )}
                  <Icon className={`relative w-4 h-4 ${isActive ? 'text-blue-400' : 'group-hover:text-blue-400'} transition-colors`} />
                  <span className="relative">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Safety Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setSafetyOpen(true)}
              onMouseLeave={() => setSafetyOpen(false)}
            >
              <Link
                href="/safety"
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 group
                  ${isSafetyActive 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {isSafetyActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg" />
                )}
                <Shield className={`relative w-4 h-4 ${isSafetyActive ? 'text-blue-400' : 'group-hover:text-blue-400'} transition-colors`} />
                <span className="relative">Safety</span>
                <ChevronDown className={`relative w-3 h-3 transition-transform ${safetyOpen ? 'rotate-180' : ''}`} />
                {isSafetyActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                )}
              </Link>

              {/* Dropdown Menu */}
              {safetyOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2">
                    {safetyItems.items.map((item, idx) => (
                      <div key={idx}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="block px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <div className={`font-medium text-sm ${item.color}`}>{item.label}</div>
                            <div className="text-xs text-slate-500">{item.description}</div>
                          </Link>
                        ) : (
                          <div className="px-3 py-2">
                            <div className={`font-medium text-sm ${item.color}`}>{item.label}</div>
                            <div className="text-xs text-slate-500 mb-2">{item.description}</div>
                            {item.items && (
                              <div className="ml-4 space-y-1">
                                {item.items.map((subItem, subIdx) => (
                                  <Link
                                    key={subIdx}
                                    href={subItem.href}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                                  >
                                    <subItem.icon className="w-3 h-3" />
                                    {subItem.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/5 p-2">
                    <Link
                      href="/safety"
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-slate-300"
                    >
                      <Shield className="w-4 h-4" />
                      View All Safety Signals
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* AI Agents */}
            <Link
              href="/agents"
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 group
                ${pathname === '/agents' 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {pathname === '/agents' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg" />
              )}
              <Bot className={`relative w-4 h-4 ${pathname === '/agents' ? 'text-blue-400' : 'group-hover:text-blue-400'} transition-colors`} />
              <span className="relative">AI Agents</span>
              {pathname === '/agents' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              )}
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs">
              <span className="text-slate-500">21 safety signals</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">6 research problems</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
