'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

// Electron'un preload.js üzerinden gelen API — tarayıcıda undefined olur.
interface ElectronApi {
  licenseGetDeviceId?: () => Promise<string>;
  authRegisterWithEmail?: (email: string, password: string) => Promise<{ ok: boolean; status: number; data: { error?: string; code?: string }; networkError?: boolean }>;
}
function getElectronApi(): ElectronApi | undefined {
  return (window as unknown as { electron?: ElectronApi }).electron;
}

type TabType = 'login' | 'register';

export default function Login() {
  const [tab, setTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const setUser = useStore((state) => state.setUser);


  // ────────────────────────────── Login ──────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────── Register ──────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      setLoading(false);
      return;
    }

    try {
      const electron = getElectronApi();
      if (electron?.authRegisterWithEmail) {
        const res = await electron.authRegisterWithEmail(email, password);
        if (!res.ok) {
          if (res.status === 409 && res.data?.code === 'DEVICE_TRIAL_USED') {
            setError(res.data.error || 'Bu cihazda daha önce deneme sürümü kullanılmıştır. Lütfen mevcut hesabınıza giriş yapın veya lisans satın alın.');
          } else {
            setError(res.data?.error || 'Kayıt oluşturulamadı.');
          }
          return;
        }

        // Backend kaydı başarılı oldu — Supabase auth ile oturum aç
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setSuccess('Kayıt başarılı! 7 günlük deneme sürümünüz başladı. Lütfen giriş yapın.');
          setTab('login');
          return;
        }
        if (signInData.user) {
          setUser(signInData.user);
          router.push('/');
        }
        return;
      }

      // Tarayıcı fallback
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        const msg = signUpError.message?.toLowerCase() ?? '';
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
          setError('Bu e-posta adresi zaten kayıtlı.');
        } else if (msg.includes('password')) {
          setError('Şifre en az 8 karakter olmalı ve güçlü bir şifre seçilmelidir.');
        } else if (msg.includes('invalid email')) {
          setError('Geçersiz e-posta adresi.');
        } else {
          setError(signUpError.message || 'Kayıt oluşturulamadı.');
        }
        return;
      }

      if (!data.user) {
        setError('Kayıt oluşturulamadı. Lütfen tekrar deneyin.');
        return;
      }

      if (data.session) {
        setUser(data.user);
        router.push('/');
      } else {
        setSuccess('Kayıt başarılı! 7 günlük deneme sürümünüz başladı. Lütfen e-postanızı onaylayın ve giriş yapın.');
        setTab('login');
        setEmail(email);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };



  // ────────────────────────────── UI Helpers ──────────────────────────────
  const switchTab = (t: TabType) => {
    setTab(t);
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="flex h-screen bg-[#060b14] text-[#eef1f4] font-sans selection:bg-teal-500/30 items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
        {/* Logo + başlık */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo-mark.png" alt="AyrisLegal" className="w-16 h-16 rounded-2xl mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">AyrisLegal</h1>
          <p className="text-gray-400 text-sm text-center">Yapay zeka destekli hukuki çalışma alanı</p>
        </div>

        {/* Sekme seçimi */}
        <div className="flex rounded-xl overflow-hidden border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'login'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'register'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Kayıt Ol
          </button>
        </div>

        {/* Trial badge — sadece kayıt sekmesinde */}
        {tab === 'register' && (
          <div className="mb-5 px-4 py-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-center">
            <span className="text-teal-400 text-sm font-medium">✨ 3 günlük ücretsiz deneme</span>
            <p className="text-gray-400 text-xs mt-0.5">Kredi kartı gerekmez</p>
          </div>
        )}

        {/* Hata / başarı mesajları */}
        {error && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl text-sm text-center">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {/* E-posta */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">E-posta</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-teal-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600"
                placeholder="avukat@ornek.com"
              />
              <Mail className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Şifre</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={tab === 'register' ? 8 : undefined}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-teal-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600"
                placeholder="••••••••"
              />
              <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : tab === 'login' ? (
              'Giriş Yap'
            ) : (
              'Hesap Oluştur'
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
