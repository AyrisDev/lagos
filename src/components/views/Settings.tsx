import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL, Icon, SUPPORT_CATEGORIES } from '@/lib/constants';
import { formatBytes, formatRelativeTr, useSupabaseToken, supportCategoryLabel } from '@/lib/utils';
import { Theme, SettingsSection, SupportMessageRow, CurrentUser } from '@/types';
import { useToast } from '@/components/ToastProvider';

export function Settings({ currentUser, theme, toggleTheme, handleSignOut }: { currentUser: CurrentUser | null, theme: Theme, toggleTheme: () => void, handleSignOut: () => void }) {
  const { toast, confirm: confirmDialog } = useToast();
  const [section, setSection] = useState<SettingsSection>('kullanici');
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [barName, setBarName] = useState('');
  const [barNo, setBarNo] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  const [licenseInfo, setLicenseInfo] = useState<{ plan: string; status: string; expires_at: string | null; max_devices?: number } | null>(null);
  const [profileLicense, setProfileLicense] = useState<{ plan: string; status: string; expires_at: string | null; max_devices?: number } | null>(null);
  const [licenseInfoLoading, setLicenseInfoLoading] = useState(true);

  const token = useSupabaseToken();
  const [driveStatus, setDriveStatus] = useState<{ connected: boolean; google_email?: string } | null>(null);
  const [driveStatusLoading, setDriveStatusLoading] = useState(true);
  const [backupStats, setBackupStats] = useState<{ total_files: number; total_size: number; last_sync_at: string | null } | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ counts: Record<string, number>; totalFiles: number; totalSyncedSize: number; autoBackupEnabled: boolean; scanIntervalMinutes?: number } | null>(null);
  const [casesBackupStatus, setCasesBackupStatus] = useState<{ caseTitle: string; fileCount: number; syncedCount: number; lastSyncedAt: number | null }[]>([]);
  const [showCasesBackupList, setShowCasesBackupList] = useState(false);
  const [settingScanInterval, setSettingScanInterval] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [pollingConnection, setPollingConnection] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [driveError, setDriveError] = useState('');
  const connectionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [restoreFilesFound, setRestoreFilesFound] = useState<number | null>(null);
  const [restoreChecking, setRestoreChecking] = useState(false);
  const [restoreRunning, setRestoreRunning] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ total: number; restored: number; failed: number } | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreDone, setRestoreDone] = useState<{ restored: number; failed: number } | null>(null);

  const [crashReportingEnabled, setCrashReportingEnabled] = useState(true);
  const [crashReportingLoading, setCrashReportingLoading] = useState(true);

  const [supportCategory, setSupportCategory] = useState('geri_bildirim');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const [supportHistory, setSupportHistory] = useState<SupportMessageRow[]>([]);
  const [supportHistoryLoading, setSupportHistoryLoading] = useState(true);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const supportFileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfileLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('full_name, bar_name, bar_association_no, created_at, license_status, license_expires_at, trial_end_date')
      .eq('id', user.id)
      .single();
    if (data) {
      setFullName(data.full_name || '');
      setBarName(data.bar_name || '');
      setBarNo(data.bar_association_no || '');

      if (data.license_status === 'active') {
        const isExpired = data.license_expires_at && new Date(data.license_expires_at).getTime() <= Date.now();
        setProfileLicense({
          status: isExpired ? 'expired' : 'active',
          expires_at: data.license_expires_at || null,
          plan: 'Professional',
        });
        setTrialDaysLeft(null);
      } else if (data.license_status === 'trial' && data.trial_end_date) {
        const diffMs = new Date(data.trial_end_date).getTime() - Date.now();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(days > 0 ? days : 0);
        setProfileLicense({
          status: days > 0 ? 'trial' : 'expired',
          expires_at: data.trial_end_date,
          plan: 'Deneme',
        });
      } else if (data.license_status === 'expired') {
        setTrialDaysLeft(0);
        setProfileLicense({
          status: 'expired',
          expires_at: data.license_expires_at || data.trial_end_date || null,
          plan: 'Deneme',
        });
      } else if (data.created_at) {
        const createdDate = new Date(data.created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(diffDays <= 7 ? 7 - diffDays : 0);
      }
    }
    setProfileLoading(false);
  }, []);

  const loadLicenseInfo = useCallback(async () => {
    const fn = (window as unknown as { electron?: { licenseValidate?: () => Promise<{ valid: boolean; license?: { plan: string; status: string; expires_at: string | null; max_devices: number } }> } }).electron?.licenseValidate;
    if (!fn) { setLicenseInfoLoading(false); return; }
    try {
      const result = await fn();
      setLicenseInfo(result.license || null);
    } catch {
      setLicenseInfo(null);
    }
    setLicenseInfoLoading(false);
  }, []);

  const loadDriveStatus = useCallback(async () => {
    if (!token) { setDriveStatusLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}google-drive/status`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDriveStatus(data);
    } catch {
      setDriveStatus(null);
    }
    setDriveStatusLoading(false);
  }, [token]);

  const loadBackupStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}google-drive/backup-status`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBackupStats(data);
    } catch {
      setBackupStats(null);
    }
  }, [token]);

  const loadQueueStatus = useCallback(async () => {
    const fn = (window as unknown as { electron?: { backupGetStatus?: () => Promise<typeof queueStatus> } }).electron?.backupGetStatus;
    if (!fn) return;
    const status = await fn();
    if (status) setQueueStatus(status);
  }, []);

  const loadCasesBackupStatus = useCallback(async () => {
    const fn = (window as unknown as { electron?: { backupGetAllCasesStatus?: () => Promise<typeof casesBackupStatus> } }).electron?.backupGetAllCasesStatus;
    if (!fn) return;
    const list = await fn();
    if (list) setCasesBackupStatus(list);
  }, []);

  const handleSetScanInterval = async (minutes: number) => {
    setSettingScanInterval(true);
    const fn = (window as unknown as { electron?: { backupSetScanInterval?: (m: number) => Promise<number> } }).electron?.backupSetScanInterval;
    await fn?.(minutes);
    setQueueStatus((prev) => prev ? { ...prev, scanIntervalMinutes: minutes } : prev);
    setSettingScanInterval(false);
  };

  useEffect(() => {
    const fn = (window as unknown as { electron?: { onBackupProgress?: (cb: (s: NonNullable<typeof queueStatus>) => void) => () => void } }).electron?.onBackupProgress;
    const off = fn?.((status) => setQueueStatus(status));
    return () => { off?.(); if (connectionPollRef.current) clearInterval(connectionPollRef.current); };
  }, []);

  const handleConnectDrive = async () => {
    if (!token) return;
    setConnectingDrive(true);
    setDriveError('');
    try {
      const res = await fetch(`${API_URL}google-drive/connect`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data.authUrl) throw new Error(data.error || 'Bağlantı başlatılamadı.');
      const openFn = (window as unknown as { electron?: { openExternalUrl?: (u: string) => void } }).electron?.openExternalUrl;
      if (openFn) openFn(data.authUrl); else window.open(data.authUrl, '_blank');

      setPollingConnection(true);
      let attempts = 0;
      if (connectionPollRef.current) clearInterval(connectionPollRef.current);
      connectionPollRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`${API_URL}google-drive/status`, { headers: { Authorization: `Bearer ${token}` } });
          const statusData = await statusRes.json();
          setDriveStatus(statusData);
          if (statusData.connected) {
            if (connectionPollRef.current) clearInterval(connectionPollRef.current);
            connectionPollRef.current = null;
            setPollingConnection(false);
            loadBackupStats();
          }
        } catch { /* Retried next interval */ }
        if (attempts >= 40 && connectionPollRef.current) {
          clearInterval(connectionPollRef.current);
          connectionPollRef.current = null;
          setPollingConnection(false);
        }
      }, 3000);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Google Drive bağlantısı başlatılamadı.');
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!token) return;
    const ok = await confirmDialog({
      title: 'Google Drive Bağlantısını Kes',
      message: "Google Drive bağlantınızı kesmek istediğinize emin misiniz? Yerel dosyalarınız ve Drive'daki mevcut yedekleriniz silinmeyecektir.",
      confirmText: 'Bağlantıyı Kes',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    setDisconnectingDrive(true);
    setDriveError('');
    try {
      await fetch(`${API_URL}google-drive/disconnect`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      await loadDriveStatus();
      toast.success('Google Drive bağlantısı kesildi.');
    } catch {
      setDriveError('Bağlantı kesilemedi.');
      toast.error('Bağlantı kesilirken hata oluştu.');
    }
    setDisconnectingDrive(false);
  };

  const handleBackupNow = async () => {
    setTriggeringBackup(true);
    const fn = (window as unknown as { electron?: { backupTriggerNow?: () => Promise<void> } }).electron?.backupTriggerNow;
    await fn?.();
    await Promise.all([loadQueueStatus(), loadBackupStats(), loadCasesBackupStatus()]);
    setTriggeringBackup(false);
  };

  const handleToggleAutoBackup = async (enabled: boolean) => {
    const fn = (window as unknown as { electron?: { backupSetAutoEnabled?: (e: boolean) => Promise<void> } }).electron?.backupSetAutoEnabled;
    await fn?.(enabled);
    setQueueStatus((prev) => prev ? { ...prev, autoBackupEnabled: enabled } : prev);
  };

  const handleOpenDrive = () => {
    const url = 'https://drive.google.com/drive/search?q=AyrisLegal';
    const fn = (window as unknown as { electron?: { openExternalUrl?: (u: string) => void } }).electron?.openExternalUrl;
    if (fn) fn(url); else window.open(url, '_blank');
  };

  useEffect(() => {
    const fn = (window as unknown as { electron?: { onRestoreProgress?: (cb: (s: { total: number; restored: number; failed: number }) => void) => () => void } }).electron?.onRestoreProgress;
    const off = fn?.((status) => setRestoreProgress(status));
    return () => off?.();
  }, []);

  const handleCheckRestore = async () => {
    setRestoreChecking(true);
    setRestoreError('');
    setRestoreDone(null);
    const fn = (window as unknown as { electron?: { restoreListFiles?: () => Promise<{ files: unknown[]; error?: string }> } }).electron?.restoreListFiles;
    const result = await fn?.();
    if (result?.error) setRestoreError(result.error);
    setRestoreFilesFound(result?.files?.length ?? 0);
    setRestoreChecking(false);
  };

  const handleStartRestore = async () => {
    setRestoreRunning(true);
    setRestoreError('');
    const fn = (window as unknown as { electron?: { restoreStart?: () => Promise<{ started: boolean; error?: string; restored?: number; failed?: number }> } }).electron?.restoreStart;
    const result = await fn?.();
    if (result && !result.started && result.error) {
      setRestoreError(result.error);
    } else if (result?.started) {
      setRestoreDone({ restored: result.restored || 0, failed: result.failed || 0 });
    }
    setRestoreRunning(false);
    setRestoreFilesFound(null);
  };

  const loadSupportHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSupportHistoryLoading(false); return; }
    const { data } = await supabase
      .from('support_messages')
      .select('id, category, subject, message, status, created_at, attachment_name, attachment_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSupportHistory((data as SupportMessageRow[]) || []);
    setSupportHistoryLoading(false);
  }, []);

  const loadAppVersion = useCallback(async () => {
    const fn = (window as unknown as { electron?: { appGetVersion?: () => Promise<string> } }).electron?.appGetVersion;
    if (!fn) return;
    setAppVersion(await fn());
  }, []);

  const loadCrashReportingSetting = useCallback(async () => {
    const fn = (window as unknown as { electron?: { crashGetReportingEnabled?: () => Promise<boolean> } }).electron?.crashGetReportingEnabled;
    if (!fn) { setCrashReportingLoading(false); return; }
    const enabled = await fn();
    setCrashReportingEnabled(enabled);
    setCrashReportingLoading(false);
  }, []);

  const handleToggleCrashReporting = async (enabled: boolean) => {
    setCrashReportingEnabled(enabled);
    const fn = (window as unknown as { electron?: { crashSetReportingEnabled?: (e: boolean) => Promise<void> } }).electron?.crashSetReportingEnabled;
    await fn?.(enabled);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadProfile(), loadSupportHistory(), loadLicenseInfo(), loadDriveStatus(), loadBackupStats(), loadQueueStatus(), loadCasesBackupStatus(), loadCrashReportingSetting(), loadAppVersion()]);
    })();
  }, [loadProfile, loadSupportHistory, loadLicenseInfo, loadDriveStatus, loadBackupStats, loadQueueStatus, loadCasesBackupStatus, loadCrashReportingSetting, loadAppVersion]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingProfile(false); return; }
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        bar_name: barName.trim() || null,
        bar_association_no: barNo.trim() || null,
      })
      .eq('id', user.id);
    setSavingProfile(false);
    if (!error) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('Şifre en az 6 karakter olmalı.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Şifreler eşleşmiyor.'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { setPasswordError(error.message || 'Şifre değiştirilemedi.'); return; }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordChanged(true);
    setTimeout(() => setPasswordChanged(false), 3000);
  };

  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim() || sendingSupport) return;
    setSendingSupport(true);
    setSupportError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSupportError('Oturum bulunamadı.'); setSendingSupport(false); return; }

    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize: number | null = null;
    if (supportFile) {
      setUploadingAttachment(true);
      const ext = supportFile.name.split('.').pop() || 'bin';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(path, supportFile, { cacheControl: '3600', upsert: false });
      setUploadingAttachment(false);
      if (uploadError) {
        setSupportError('Ek dosya yüklenemedi: ' + (uploadError.message || 'Bilinmeyen hata'));
        setSendingSupport(false);
        return;
      }
      attachmentPath = path;
      attachmentName = supportFile.name;
      attachmentSize = supportFile.size;
    }

    const { error } = await supabase.from('support_messages').insert([{
      user_id: user.id,
      category: supportCategory,
      subject: supportSubject.trim(),
      message: supportMessage.trim(),
      ...(attachmentPath ? { attachment_path: attachmentPath, attachment_name: attachmentName, attachment_size: attachmentSize } : {}),
    }]);

    if (!error) {
      // Direct notification dispatch via API Route (SMTP Mail & Telegram)
      try {
        await fetch('/api/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: supportCategory,
            subject: supportSubject.trim(),
            message: supportMessage.trim(),
            userId: user.id,
            attachmentName: attachmentName,
          }),
        });
      } catch (err) {
        console.warn('Support notification dispatch error:', err);
      }
    }

    setSendingSupport(false);
    if (error) { setSupportError('Gönderilemedi, lütfen tekrar deneyin.'); return; }
    setSupportSubject('');
    setSupportMessage('');
    setSupportFile(null);
    if (supportFileInputRef.current) supportFileInputRef.current.value = '';
    setSupportSent(true);
    setTimeout(() => setSupportSent(false), 3000);
    loadSupportHistory();
  };

  const effectiveLicense = licenseInfo || profileLicense;
  const planLabel = effectiveLicense?.status === 'active' ? 'Aktif' : effectiveLicense?.status === 'revoked' ? 'İptal Edildi' : effectiveLicense?.status === 'expired' ? 'Süresi Dolmuş' : effectiveLicense?.status === 'trial' ? 'Deneme' : '—';
  const planIsActive = effectiveLicense?.status === 'active';

  const navItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'kullanici', label: 'Kullanıcı Bilgileri', icon: Icon.users },
    { id: 'abonelik', label: 'Plan ve Abonelik', icon: Icon.spark },
    { id: 'yedekleme', label: 'Yedekleme & Drive', icon: Icon.cloud },
    { id: 'destek', label: 'Destek & Bildirim', icon: Icon.msg },
    { id: 'gizlilik', label: 'Gizlilik ve Hatalar', icon: Icon.shield },
    { id: 'gorunum', label: 'Görünüm ve Tema', icon: theme === 'light' ? Icon.moon : Icon.sun },
    { id: 'oturum', label: 'Oturum Yönetimi', icon: Icon.settings },
  ];

  return (
    <div className="flex h-full gap-6 p-1">
      {/* Sol: Menü Bölümleri */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2 border-r border-[#1E293B]/70 pr-5">
        <div className="pb-4 mb-2 border-b border-[#1E293B]/60">
          <h1 className="text-[22px] font-extrabold text-white tracking-tight leading-none mb-1 font-sans">Ayarlar</h1>
          <p className="text-[12px] font-mono text-[#8C9BB4]">Hesap, lisans ve sistem tercihleri</p>
        </div>

        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#64748B] px-3 py-1">MENÜ</div>
        
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-mono text-[13px] font-semibold transition-all cursor-pointer text-left w-full ${
                  isActive
                    ? 'bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/20'
                    : 'text-[#8C9BB4] hover:bg-[#151C2C] hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-[#60A5FA]'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Launch Onboarding Button */}
        <div className="mt-auto pt-4 border-t border-[#1E293B]/60">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-onboarding'))}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6]/15 to-[#8B5CF6]/15 hover:from-[#3B82F6]/25 hover:to-[#8B5CF6]/25 border border-[#3B82F6]/30 text-[#60A5FA] font-mono text-[11px] font-bold transition-all cursor-pointer shadow-sm"
          >
            <span>🚀</span>
            <span>Başlangıç Rehberi & Eklenti</span>
          </button>
        </div>
      </div>

      {/* Sağ: İçerik Kartı */}
      <div className="flex-1 min-w-0 max-w-3xl overflow-y-auto pr-2">
        {/* SECTION: Kullanıcı Bilgileri */}
        {section === 'kullanici' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-extrabold text-white tracking-tight leading-none mb-1">Kullanıcı Profil Bilgileri</h1>
              <p className="text-[13px] font-mono text-[#8C9BB4]">Kişisel ve mesleki bilgilerinizi güncelleyin</p>
            </div>

            <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">AD SOYAD</label>
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={profileLoading}
                  className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none w-full transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">BAĞLI OLDUĞU BARO</label>
                  <input
                    type="text"
                    placeholder="Örn. İstanbul Barosu"
                    value={barName}
                    onChange={e => setBarName(e.target.value)}
                    disabled={profileLoading}
                    className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none w-full transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">BARO SİCİL NO</label>
                  <input
                    type="text"
                    placeholder="Baro Sicil No"
                    value={barNo}
                    onChange={e => setBarNo(e.target.value)}
                    disabled={profileLoading}
                    className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none w-full transition-all font-mono"
                  />
                </div>
              </div>

              <div className="text-[12px] font-mono text-[#64748B] pt-1">
                E-posta Adresi: <span className="text-[#E2E8F0] font-semibold">{currentUser?.email}</span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || profileLoading}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Kaydediliyor...' : 'Profil Bilgilerini Kaydet'}
                </button>
                {profileSaved && <span className="text-[13px] font-mono text-[#00E699] font-bold">Kaydedildi ✓</span>}
              </div>
            </div>

            {/* Şifre Değiştirme Kartı */}
            <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-4">
              <div className="text-[12px] font-mono font-bold text-[#60A5FA] uppercase tracking-wider">ŞİFRE DEĞİŞTİR</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">YENİ ŞİFRE</label>
                  <input
                    type="password"
                    placeholder="En az 6 karakter"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none w-full transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">YENİ ŞİFRE (TEKRAR)</label>
                  <input
                    type="password"
                    placeholder="Şifreyi tekrar girin"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none w-full transition-all font-mono"
                  />
                </div>
              </div>

              {passwordError && <div className="text-[12px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{passwordError}</div>}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="bg-[#151C2C] hover:bg-[#1E293B] text-white border border-[#1E293B] font-mono font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Güncelle'}
                </button>
                {passwordChanged && <span className="text-[13px] font-mono text-[#00E699] font-bold">Şifreniz Değiştirildi ✓</span>}
              </div>
            </div>

            {appVersion && (
              <div className="text-[12px] font-mono text-[#64748B]">AyrisLegal Sürümü: v{appVersion}</div>
            )}
          </div>
        )}

        {/* SECTION: Plan ve Abonelik */}
        {section === 'abonelik' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-extrabold text-white tracking-tight leading-none mb-1">Plan ve Lisans Aboneliği</h1>
              <p className="text-[13px] font-mono text-[#8C9BB4]">Aktif lisans durumunuz ve paket detayları</p>
            </div>

            <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-4">
              {licenseInfoLoading || profileLoading ? (
                <div className="text-[13px] font-mono text-[#64748B]">Yükleniyor...</div>
              ) : effectiveLicense?.status === 'active' ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-[16px] font-extrabold text-white mb-1">
                        Mevcut Paket: <span className="text-[#00E699]">{effectiveLicense.plan} · {planLabel}</span>
                      </div>
                      <p className="text-[13px] font-mono text-[#8C9BB4]">
                        Tüm gelişmiş yapay zeka ve mevzuat fonksiyonları aktif.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[13px] font-mono bg-[#080D1A] border border-[#1E293B] p-3.5 rounded-xl">
                      <div>
                        <span className="text-[#64748B] block text-[11px]">BİTİŞ TARİHİ</span>
                        <span className="text-white font-bold">{effectiveLicense.expires_at ? new Date(effectiveLicense.expires_at).toLocaleDateString('tr-TR') : 'Süresiz Lisans'}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[11px]">HESAP DURUMU</span>
                        <span className="text-white font-bold">{effectiveLicense.max_devices ? (effectiveLicense.max_devices + ' Cihaz') : 'Aktif Üyelik'}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://ayrislegal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap self-start sm:self-center"
                  >
                    Planı Yönet ↗
                  </a>
                </div>
              ) : trialDaysLeft !== null && trialDaysLeft > 0 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[16px] font-extrabold text-white mb-1">
                      Mevcut Plan: <span className="text-[#00E699]">Deneme Sürümü</span>
                    </div>
                    <p className="text-[13px] font-mono text-[#8C9BB4]">
                      AyrisLegal özelliklerini <strong className="text-white">{trialDaysLeft} gün</strong> daha kullanabilirsiniz.
                    </p>
                  </div>
                  <a
                    href="https://ayrislegal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap"
                  >
                    Lisans Satın Al ↗
                  </a>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[16px] font-extrabold text-white mb-1">
                      Mevcut Plan: <span className="text-red-400">Süresi Dolmuş</span>
                    </div>
                    <p className="text-[13px] font-mono text-[#8C9BB4]">
                      Lisans veya deneme süreniz sona erdi. Lütfen hesabınızı yenileyin.
                    </p>
                  </div>
                  <a
                    href="https://ayrislegal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap"
                  >
                    Lisans Satın Al ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: Yedekleme & Google Drive */}
        {section === 'yedekleme' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-extrabold text-white tracking-tight leading-none mb-1">Google Drive Bulut Yedekleme</h1>
              <p className="text-[13px] font-mono text-[#8C9BB4]">Dava dosyalarınızı kendi Google Drive hesabınızda güvenle saklayın</p>
            </div>

            <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-5">
              {driveStatusLoading ? (
                <div className="text-[13px] font-mono text-[#64748B]">Yükleniyor...</div>
              ) : driveStatus?.connected ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between bg-[#080D1A] border border-[#1E293B] p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#00E699] animate-pulse" />
                      <div>
                        <div className="text-[14px] font-bold text-white">Google Drive Bağlı</div>
                        <div className="text-[12px] font-mono text-[#8C9BB4]">{driveStatus.google_email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-mono text-[#8C9BB4]">Otomatik Yedekleme:</span>
                      <button
                        onClick={() => handleToggleAutoBackup(!queueStatus?.autoBackupEnabled)}
                        className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                          queueStatus?.autoBackupEnabled
                            ? 'bg-[#00E699]/20 border-[#00E699]/40 text-[#00E699]'
                            : 'bg-[#151C2C] border-[#1E293B] text-[#64748B]'
                        }`}
                      >
                        {queueStatus?.autoBackupEnabled ? 'AÇIK ✓' : 'KAPALI'}
                      </button>
                    </div>
                  </div>

                  {/* Tarama Aralığı — "her N dakikada bir tara, değişen varsa yükle" */}
                  <div className="flex items-center justify-between bg-[#080D1A] border border-[#1E293B] p-4 rounded-xl">
                    <div>
                      <div className="text-[13px] font-bold text-white">Yedekleme Tarama Aralığı</div>
                      <div className="text-[11px] font-mono text-[#64748B] mt-0.5">Bu aralıkla dosyalar taranır, sadece değişenler Drive'a yüklenir.</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[5, 15, 30, 60].map((minutes) => (
                        <button
                          key={minutes}
                          onClick={() => handleSetScanInterval(minutes)}
                          disabled={settingScanInterval}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                            (queueStatus?.scanIntervalMinutes ?? 5) === minutes
                              ? 'bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#60A5FA]'
                              : 'bg-[#151C2C] border-[#1E293B] text-[#64748B]'
                          }`}
                        >
                          {minutes < 60 ? `${minutes} dk` : '1 saat'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Backup Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px] font-mono">
                    <div className="bg-[#080D1A] border border-[#1E293B] p-3.5 rounded-xl">
                      <div className="text-[11px] text-[#64748B] mb-1">SON YEDEKLENME</div>
                      <div className="text-white font-bold">{backupStats?.last_sync_at ? new Date(backupStats.last_sync_at).toLocaleString('tr-TR') : 'Henüz yok'}</div>
                    </div>
                    <div className="bg-[#080D1A] border border-[#1E293B] p-3.5 rounded-xl">
                      <div className="text-[11px] text-[#64748B] mb-1">YEDEKLENEN DOSYA</div>
                      <div className="text-white font-bold">{backupStats?.total_files ?? 0} Adet</div>
                    </div>
                    <div className="bg-[#080D1A] border border-[#1E293B] p-3.5 rounded-xl">
                      <div className="text-[11px] text-[#64748B] mb-1">TOPLAM BULUT BOYUTU</div>
                      <div className="text-white font-bold">{formatBytes(backupStats?.total_size || 0)}</div>
                    </div>
                  </div>

                  {driveError && <div className="text-[12px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{driveError}</div>}

                  {/* Yedeklenen Dosyalar — dava bazında hangi klasörlerin yedeklendiği */}
                  <div className="bg-[#080D1A] border border-[#1E293B] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowCasesBackupList((v) => !v)}
                      className="w-full flex items-center justify-between p-3.5 cursor-pointer"
                    >
                      <span className="text-[13px] font-bold text-white">Yedeklenen Dosyalar ({casesBackupStatus.length} dava)</span>
                      <span className="text-[#64748B] text-[12px] font-mono">{showCasesBackupList ? '▲ Gizle' : '▼ Göster'}</span>
                    </button>
                    {showCasesBackupList && (
                      <div className="border-t border-[#1E293B] max-h-64 overflow-y-auto">
                        {casesBackupStatus.length === 0 ? (
                          <div className="p-3.5 text-[12px] font-mono text-[#64748B]">Henüz yedeklenen dosya yok.</div>
                        ) : (
                          casesBackupStatus.map((c) => (
                            <div key={c.caseTitle} className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1E293B] last:border-b-0">
                              <div className="text-[12px] font-mono text-white truncate pr-3">{c.caseTitle}</div>
                              <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono text-[#8C9BB4]">
                                <span>{c.syncedCount}/{c.fileCount} dosya</span>
                                <span>{c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleDateString('tr-TR') : '—'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap pt-2">
                    <button
                      onClick={handleBackupNow}
                      disabled={triggeringBackup}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[12px] px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {triggeringBackup ? '⏳ Yedekleniyor...' : '☁️ Şimdi Yedekle'}
                    </button>
                    <button
                      onClick={handleOpenDrive}
                      className="bg-[#151C2C] hover:bg-[#1E293B] text-white border border-[#1E293B] font-mono font-bold text-[12px] px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Drive Klasörünü Aç ↗
                    </button>
                    <button
                      onClick={handleCheckRestore}
                      disabled={restoreChecking || restoreRunning}
                      className="bg-[#151C2C] hover:bg-[#1E293B] text-[#60A5FA] border border-[#3B82F6]/30 font-mono font-bold text-[12px] px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      {restoreChecking ? 'Kontrol ediliyor...' : "Drive'dan Geri Yükle"}
                    </button>
                    <button
                      onClick={handleDisconnectDrive}
                      disabled={disconnectingDrive}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono font-bold text-[12px] px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      {disconnectingDrive ? 'Kesiliyor...' : 'Bağlantıyı Kes'}
                    </button>
                  </div>

                  {restoreFilesFound !== null && !restoreRunning && (
                    <div className="bg-[#080D1A] border border-[#3B82F6]/40 p-4 rounded-xl flex items-center justify-between gap-4 mt-2">
                      <div>
                        <div className="text-[14px] font-bold text-white mb-0.5">Google Drive Geri Yükleme Konfirmasyonu</div>
                        <div className="text-[12px] font-mono text-[#8C9BB4]">Bulut yedeğinizde {restoreFilesFound} dosya bulundu.</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setRestoreFilesFound(null)} className="px-3 py-1.5 rounded-lg font-mono text-[12px] text-[#8C9BB4]">Vazgeç</button>
                        <button onClick={handleStartRestore} disabled={restoreFilesFound === 0} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[12px] px-4 py-1.5 rounded-lg">Geri Yükle</button>
                      </div>
                    </div>
                  )}

                  {restoreRunning && restoreProgress && (
                    <div className="bg-[#080D1A] border border-[#1E293B] p-4 rounded-xl mt-2 flex flex-col gap-2">
                      <div className="text-[13px] font-mono text-white">Geri yükleniyor... {restoreProgress.restored}/{restoreProgress.total}</div>
                      <div className="bg-[#1E293B] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#3B82F6] h-full transition-all duration-200" style={{ width: `${restoreProgress.total > 0 ? Math.round((restoreProgress.restored / restoreProgress.total) * 100) : 0}%` }} />
                      </div>
                    </div>
                  )}

                  {restoreDone && (
                    <div className="text-[13px] font-mono text-[#00E699]">✓ {restoreDone.restored} dosya başarıyla cihazınıza indirildi ve yerel klasörlere restore edildi.</div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-[13px] font-mono text-[#8C9BB4] leading-relaxed">
                    Dava dosyalarınızı ve metin verilerinizi kendi Google Drive hesabınıza uçtan uca otomatik yedekleyebilirsiniz. AyrisLegal sadece kendisi tarafından oluşturulan özel klasöre erişir.
                  </p>
                  {pollingConnection && (
                    <div className="text-[12px] font-mono text-[#FBBF24] bg-[#FBBF24]/10 p-3 rounded-xl border border-[#FBBF24]/20">
                      Tarayıcınızda Google oturum açma işlemini tamamlayın — bu ekran otomatik güncellenecektir...
                    </div>
                  )}
                  {driveError && <div className="text-[12px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{driveError}</div>}
                  <button
                    onClick={handleConnectDrive}
                    disabled={connectingDrive || pollingConnection}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer self-start disabled:opacity-50"
                  >
                    {connectingDrive ? 'Yönlendiriliyor...' : pollingConnection ? 'Bekleniyor...' : 'Google Drive Hesabını Bağla ↗'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: Destek & Geri Bildirim */}
        {section === 'destek' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-extrabold text-white tracking-tight leading-none mb-1">Destek & Geri Bildirim</h1>
              <p className="text-[13px] font-mono text-[#8C9BB4]">Teknik ekip ile iletişime geçin veya istek bildirimi yapın</p>
            </div>

            <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">BİLDİRİM KATEGORİSİ</label>
                  <select
                    value={supportCategory}
                    onChange={e => setSupportCategory(e.target.value)}
                    className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none w-full font-sans cursor-pointer"
                  >
                    {SUPPORT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">KONU BAŞLIĞI</label>
                  <input
                    type="text"
                    placeholder="Konu başlığı"
                    value={supportSubject}
                    onChange={e => setSupportSubject(e.target.value)}
                    className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none w-full font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-mono font-semibold text-[#8C9BB4] mb-1.5">AÇIKLAMA VEYA MESAJINIZ</label>
                <textarea
                  placeholder="Detayları yazın..."
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  className="bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl p-4 text-[14px] text-white outline-none w-full min-h-[110px] resize-y font-sans"
                />
              </div>

              {/* Ek dosya */}
              <input
                ref={supportFileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                onChange={e => setSupportFile(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => supportFileInputRef.current?.click()}
                  type="button"
                  className="bg-[#151C2C] hover:bg-[#1E293B] text-white border border-[#1E293B] font-mono font-bold text-[12px] px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>📎</span>
                  <span>{supportFile ? 'Eki Değiştir' : 'Ek Ekran Görüntüsü / Dosya Ekle'}</span>
                </button>
                {supportFile && (
                  <span className="text-[12px] font-mono bg-[#080D1A] border border-[#1E293B] px-3 py-1.5 rounded-xl text-[#60A5FA] flex items-center gap-2">
                    <span>{supportFile.name}</span>
                    <button onClick={() => { setSupportFile(null); if (supportFileInputRef.current) supportFileInputRef.current.value = ''; }} className="text-red-400 font-bold">×</button>
                  </span>
                )}
              </div>

              {supportError && <div className="text-[12px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{supportError}</div>}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSendSupport}
                  disabled={sendingSupport || uploadingAttachment || !supportSubject.trim() || !supportMessage.trim()}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-mono font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {uploadingAttachment ? 'Ek Yükleniyor...' : sendingSupport ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                </button>
                {supportSent && <span className="text-[13px] font-mono text-[#00E699] font-bold">Mesajınız Destek Ekibine İletildi ✓</span>}
              </div>
            </div>

            {/* Önceki Bildirimler */}
            {!supportHistoryLoading && supportHistory.length > 0 && (
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-3">
                <div className="text-[12px] font-mono font-bold text-[#64748B] uppercase tracking-wider mb-1">ÖNCEKİ BİLDİRİMLERİNİZ</div>
                <div className="divide-y divide-[#1E293B]">
                  {supportHistory.map(s => (
                    <div key={s.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[14px] font-bold text-white">{s.subject}</div>
                        <div className="text-[12px] font-mono text-[#8C9BB4]">{supportCategoryLabel(s.category)} · {formatRelativeTr(s.created_at)}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold ${
                        s.status === 'cozuldu' ? 'bg-[#00E699]/15 text-[#00E699] border border-[#00E699]/30' : 'bg-[#151C2C] text-[#8C9BB4] border border-[#1E293B]'
                      }`}>
                        {s.status === 'cozuldu' ? 'Çözüldü ✓' : 'İncelemede'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION: Gizlilik */}
        {section === 'gizlilik' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-extrabold text-white tracking-tight leading-none mb-1">Gizlilik ve Veri Güvenliği</h1>
              <p className="text-[13px] font-mono text-[#8C9BB4]">Veri işleme ve anonim hata bildirimi tercihleri</p>
            </div>

            <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-4">
              <p className="text-[13px] font-mono text-[#8C9BB4] leading-relaxed">
                Uygulamanın kararlılığını ve performansını artırmak için anonim çökme raporları toplanır. Dava dosyalarınızın, müvekkil isimlerinizin ve belge içeriklerinizin hiçbir şekilde dışarı çıkarılmadığını taahhüt ederiz.
              </p>

              <div className="flex items-center justify-between bg-[#080D1A] border border-[#1E293B] p-4 rounded-xl">
                <div>
                  <div className="text-[14px] font-bold text-white">Anonim Hata ve Çökme Raporlama</div>
                  <div className="text-[12px] font-mono text-[#64748B]">Sadece sistem hatalarını geliştirici ekibe iletir</div>
                </div>
                <button
                  onClick={() => handleToggleCrashReporting(!crashReportingEnabled)}
                  disabled={crashReportingLoading}
                  className={`px-4 py-2 rounded-xl font-mono text-[12px] font-bold border transition-all cursor-pointer ${
                    crashReportingEnabled
                      ? 'bg-[#00E699]/20 border-[#00E699]/40 text-[#00E699]'
                      : 'bg-[#151C2C] border-[#1E293B] text-[#64748B]'
                  }`}
                >
                  {crashReportingEnabled ? 'AÇIK ✓' : 'KAPALI'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Görünüm */}
        {section === 'gorunum' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-extrabold text-white tracking-tight leading-none mb-1">Görünüm ve Tema</h1>
              <p className="text-[13px] font-mono text-[#8C9BB4]">Arayüz görsel tercihlerinizi ayarlayın</p>
            </div>

            <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner flex flex-col gap-4">
              <div>
                <div className="text-[15px] font-bold text-white mb-0.5">Uygulama Renk Teması</div>
                <div className="text-[12px] font-mono text-[#8C9BB4]">Koyu (Dark) ve Aydınlık (Light) modlar arası tercih yapın</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {/* Dark Theme Option */}
                <div
                  onClick={() => {
                    if (theme !== 'dark') toggleTheme();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-3 ${
                    theme === 'dark'
                      ? 'border-[#3B82F6] bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]'
                      : 'border-[#1E293B] bg-[#070d1f] hover:border-[#3B82F6]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-[14px] text-white">
                      <span>{Icon.moon}</span>
                      <span>Koyu Tema (Varsayılan)</span>
                    </div>
                    {theme === 'dark' && (
                      <span className="text-[11px] font-mono bg-[#3B82F6] text-white px-2 py-0.5 rounded-md">Aktif</span>
                    )}
                  </div>
                  <div className="h-16 rounded-lg bg-[#0B0F19] border border-[#1E293B] p-2 flex gap-2 items-center">
                    <div className="w-1/4 h-full bg-[#0C1324] rounded border border-[#1E293B]" />
                    <div className="flex-1 h-full flex flex-col gap-1.5 justify-center">
                      <div className="w-3/4 h-2 bg-[#3B82F6] rounded" />
                      <div className="w-1/2 h-2 bg-[#1E293B] rounded" />
                    </div>
                  </div>
                  <p className="text-[12px] text-[#94A3B8]">Gözü yormayan derin ve şık koyu renk paleti</p>
                </div>

                {/* Light Theme Option */}
                <div
                  onClick={() => {
                    if (theme !== 'light') toggleTheme();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-3 ${
                    theme === 'light'
                      ? 'border-[#3B82F6] bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]'
                      : 'border-[#1E293B] bg-[#070d1f] hover:border-[#3B82F6]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-[14px] text-white">
                      <span>{Icon.sun}</span>
                      <span>Aydınlık Tema (Light)</span>
                    </div>
                    {theme === 'light' && (
                      <span className="text-[11px] font-mono bg-[#3B82F6] text-white px-2 py-0.5 rounded-md">Aktif</span>
                    )}
                  </div>
                  <div className="h-16 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2 flex gap-2 items-center">
                    <div className="w-1/4 h-full bg-[#FFFFFF] rounded border border-[#CBD5E1]" />
                    <div className="flex-1 h-full flex flex-col gap-1.5 justify-center">
                      <div className="w-3/4 h-2 bg-[#2563EB] rounded" />
                      <div className="w-1/2 h-2 bg-[#CBD5E1] rounded" />
                    </div>
                  </div>
                  <p className="text-[12px] text-[#94A3B8]">Aydınlık ortamlarda yüksek okunabilirlik sağlayan ferah palet</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Oturum Yönetimi */}
        {section === 'oturum' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-extrabold text-white tracking-tight leading-none mb-1">Oturum Yönetimi</h1>
              <p className="text-[13px] font-mono text-[#8C9BB4]">Hesap oturumunuzu güvenle sonlandırın</p>
            </div>

            <div className="bg-[#0C1324] border border-red-500/30 rounded-2xl p-6 shadow-inner flex flex-col gap-3">
              <div className="text-[14px] font-bold text-white">Oturumu Kapat</div>
              <p className="text-[13px] font-mono text-[#8C9BB4]">
                Oturumunuzu kapattığınızda yerel dosyalarınız silinmez. Tekrar giriş yaparak çalışmalarınıza devam edebilirsiniz.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-mono font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Güvenli Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}