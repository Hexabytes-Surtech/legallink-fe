'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, Language } from '@/types';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const meQ = useQuery<UserProfile>(() => api.get('/user/me'), []);

  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [lang, setLang] = React.useState<Language>('en');
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (meQ.data) {
      setName(meQ.data.name ?? '');
      setAddress(meQ.data.address ?? '');
      setLang(meQ.data.preferred_language ?? 'en');
      setAvatar(meQ.data.avatar_url ?? null);
    }
  }, [meQ.data]);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.put<UserProfile>('/user/profile', {
        name: name.trim() || undefined,
        address: address.trim() || undefined,
        preferred_language: lang,
      });
      updateUser({ name: updated.name ?? undefined });
      toast.success(t('settings.saved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload<{ avatar_url: string }>('/user/avatar', fd);
      setAvatar(res.avatar_url);
      updateUser({ avatar_url: res.avatar_url });
      toast.success(t('settings.uploaded'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const initials = (name || user?.email || 'U').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('settings.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('settings.subtitle')}</p>

      {meQ.loading && !meQ.data ? (
        <Skeleton className="mt-8 h-96 w-full rounded-xl" />
      ) : (
        <Card className="mt-8">
          <CardHeader><CardTitle>{t('settings.profile')}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16 ring-1 ring-border">
                {avatar && <AvatarImage src={avatar} alt="" />}
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onAvatarPick} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <><Loader2 className="size-4 animate-spin" />…</> : <><Upload className="size-4" /> {t('settings.avatar')}</>}
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">{t('settings.avatarHint')}</p>
              </div>
            </div>

            {/* Read-only account */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('settings.email')}</Label>
                <Input value={meQ.data?.email ?? user?.email ?? ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.role')}</Label>
                <div className="flex h-11 items-center"><Badge variant="gold" className="capitalize">{meQ.data?.role ?? user?.role}</Badge></div>
              </div>
            </div>

            {/* Editable */}
            <div className="space-y-1.5">
              <Label htmlFor="s-name">{t('settings.name')}</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-addr">{t('settings.address')}</Label>
              <Textarea id="s-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-20" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings.language')}</Label>
              <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">বাংলা</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button size="lg" disabled={saving} onClick={save}>
              {saving ? <><Loader2 className="size-4 animate-spin" />…</> : <><Save className="size-4" /> {t('shared.save')}</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
