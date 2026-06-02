'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Pencil } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
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

function formatJoined(iso: string | undefined, isBn: boolean) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/**
 * Editable account/profile card backed by the generic user endpoints
 * (`GET /user/me`, `PUT /user/profile`, `POST /user/avatar`). Reused by the citizen
 * `/profile` page (inside the console shell) and the `/settings` page.
 */
export function AccountProfile() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const { user, updateUser } = useAuth();
  const meQ = useQuery<UserProfile>(() => api.get('/user/me'), []);

  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [lang, setLang] = React.useState<Language>('en');
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const { uploading, openPicker, inputRef, onChange } = useAvatarUpload(setAvatar);

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

  const initials = (name || user?.email || 'U').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
  const joined = formatJoined(meQ.data?.created_at, isBn);

  if (meQ.loading && !meQ.data) {
    return <Skeleton className="h-[28rem] w-full rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('settings.profile')}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar with edit pencil */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-20 ring-1 ring-border">
              {avatar && <AvatarImage src={avatar} alt="" />}
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChange} />
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              aria-label={t('settings.avatar')}
              className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border border-border bg-background text-foreground shadow-soft transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-3.5" />}
            </button>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{name || (user?.email?.split('@')[0] ?? '')}</p>
            <p className="truncate text-sm text-muted-foreground">{meQ.data?.email ?? user?.email}</p>
            {joined && <p className="mt-0.5 text-xs text-muted-foreground">{t('profile.memberSince')} {joined}</p>}
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
          <Label htmlFor="ap-name">{t('settings.name')}</Label>
          <Input id="ap-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-addr">{t('settings.address')}</Label>
          <Textarea id="ap-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-20" />
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
  );
}
