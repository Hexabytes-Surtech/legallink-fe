'use client';

import * as React from 'react';
import { Send, ShieldAlert, Lock, Loader2, Clock, Paperclip, MoreVertical, XCircle, Star, Flag, Phone, Video, PanelRightOpen, PanelRightClose, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useChatSocket } from '@/hooks';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { VoiceRecorderBar } from '@/components/features/voice-recorder-bar';
import { useAuth } from '@/contexts/AuthContext';
import { useCall } from '@/contexts/CallContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AvatarFallback } from '@/components/ui/avatar';
import { ViewableAvatar } from '@/components/shared/viewable-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatAttachment } from '@/components/features/chat-attachment';
import { FeedbackDialog } from '@/components/features/feedback-dialog';
import { ReportDialog } from '@/components/features/report-dialog';
import { ChatSidePanel } from '@/components/features/chat-side-panel';
import { cn } from '@/lib/utils';
import type { ConsultationListItem, AdvocateConsultation } from '@/types';

const MAX_ATTACH_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT_ATTACH = 'image/jpeg,image/png,image/webp,application/pdf';

function initials(name: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}
// One Bengali codepoint flips the dictation language (matches the AI chat detector).
function detectLanguage(text: string): 'en' | 'bn' {
  return /[ঀ-৿]/.test(text) ? 'bn' : 'en';
}
function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
function timeIst(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}
function dayLabel(iso: string, isBn: boolean) {
  return new Date(iso).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short' });
}

