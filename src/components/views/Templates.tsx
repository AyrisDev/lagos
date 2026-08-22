import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';
import { formatRelativeTr, useSupabaseToken } from '@/lib/utils';
import { TemplateRow } from '@/types';
import { useToast } from '@/components/ToastProvider';

export function Templates() {
  const { toast, confirm: confirmDialog } = useToast();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // New Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formCategory, setFormCategory] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  // Preview & Edit Modal State
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Modal Escape key listeners
  useEffect(() => {
    if (!isModalOpen && !previewTemplate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setPreviewTemplate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, previewTemplate]);
  
  const token = useSupabaseToken();

  const loadTemplates = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('templates')
        .select('id, category, name, description, file_size, mime_type, created_at, extracted_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTemplates((data as TemplateRow[]) || []);
    } catch {
      // Ignore background load error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { (async () => { await loadTemplates(); })(); }, [loadTemplates]);

  const handleUpload = async () => {
    if (!formName.trim() || !formFile || uploading) return;
    setUploading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Oturum açılmamış.');
        setUploading(false);
        return;
      }

      let apiSuccess = false;
      try {
        const fd = new FormData();
        fd.append('file', formFile);
        fd.append('name', formName.trim());
        if (formCategory.trim()) fd.append('category', formCategory.trim());
        if (formDescription.trim()) fd.append('description', formDescription.trim());
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}templates/upload`, { method: 'POST', headers, body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.template) {
          apiSuccess = true;
        }
      } catch {
        // Fallback to direct Supabase upload below
      }

      if (!apiSuccess) {
        const sanitizeFilename = (name: string) => {
          const charMap: Record<string, string> = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
          const engName = name.replace(/[çğıöşüÇĞİÖŞÜ]/g, m => charMap[m]);
          return engName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        };

        const safeName = sanitizeFilename(formFile.name);
        const storagePath = `templates/${user.id}/${Date.now()}_${safeName}`;

        const { error: storageErr } = await supabase.storage
          .from('case-documents')
          .upload(storagePath, formFile, { contentType: formFile.type || 'application/octet-stream' });

        if (storageErr) {
          setError('Şablon dosyası yüklenemedi: ' + storageErr.message);
          setUploading(false);
          return;
        }

        let localText: string | null = null;
        try {
          if (formFile.name.toLowerCase().endsWith('.txt') || formFile.name.toLowerCase().endsWith('.xml')) {
            localText = await formFile.text();
          }
        } catch (_) {}

        const { error: dbErr } = await supabase
          .from('templates')
          .insert([{
            user_id: user.id,
            category: formCategory.trim() || null,
            name: formName.trim().slice(0, 200),
            description: formDescription.trim() || null,
            storage_path: storagePath,
            file_size: formFile.size,
            mime_type: formFile.type || 'application/octet-stream',
            extracted_text: localText
          }]);

        if (dbErr) {
          setError('Şablon kaydı veritabanına eklenemedi: ' + dbErr.message);
          setUploading(false);
          return;
        }
      }

      setIsModalOpen(false);
      setFormCategory(''); setFormName(''); setFormDescription(''); setFormFile(null);
      await loadTemplates();
    } catch (err: any) {
      setError('Şablon yüklenirken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (t: TemplateRow | any) => {
    try {
      if (typeof t.id === 'string' && t.id.startsWith('demo')) {
        toast.info('Bu bir demo şablondur. Kendi yüklediğiniz şablonları indirebilirsiniz.');
        return;
      }
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}templates/${encodeURIComponent(t.id)}/download-url`, { headers });
      const data = await res.json();
      if (res.ok && data.url) window.open(data.url, '_blank');
    } catch {
      toast.error('Şablon indirilemedi.');
    }
  };

  const handleDelete = async (t: TemplateRow | any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ok = await confirmDialog({
      title: 'Şablonu Sil',
      message: `"${t.name}" şablonunu silmek istediğinizden emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    if (typeof t.id === 'string' && t.id.startsWith('demo')) {
      if (previewTemplate?.id === t.id) setPreviewTemplate(null);
      toast.success('Şablon kaldırıldı.');
      return;
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_URL}templates/${encodeURIComponent(t.id)}`, { method: 'DELETE', headers });
      if (res.ok) {
        setTemplates(prev => prev.filter(x => x.id !== t.id));
        if (previewTemplate?.id === t.id) setPreviewTemplate(null);
        toast.success('Şablon silindi.');
      } else {
        toast.error('Şablon silinemedi.');
      }
    } catch {
      toast.error('Bağlantı hatası: Şablon silinemedi.');
    }
  };

  const handleOpenPreview = (t: any) => {
    setPreviewTemplate(t);
    setEditName(t.name || '');
    setEditCategory(t.category || '');
    setEditDescription(t.description || '');
    setEditText(t.extracted_text || t.text_content || t.content || '');
    setIsEditing(false);
    setEditError('');
    setCopiedText(false);
  };

  const handleSaveEdit = async () => {
    if (!previewTemplate || savingEdit || !editName.trim()) return;
    setSavingEdit(true);
    setEditError('');
    try {
      if (typeof previewTemplate.id === 'string' && previewTemplate.id.startsWith('demo')) {
        const updated = {
          ...previewTemplate,
          name: editName.trim(),
          category: editCategory.trim() || 'General',
          description: editDescription.trim(),
          extracted_text: editText
        };
        setPreviewTemplate(updated);
        setIsEditing(false);
        setSavingEdit(false);
        return;
      }

      const { error: err } = await supabase
        .from('templates')
        .update({
          name: editName.trim(),
          category: editCategory.trim() || null,
          description: editDescription.trim() || null,
          extracted_text: editText || null
        })
        .eq('id', previewTemplate.id);

      if (err) {
        setEditError('Düzenleme kaydedilemedi: ' + err.message);
        return;
      }

      const updated = {
        ...previewTemplate,
        name: editName.trim(),
        category: editCategory.trim() || null,
        description: editDescription.trim() || null,
        extracted_text: editText || null
      };

      setTemplates(prev => prev.map(x => x.id === previewTemplate.id ? updated : x));
      setPreviewTemplate(updated);
      setIsEditing(false);
    } catch {
      setEditError('Kaydetme sırasında bir hata oluştu.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Dynamic categories extracted strictly from uploaded user templates
  const dynamicCategories = Array.from(
    new Set(
      templates
        .map(t => (t.category || '').trim())
        .filter(Boolean)
    )
  );

  const categories = [
    { id: 'All', label: 'Tüm Şablonlar' },
    ...dynamicCategories.map(cat => ({ id: cat, label: cat }))
  ];

  const PRESET_SUGGESTIONS = [
    'Dilekçeler',
    'Sözleşmeler',
    'Vekaletnameler',
    'İhtarnameler',
    'Duruşma / Tutanak',
    'Diğer'
  ];

  const isCategoryMatch = (templateCategory: string | undefined | null, selectedCategory: string) => {
    if (selectedCategory === 'All') return true;
    if (!templateCategory || !templateCategory.trim()) return selectedCategory === 'Diğer';
    return templateCategory.toLowerCase().trim() === selectedCategory.toLowerCase().trim();
  };

  const displayTemplates = templates.filter(t => {
    const matchesCat = isCategoryMatch(t.category, activeCategory);
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });


  return (
    <div className="flex-1 flex flex-col gap-6 p-3 bg-[var(--color-bg-base)] text-[var(--color-text)] cyber-juris font-sans overflow-y-auto min-h-full">
      
      {/* Top Header & Search Tools */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-1">
        <div>
          <h1 className="text-[34px] font-extrabold text-[var(--color-text)] tracking-tight leading-none mb-2">
            Belge Şablonları Kütüphanesi
          </h1>
          <p className="text-[14px] text-[var(--color-text-muted)] font-medium tracking-wide">
            Büronuzun dilekçe, sözleşme ve standart belge metinlerini görüntüleyin, açın ve düzenleyin.
          </p>
        </div>

        {/* Search Input & New Template Button */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3 py-2 shadow-sm w-full md:w-72 transition-all">
            <svg className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Şablonlarda ara..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[var(--color-text)] font-mono text-[13px] w-full placeholder-[#94A3B8]"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="border border-[#3B82F6]/60 bg-[#3B82F6]/10 hover:bg-[#3B82F6] text-[#3B82F6] hover:text-white px-4 py-2.5 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all shadow-sm hover:shadow-[#3B82F6]/20 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Şablon Yükle
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto cyber-juris-scroll pb-1">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full font-mono text-[12px] transition-all cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-[#3B82F6] text-white font-bold shadow-md shadow-[#3B82F6]/25' 
                  : 'bg-[var(--color-surface)] border border-[var(--color-divider)] hover:border-[#3B82F6]/50 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-[var(--color-text-muted)] font-mono text-[13px] animate-pulse">
          Şablonlar yükleniyor...
        </div>
      ) : templates.length === 0 ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-[var(--color-surface)] border border-dashed border-[var(--color-divider)] rounded-3xl p-8 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] text-2xl">
            📄
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-[var(--color-text)] mb-1">Henüz Şablon Eklenmedi</h3>
            <p className="text-[13px] text-[var(--color-text-muted)] max-w-md">
              Büronuzun sık kullandığı dilekçe, sözleşme, ihtarname ve vekaletname belgelerini yükleyerek şablon kütüphanenizi oluşturun.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-mono text-[12px] font-bold transition-all shadow-md shadow-[#3B82F6]/20 flex items-center gap-2 cursor-pointer mt-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Şablon Yükle
          </button>
        </div>
      ) : displayTemplates.length === 0 ? (
        <div className="py-20 text-center text-[var(--color-text-muted)] font-mono text-[13px] bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-8">
          Aramanıza veya seçili kategoriye uygun şablon bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayTemplates.map((t: TemplateRow) => {
            const rawTag = t.category ? t.category.toUpperCase() : 'ŞABLON';
            const categoryTag = rawTag || 'ŞABLON';
            const editedTime = formatRelativeTr(t.created_at || new Date().toISOString());
            
            // Icon styling based on category
            let iconBg = 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]';
            let tagColor = 'text-[#3B82F6]';

            if (categoryTag.includes('CONTRACT') || categoryTag.includes('SÖZLEŞME')) {
              iconBg = 'bg-[#00E699]/10 border-[#00E699]/30 text-[#00E699]';
              tagColor = 'text-[#00E699]';
            } else if (categoryTag.includes('NOTICE') || categoryTag.includes('İHTAR')) {
              iconBg = 'bg-[#A78BFA]/10 border-[#A78BFA]/30 text-[#A78BFA]';
              tagColor = 'text-[#A78BFA]';
            }

            return (
              <div 
                key={t.id}
                onClick={() => handleOpenPreview(t)}
                className="relative group p-6 rounded-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden bg-[var(--color-surface)] border border-[var(--color-divider)] hover:border-[#3B82F6]/60 shadow-sm hover:shadow-md"
              >
                {/* Top highlight line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent"></div>

                <div>
                  {/* Category Tag & Explicit Action Buttons */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${iconBg}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className={`text-[11px] font-mono font-bold tracking-widest uppercase ${tagColor}`}>
                        {categoryTag}
                      </span>
                    </div>

                    {/* Separate Action Buttons: Download, Edit, Delete */}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(t);
                        }}
                        className="text-[var(--color-text-muted)] hover:text-[#60A5FA] p-1.5 rounded-lg hover:bg-[#3B82F6]/10 transition-colors"
                        title="Dosyayı İndir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(t);
                          setIsEditing(true);
                        }}
                        className="text-[var(--color-text-muted)] hover:text-[#FBBF24] p-1.5 rounded-lg hover:bg-[#F59E0B]/10 transition-colors"
                        title="Metni ve Şablonu Düzenle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button 
                        onClick={(e) => handleDelete(t, e)}
                        className="text-[var(--color-text-muted)] hover:text-[#FB7185] p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Şablonu Sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-[16px] font-bold text-[var(--color-text)] group-hover:text-[#3B82F6] transition-colors leading-snug mb-3">
                    {t.name}
                  </h3>

                  {t.description && (
                    <p className="text-[12.5px] text-[var(--color-text-muted)] line-clamp-2 mb-4 font-sans">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-4 border-t border-[var(--color-divider)] flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
                  <span>{t.file_size ? `${Math.round(t.file_size / 1024)} KB` : 'Belge'}</span>
                  <span>{editedTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Preview & Interactive Text Editor Modal */}
      {previewTemplate && (
        <div 
          className="fixed inset-0 bg-[#0B0F19]/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 w-full max-w-3xl shadow-2xl flex flex-col gap-5 relative overflow-hidden max-h-[90vh]"
          >
            {/* Top Glowing Bar */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] text-lg">
                  📄
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[var(--color-text)] tracking-tight flex items-center gap-2">
                    {isEditing ? 'Şablon ve Metin Düzenleyici' : previewTemplate.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-2 py-0.5 rounded uppercase font-bold">
                      {previewTemplate.category || 'ŞABLON'}
                    </span>
                    {previewTemplate.file_size && (
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        · {Math.round(previewTemplate.file_size / 1024)} KB
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && editText && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(editText);
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    }}
                    className="bg-[var(--color-bg-base)] hover:bg-[var(--color-divider)] text-[var(--color-text)] border border-[var(--color-divider)] px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedText ? '✓ Kopyalandı' : '📋 Metni Kopyala'}
                  </button>
                )}
                <button 
                  onClick={() => setPreviewTemplate(null)} 
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[18px] cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {editError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-[12px] shrink-0">
                {editError}
              </div>
            )}

            {/* Modal Body / Text Content Editor */}
            <div className="flex-1 overflow-y-auto cyber-juris-scroll flex flex-col gap-4 pr-1">
              {isEditing ? (
                /* EDIT MODE FORM */
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Şablon Adı / Belge İsmi</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text)] outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Kategori Seçimi</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {PRESET_SUGGESTIONS.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEditCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                              editCategory === cat
                                ? 'bg-[#3B82F6] text-white border-[#3B82F6] font-bold shadow-sm'
                                : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[#3B82F6]/50 hover:text-[var(--color-text)]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={PRESET_SUGGESTIONS.includes(editCategory) ? editCategory : 'custom'}
                          onChange={e => {
                            if (e.target.value !== 'custom') {
                              setEditCategory(e.target.value);
                            }
                          }}
                          className="bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-3 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors cursor-pointer"
                        >
                          <option value="" disabled>Kategori Seçin...</option>
                          {PRESET_SUGGESTIONS.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="custom">Özel Kategori...</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="veya Özel Kategori yazın..."
                          value={editCategory} 
                          onChange={e => setEditCategory(e.target.value)} 
                          className="flex-1 bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-3.5 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Şablon Açıklaması & Notlar</label>
                    <input 
                      type="text"
                      placeholder="Şablon hakkında kısa bilgi..."
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)} 
                      className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-4 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors"
                    />
                  </div>

                  {/* Document Text Content Editor Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Şablon Metin İçeriği (Dilekçe / Sözleşme Metni)</span>
                      </label>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Metni doğrudan buradan düzenleyebilirsiniz</span>
                    </div>
                    <textarea 
                      placeholder="Şablonunuzun standart dilekçe, sözleşme veya ihtarname metnini buraya yazın..."
                      value={editText} 
                      onChange={e => setEditText(e.target.value)} 
                      className="w-full bg-[var(--color-bg-base)] border border-[#3B82F6]/40 focus:border-[#3B82F6] rounded-xl p-4 text-[13px] font-mono text-[var(--color-text)] outline-none transition-colors resize-y h-64 leading-relaxed cyber-juris-scroll"
                    />
                  </div>
                </div>
              ) : (
                /* VIEW MODE DETAILS & FULL TEXT PREVIEW */
                <div className="flex flex-col gap-4">
                  {previewTemplate.description && (
                    <div className="bg-[var(--color-bg-base)] border border-[var(--color-divider)] rounded-xl p-3.5 text-[13px] text-[var(--color-text)] font-sans">
                      <strong className="text-[#3B82F6] font-mono">Açıklama:</strong> {previewTemplate.description}
                    </div>
                  )}

                  {/* Document Text Body Viewer Box */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider font-bold">
                      <span className="flex items-center gap-1.5 text-[#3B82F6]">
                        <span>📝</span>
                        <span>Şablon Metin İçeriği</span>
                      </span>
                      <span>{editText ? `${editText.length} Karakter` : 'Metin Yok'}</span>
                    </div>

                    <div className="bg-[var(--color-bg-base)] border border-[var(--color-divider)] rounded-xl p-4 font-mono text-[13px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto cyber-juris-scroll">
                      {editText ? (
                        editText
                      ) : (
                        <span className="text-[var(--color-text-muted)] italic">
                          Bu şablon için metin içeriği bulunamadı. &quot;✏️ Düzenle&quot; butonuna basarak şablon metnini ekleyebilirsiniz.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="flex items-center justify-between border-t border-[var(--color-divider)] pt-4 shrink-0">
              {isEditing ? (
                <div className="flex items-center gap-2 ml-auto">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-glow)] text-[12px] font-mono cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editName.trim()}
                    className="bg-[#00E699] hover:bg-[#00C885] text-[#052E23] px-5 py-2 rounded-xl font-bold text-[12px] font-mono shadow-lg shadow-[#00E699]/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingEdit ? 'Kaydediliyor...' : '💾 Metni ve Değişiklikleri Kaydet'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-[#151C2C] border border-[#F59E0B]/40 hover:bg-[#F59E0B]/20 text-[#FBBF24] px-4 py-2 rounded-xl font-mono text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      ✏️ Metni & Şablonu Düzenle
                    </button>
                    <button 
                      onClick={(e) => {
                        handleDelete(previewTemplate, e);
                        setPreviewTemplate(null);
                      }}
                      className="bg-[#151C2C] border border-[#EF4444]/40 hover:bg-[#EF4444]/20 text-[#FCA5A5] px-3.5 py-2 rounded-xl font-mono text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      🗑️ Sil
                    </button>
                  </div>

                  <button 
                    onClick={() => handleDownload(previewTemplate)}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2 rounded-xl font-bold text-[12px] font-mono shadow-lg shadow-[#3B82F6]/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    📥 Dosyayı İndir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Template Upload Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-[#151C2C] border border-[#26334D] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent"></div>

            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <h2 className="text-[18px] font-bold text-white tracking-tight">Yeni Şablon Yükle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#64748B] hover:text-white text-[18px]">✕</button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-[12px]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-mono text-[#8C9BB4] uppercase tracking-wider block mb-1.5">Şablon Adı</label>
                <input 
                  type="text" 
                  placeholder="Örn: Standart Dava Dilekçesi" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                  className="w-full bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#8C9BB4] uppercase tracking-wider block mb-1.5">
                  Kategori Seçimi
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_SUGGESTIONS.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                        formCategory === cat
                          ? 'bg-[#3B82F6] text-white border-[#3B82F6] font-bold shadow-sm'
                          : 'bg-[#0C1324] text-[#8C9BB4] border-[#1E293B] hover:border-[#3B82F6]/50 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={PRESET_SUGGESTIONS.includes(formCategory) ? formCategory : 'custom'}
                    onChange={e => {
                      if (e.target.value !== 'custom') {
                        setFormCategory(e.target.value);
                      }
                    }}
                    className="bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-3 py-2 text-[13px] text-white outline-none transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Kategori Seçin...</option>
                    {PRESET_SUGGESTIONS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">Özel Kategori...</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="veya Özel Kategori..." 
                    value={formCategory} 
                    onChange={e => setFormCategory(e.target.value)} 
                    className="flex-1 bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-3.5 py-2 text-[13px] text-white outline-none transition-colors placeholder-[#64748B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#8C9BB4] uppercase tracking-wider block mb-1.5">Açıklama</label>
                <textarea 
                  placeholder="Şablon hakkında kısa açıklama..." 
                  value={formDescription} 
                  onChange={e => setFormDescription(e.target.value)} 
                  className="w-full bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[13px] text-white outline-none transition-colors resize-none h-20"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#8C9BB4] uppercase tracking-wider block mb-1.5">Şablon Dosyası (.docx, .pdf, .udf)</label>
                <input 
                  type="file" 
                  onChange={e => setFormFile(e.target.files?.[0] || null)} 
                  className="w-full bg-[#0C1324] border border-[#1E293B] rounded-xl p-2 text-[12px] text-[#CBD5E1] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-mono file:bg-[#3B82F6]/20 file:text-[#60A5FA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#1E293B] text-[#94A3B8] hover:text-white text-[13px] font-semibold transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleUpload}
                disabled={uploading || !formName.trim() || !formFile}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-lg shadow-[#3B82F6]/25 transition-all disabled:opacity-50"
              >
                {uploading ? 'Yükleniyor...' : 'Şablon Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}