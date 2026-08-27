'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Redirect if already logged in
    const token = sessionStorage.getItem('token');
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username, password);
      sessionStorage.setItem('token', data.token);
      if (data.user) {
        sessionStorage.setItem('current_user', JSON.stringify(data.user));
      }

      router.replace('/');
    } catch (err) {
      const message = (err as Error).message;
      setError(message === 'Failed to fetch'
        ? 'Não foi possível conectar à API. Verifique NEXT_PUBLIC_API_URL na Vercel e o CORS no Render.'
        : message || 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-graphite flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-600/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-2xl shadow-orange-900/40">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-white">
            Bar e Churrascaria
          </h1>
          <p className="mt-1 text-lg font-bold text-amber-400 tracking-wider">
            Progresso
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Sistema de Gerenciamento de Mesas
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-white/8 bg-surface/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-white">Acessar sistema</h2>
            <p className="mt-1 text-sm text-slate-400">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface-light bg-surface-light/50 py-3 pl-10 pr-4 text-sm font-medium text-slate-100 placeholder:text-slate-600 outline-none ring-0 transition-all focus:border-amber-400/50 focus:bg-surface-light/80 focus:ring-2 focus:ring-amber-400/20"
                  placeholder="Digite o usuário"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface-light bg-surface-light/50 py-3 pl-10 pr-12 text-sm font-medium text-slate-100 placeholder:text-slate-600 outline-none ring-0 transition-all focus:border-amber-400/50 focus:bg-surface-light/80 focus:ring-2 focus:ring-amber-400/20"
                  placeholder="Digite a senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-orange-900/30 transition-all duration-300 hover:from-amber-400 hover:to-orange-500 hover:shadow-orange-900/50 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar no sistema'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