/** The live chat thread for one consultation. Fills its parent's height (`h-full`). */
export function ChatRoom({ consultationId }: { consultationId: string }) {
  const { user, accessToken } = useAuth();
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const selfType: 'citizen' | 'advocate' = user?.role === 'advocate' ? 'advocate' : 'citizen';
  const isAdvocate = selfType === 'advocate';

  // Peer name + status from the role-appropriate consultation list.
  const citizenQ = useQuery<ConsultationListItem[]>(() => api.get('/consultations'), [], { enabled: !!user && !isAdvocate });
  const advocateQ = useQuery<AdvocateConsultation[]>(() => api.get('/advocate/consultations'), [], { enabled: isAdvocate });

  const meta = React.useMemo(() => {
    if (isAdvocate) {
      const c = (advocateQ.data ?? []).find((x) => x.id === consultationId);
      return c ? { name: c.citizen_name || 'Citizen', status: c.status, hasFeedback: false, reported: !!c.reported, avatarUrl: c.citizen_avatar_url ?? null, matterId: c.matter_id ?? null } : null;
    }
    const c = (citizenQ.data ?? []).find((x) => x.consultationId === consultationId);
    return c ? { name: c.advocateName || 'Advocate', status: c.status, hasFeedback: !!c.hasFeedback, reported: false, avatarUrl: c.advocateAvatarUrl ?? null, matterId: c.matter_id ?? null } : null;
  }, [isAdvocate, advocateQ.data, citizenQ.data, consultationId]);

  const chat = useChatSocket(consultationId, accessToken, { id: user?.userId, type: selfType });
  const call = useCall();
  const closed = chat.closed || meta?.status === 'closed';
  const canCall = meta?.status === 'accepted' && !closed;

  // Files shared inside the chat thread (paperclip uploads), normalised for the
  // Matter tab's consolidated file list. The chat already holds every message, so this
  // needs no extra fetch. attachmentType 'image'|'pdf' → a mime-ish string the viewer
  // understands.
  const chatAttachments = React.useMemo(
    () =>
      chat.messages
        .filter((m) => m.attachmentUrl && !m.deleted)
        .map((m, i) => ({
          id: m.messageId,
          url: m.attachmentUrl as string,
          fileType: m.attachmentType === 'image' ? 'image/*' : 'application/pdf',
          name: m.attachmentName ?? `${t('chat.panel.document')} ${i + 1}`,
        })),
    [chat.messages, t],
  );

  // Case-timeline panel: inline side panel on desktop, slide-over drawer on mobile.
  // Collapsed by default so it never crowds the chat; the header arrow toggles it.
  const showTimeline = meta?.status === 'accepted' || meta?.status === 'closed';
  const [timelineDesktopOpen, setTimelineDesktopOpen] = React.useState(false);
  const [timelineSheetOpen, setTimelineSheetOpen] = React.useState(false);
  function toggleTimeline() {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setTimelineDesktopOpen((o) => !o);
    } else {
      setTimelineSheetOpen(true);
    }
  }

  const [draft, setDraft] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Voice typing (record → Gemini transcription) ──────────────────────────
  // Same mechanism as the AI chat: records the whole clip locally then sends it
  // once to Gemini (FE key), so nothing is lost to network lag. The recogniser
  // language follows what's typed, else the UI language.
  const voiceLang: 'en' | 'bn' = detectLanguage(draft) === 'bn' || isBn ? 'bn' : 'en';
  const {
    supported: micSupported,
    status: voiceStatus,
    seconds: voiceSeconds,
    stream: voiceStream,
    start: startDictation,
    stop: stopDictation,
    cancel: cancelDictation,
  } = useVoiceTranscription({
    lang: voiceLang,
    onResult: (text) => {
      // Append the transcribed words onto whatever was already typed.
      setDraft((prev) => prev + (prev && !/\s$/.test(prev) ? ' ' : '') + text);
    },
    onError: (kind) => {
      toast.error(
        kind === 'not-allowed' ? t('ai.voice.denied')
          : kind === 'insecure' ? t('ai.voice.insecure')
            : kind === 'no-mic' ? t('ai.voice.nomic')
              : kind === 'no-key' ? t('ai.voice.nokey')
                : kind === 'network' ? t('ai.voice.network')
                  : kind === 'rejected' ? t('ai.voice.rejected')
                    : kind === 'empty' ? t('ai.voice.empty')
                      : t('ai.voice.error'),
      );
    },
  });
  const voiceActive = voiceStatus !== 'idle';

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages, chat.peerTyping]);

  function onDraftChange(v: string) {
    setDraft(v);
    chat.setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => chat.setTyping(false), 1200);
  }
  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    cancelDictation(); // discard any in-progress recording
    if (!draft.trim() || closed) return;
    chat.send(draft);
    setDraft('');
    chat.setTyping(false);
  }

  // ── Attachments — citizen only ────────────────────────────────────────────
  const isCitizen = !isAdvocate;
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function onAttachChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!ACCEPT_ATTACH.split(',').includes(file.type)) { toast.error(t('chat.attachment.badType')); return; }
    if (file.size > MAX_ATTACH_BYTES) { toast.error(t('chat.attachment.tooLarge')); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // The server stores it and broadcasts the new message over WS — it lands via the socket.
      await api.upload(`/consultations/${consultationId}/attachments`, fd);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(messageId: string) {
    setDeletingId(messageId);
    try {
      await api.del(`/consultations/${consultationId}/attachments/${messageId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setDeletingId(null);
    }
  }

  // ── End consultation — either participant; both get notified, room read-only ──
  const refetchMeta = isAdvocate ? advocateQ.refetch : citizenQ.refetch;
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const [ending, setEnding] = React.useState(false);
  // Only the citizen may end a consultation. The advocate's recourse is to report.
  const canEnd = isCitizen && meta?.status === 'accepted' && !closed;

  async function endChat() {
    setEnding(true);
    try {
      await api.put(`/consultations/${consultationId}/close`);
      // The server broadcasts 'consultation_closed' → both rooms go read-only.
      refetchMeta();
      setConfirmEnd(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setEnding(false);
    }
  }

  const statusPill = {
    connecting: { label: t('chat.status.connecting'), cls: 'bg-warning/15 text-warning' },
    connected: { label: t('chat.status.connected'), cls: 'bg-success/15 text-success' },
    disconnected: { label: t('chat.status.disconnected'), cls: 'bg-muted text-muted-foreground' },
    error: { label: t('shared.error'), cls: 'bg-destructive/15 text-destructive' },
  }[chat.status];

  return (
    <div className="flex h-full">
      {/* Chat column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <ViewableAvatar
          src={meta?.avatarUrl}
          name={meta?.name ?? ''}
          className="size-10 ring-1 ring-border"
          fallback={<AvatarFallback>{initials(meta?.name ?? '')}</AvatarFallback>}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{meta?.name ?? t('chat.title')}</p>
          <span className="flex items-center gap-1.5 text-xs">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', statusPill.cls)}>
              <span className="size-1.5 rounded-full bg-current" /> {statusPill.label}
            </span>
            {closed && <Badge variant="muted"><Lock className="size-3" /> {t('matters.consult.closed')}</Badge>}
          </span>
        </div>
        {showTimeline && (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={toggleTimeline}
            aria-label={t('chat.panel.title')}
            title={t('chat.panel.title')}
          >
            {timelineDesktopOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </Button>
        )}
        {canCall && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Voice call"
              disabled={!call.canCall || call.phase !== 'idle'}
              onClick={() => call.startCall(consultationId, meta?.name ?? 'User', 'voice', meta?.avatarUrl)}
            >
              <Phone className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Video call"
              disabled={!call.canCall || call.phase !== 'idle'}
              onClick={() => call.startCall(consultationId, meta?.name ?? 'User', 'video', meta?.avatarUrl)}
            >
              <Video className="size-4" />
            </Button>
          </div>
        )}
        {canEnd && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={t('chat.menu')}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmEnd(true)}>
                <XCircle /> {t('chat.end')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="bg-dots flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {!chat.historyLoaded ? (
          <ChatSkeleton />
        ) : chat.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('chat.empty')}</p>
          </div>
        ) : (
          chat.messages.map((m, i) => {
            const mine = m.senderType === selfType;
            const showDay = i === 0 || dayKey(m.timestamp) !== dayKey(chat.messages[i - 1].timestamp);
            const flagged = m.moderationStatus === 'flagged';
            const isAttachment = !!m.attachmentType || !!m.deleted;
            return (
              <React.Fragment key={m.messageId}>
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">{dayLabel(m.timestamp, isBn)}</span>
                  </div>
                )}
                {isAttachment ? (
                  <ChatAttachment
                    msg={m}
                    mine={mine}
                    canDelete={mine && isCitizen}
                    protect={isAdvocate}
                    deleting={deletingId === m.messageId}
                    onDelete={() => handleDelete(m.messageId)}
                  />
                ) : (
                  <>
                    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-soft',
                        mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-card text-card-foreground',
                        flagged && 'opacity-70 ring-1 ring-warning/50',
                      )}>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <span className={cn('mt-1 flex items-center gap-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          {m.optimistic && !flagged && <Clock className="size-3" />}
                          {flagged ? <><ShieldAlert className="size-3" /> {t('chat.moderation')}</> : timeIst(m.timestamp)}
                        </span>
                      </div>
                    </div>
                    {flagged && mine && (
                      <p className="flex justify-end pr-1 text-[11px] text-warning">{t('chat.flaggedNotice')}</p>
                    )}
                  </>
                )}
              </React.Fragment>
            );
          })
        )}
        {chat.peerTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-card px-3 py-2.5 shadow-soft">
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5 animate-pulse-glow rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-4 py-3">
        {closed ? (
          <div className="space-y-2">
            <p className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" />
              {chat.closedBy ? `${t('chat.endedBy')} ${chat.closedBy.byName}` : t('chat.closedNotice')}
            </p>
            {isCitizen && (meta?.hasFeedback ? (
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Star className="size-4 fill-gold text-gold" /> {t('chat.feedbackThanks')}
              </p>
            ) : (
              <FeedbackDialog
                consultationId={consultationId}
                onDone={refetchMeta}
                trigger={<Button className="w-full"><Star className="size-4" /> {t('chat.rate')}</Button>}
              />
            ))}
            {isAdvocate && (meta?.reported ? (
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Flag className="size-4 text-destructive" /> {t('chat.reported')}
              </p>
            ) : (
              <ReportDialog
                consultationId={consultationId}
                onDone={refetchMeta}
                trigger={
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                    <Flag className="size-4" /> {t('chat.report')}
                  </Button>
                }
              />
            ))}
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="flex items-end gap-2">
              {voiceActive ? (
                <VoiceRecorderBar
                  status={voiceStatus}
                  seconds={voiceSeconds}
                  stream={voiceStream}
                  onCancel={cancelDictation}
                  onStop={stopDictation}
                />
              ) : (
                <>
                  {isCitizen && (
                    <>
                      <input ref={fileRef} type="file" accept={ACCEPT_ATTACH} hidden onChange={onAttachChange} />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-11 shrink-0"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading || chat.status !== 'connected'}
                        aria-label={t('chat.attachment.add')}
                      >
                        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                      </Button>
                    </>
                  )}
                  <textarea
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                    rows={1}
                    placeholder={t('chat.placeholder')}
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  {micSupported && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-11 shrink-0"
                      onClick={startDictation}
                      disabled={chat.status !== 'connected'}
                      aria-label={t('ai.voice.start')}
                      title={t('ai.voice.start')}
                    >
                      <Mic className="size-4" />
                    </Button>
                  )}
                  <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!draft.trim() || chat.status !== 'connected'}>
                    {chat.status === 'connecting' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </>
              )}
            </form>
            <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
              <ShieldAlert className="size-3" /> {t('chat.safetyNote')}
            </p>
          </>
        )}
      </div>

      {/* End-consultation confirmation */}
      <Dialog open={confirmEnd} onOpenChange={(o) => { if (!ending) setConfirmEnd(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('chat.endConfirm.title')}</DialogTitle>
            <DialogDescription>{t('chat.endConfirm.body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)} disabled={ending}>{t('shared.cancel')}</Button>
            <Button variant="destructive" onClick={endChat} disabled={ending}>
              {ending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} {t('chat.end')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {/* Case timeline — desktop side panel (arrow collapses it to reclaim chat width) */}
      {showTimeline && (
        <aside
          className={cn(
            'hidden h-full shrink-0 flex-col overflow-hidden border-l border-border transition-[width] duration-300 ease-in-out lg:flex',
            timelineDesktopOpen ? 'w-[26rem] xl:w-[32rem] 2xl:w-[36rem]' : 'w-0',
          )}
          aria-hidden={!timelineDesktopOpen}
        >
          <div className="h-full w-[26rem] overflow-y-auto p-4 xl:w-[32rem] 2xl:w-[36rem]">
            <ChatSidePanel
              consultationId={consultationId}
              isAdvocate={isAdvocate}
              matterId={meta?.matterId}
              chatAttachments={chatAttachments}
              timelineVersion={chat.timelineVersion}
              open={timelineDesktopOpen}
            />
          </div>
        </aside>
      )}

      {/* Case timeline — mobile slide-over drawer */}
      {showTimeline && (
        <Sheet open={timelineSheetOpen} onOpenChange={setTimelineSheetOpen}>
          <SheetContent side="right" className="w-[92%] max-w-lg gap-0 overflow-y-auto p-4 lg:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('chat.panel.title')}</SheetTitle>
            </SheetHeader>
            <ChatSidePanel
              consultationId={consultationId}
              isAdvocate={isAdvocate}
              matterId={meta?.matterId}
              chatAttachments={chatAttachments}
              timelineVersion={chat.timelineVersion}
              open
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/** Loading placeholder for the chat thread (covers Neon cold-start latency). */
function ChatSkeleton() {
  // alternating incoming/outgoing bubble rows
  const rows = [
    { mine: false, w: 'w-44' }, { mine: false, w: 'w-32' },
    { mine: true, w: 'w-52' }, { mine: false, w: 'w-40' },
    { mine: true, w: 'w-36' }, { mine: false, w: 'w-48' },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className={cn('flex', r.mine ? 'justify-end' : 'justify-start')}>
          <Skeleton className={cn('h-9 rounded-2xl', r.w, r.mine ? 'rounded-br-sm' : 'rounded-bl-sm')} />
        </div>
      ))}
    </div>
  );
}
