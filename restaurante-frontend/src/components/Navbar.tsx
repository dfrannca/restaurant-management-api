'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { api } from '@/lib/api';
import { CashRegister, UserRole } from '@/types';
import { ChefHat, LogOut, UserCircle } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, logout } = useUser();
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);

  useEffect(() => {
    if (pathname === '/login') {
      return;
    }

    async function loadRegisterStatus() {
      try {
        const data = await api.getOpenCashRegister();
        if (data) {
          setCashRegister(data);
        } else {
          setCashRegister(null);
        }
      } catch {
        setCashRegister(null);
      }
    }

    const initialLoad = window.setTimeout(loadRegisterStatus, 0);
    const interval = setInterval(loadRegisterStatus, 10000);
    window.addEventListener('cashRegisterChanged', loadRegisterStatus);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
      window.removeEventListener('cashRegisterChanged', loadRegisterStatus);
    };
  }, [pathname]);

  // Hide navbar on login page
  if (pathname === '/login') return null;

  const isLinkActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-graphite/85 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand & Nav */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-heading font-extrabold text-xl text-white tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-900/30"><ChefHat className="h-5 w-5" /></span>
            <span>Bar e Churrascaria <span className="text-accent">Progresso</span></span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                isLinkActive('/')
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-400 hover:bg-surface-light/30 hover:text-white'
              }`}
            >
              Mesas
            </Link>
            <Link
              href="/caixa"
              className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                isLinkActive('/caixa')
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-400 hover:bg-surface-light/30 hover:text-white'
              }`}
            >
              Caixa
            </Link>
            <Link
              href="/historico"
              className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                isLinkActive('/historico')
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-400 hover:bg-surface-light/30 hover:text-white'
              }`}
            >
              Histórico
            </Link>
          </nav>
        </div>

        {/* Right side: status + user + logout */}
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-surface-light/35 pt-4 sm:border-t-0 sm:pt-0">
          {/* Cash Register Status Badge */}
          <div>
            {cashRegister ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Caixa Aberto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                Caixa Fechado
              </span>
            )}
          </div>

          {/* Logged user info */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-surface-light bg-surface-light/30 px-3 py-1.5">
                <UserCircle className="h-4 w-4 text-amber-400" />
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    {currentUser.role === UserRole.Administrator ? 'Admin' : 'Caixa'}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sair"
                className="flex items-center justify-center rounded-xl border border-surface-light bg-surface-light/30 p-2 text-slate-400 transition-all hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
