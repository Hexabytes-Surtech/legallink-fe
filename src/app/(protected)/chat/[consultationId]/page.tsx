'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay, MOCK_MESSAGES } from '@/data/mock';
import type {
  Message,
  WsMessage,
  Classification,
  AdvocateConsultation,
  BackendConsultationResponse,
  BackendMatterResponse,
} from '@/types';
import type { TranslationKey } from '@/i18n/config';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

interface MatterBrief {
  queryText: string;
  queryLanguage: 'en' | 'bn';
  classification: Classification | null;
  responseEnglish: string | null;
  responseBengali: string | null;
  citations: { source?: string; section?: string; title: string; citation?: string }[];
  matterId?: string;
}

function wsToLocalMessage(ws: WsMessage, consultationId: string): Message {
  return {
    id: ws.messageId,
    consultationId,
    senderType: ws.senderType,
    senderId: ws.senderId,
    content: ws.text,
    moderationStatus: ws.moderationStatus === 'cleared' ? 'approved' : ws.moderationStatus,
    createdAt: ws.timestamp,
  };
}

function formatLocation(loc: Classification['location']): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return [loc.district, loc.state].filter(Boolean).join(', ');
}

export default function ChatPage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const { t, language } = useLanguage();
  const { user, accessToken, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'pending'>('pending');
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState('');
  const [brief, setBrief] = useState<MatterBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/signup?returnTo=/chat/${consultationId}`);
    }
  }, [isLoading, isAuthenticated, router, consultationId]);

  // Load matter brief for the context sidebar.
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let cancelled = false;

    async function loadBrief() {
      setBriefLoading(true);
      try {
        if (USE_MOCK) {
          await mockDelay(400);
          if (cancelled) return;
          setBrief({
            queryText: 'My landlord is withholding my security deposit and changed the lock without notice.',
            queryLanguage: 'en',
            classification: {
              matterType: 'Tenancy & Housing',
              statute: 'West Bengal Premises Tenancy Act, 1997',
              userQuestion: 'Can a landlord lock out a tenant without a court order?',
              involvesPolice: false,
              location: { state: 'West Bengal', district: 'Kolkata' },
            },
            responseEnglish:
              'Under the West Bengal Premises Tenancy Act, 1997, a landlord may not evict a tenant without due process. Self-help eviction (lockout without court order) is unlawful.',
            responseBengali: null,
            citations: [
              { title: 'WB Premises Tenancy Act, 1997', section: 'Sec. 6', citation: 'WBPTA §6' },
            ],
          });
          return;
        }

        if (user?.role === 'advocate') {
          const res = await apiClient<AdvocateConsultation[]>('/advocate/consultations');
          const list = Array.isArray(res.data) ? res.data : [];
          const c = list.find(x => x.id === consultationId);
          if (!c || cancelled) return;
          setBrief({
            queryText: c.query_text,
            queryLanguage: c.query_language,
            classification: c.classification ?? null,
            responseEnglish: c.ai_response_english ?? null,
            responseBengali: c.ai_response_bengali ?? null,
            citations: (c.citations ?? []).map(ct => ({
              title: ct.title,
              section: ct.section,
            })),
            matterId: c.matter_id,
          });
        } else {
          const consRes = await apiClient<BackendConsultationResponse>(`/consultations/${consultationId}`);
          const matterId = consRes.data?.matterId;
          if (!matterId || cancelled) return;
          const matterRes = await apiClient<BackendMatterResponse>(`/matter/${matterId}`);
          const m = matterRes.data;
          if (!m || cancelled) return;
          setBrief({
            queryText: m.query,
            queryLanguage: m.language,
            classification: m.aiResponse?.classification ?? null,
            responseEnglish: m.aiResponse?.responseEnglish ?? null,
            responseBengali: m.aiResponse?.responseBengali ?? null,
            citations: (m.aiResponse?.citations ?? []).map(ct => ({
              source: ct.source,
              section: ct.section,
              title: ct.title,
              citation: ct.citation,
            })),
            matterId,
          });
        }
      } catch {
        /* silent — sidebar is enhancement, not blocking */
      } finally {
        if (!cancelled) setBriefLoading(false);
      }
    }

    loadBrief();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, consultationId]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    if (USE_MOCK) {
      mockDelay(600).then(() => {
        setMessages(MOCK_MESSAGES as unknown as Message[]);
        setWsStatus('connected');
      });
      return;
    }

    let socketInstance: typeof socketRef.current = null;

    async function connectSocket() {
      setWsStatus('connecting');
      try {
        const { io } = await import('socket.io-client');
        socketInstance = io(`${WS_URL}/ws`, {
          query: { token: accessToken, consultationId },
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 3000,
          reconnectionAttempts: 5,
        });

        socketInstance.on('connect', () => {
          setWsStatus('connected');
          setError('');
        });

        socketInstance.on('disconnect', () => {
          setWsStatus('disconnected');
        });

        socketInstance.on('connect_error', () => {
          setWsStatus('disconnected');
        });

        socketInstance.on('history', (historyMsgs: WsMessage[]) => {
          setMessages(historyMsgs.map(m => wsToLocalMessage(m, consultationId)));
        });

        socketInstance.on('message', (msg: WsMessage) => {
          setMessages(prev => prev.some(m => m.id === msg.messageId) ? prev : [...prev, wsToLocalMessage(msg, consultationId)]);
        });

        socketInstance.on('typing', (data: { senderId: string; senderType: string; isTyping: boolean }) => {
          if (data.senderId !== user?.userId) {
            setTypingUser(data.isTyping ? data.senderType : null);
          }
        });

        socketInstance.on('warning', (data: { code: string; message: string }) => {
          setWarningMsg(data.message);
          setTimeout(() => setWarningMsg(''), 5000);
        });

        socketInstance.on('error', (data: { code: string; message: string }) => {
          setError(data.message);
        });

        socketRef.current = socketInstance;
      } catch (err) {
        setError(err instanceof Error ? err.message : t('chat.load.error'));
        setWsStatus('disconnected');
      }
    }

    connectSocket();

    return () => {
      if (socketInstance) socketInstance.disconnect();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [isAuthenticated, accessToken, consultationId, user?.userId, t]);

  const sendTypingSignal = useCallback((typing: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { isTyping: typing });
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      sendTypingSignal(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingSignal(false);
    }, 2000);
  }, [isTyping, sendTypingSignal]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const senderType: 'citizen' | 'advocate' = user?.role === 'advocate' ? 'advocate' : 'citizen';

    if (USE_MOCK) {
      const mockMsg: Message = {
        id: `msg-${Date.now()}`,
        consultationId,
        senderType,
        senderId: user?.userId || 'mock-id',
        content: text,
        moderationStatus: 'approved',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, mockMsg]);
    } else if (socketRef.current?.connected) {
      socketRef.current.emit('message', { text });
      sendTypingSignal(false);
    } else {
      setError(language === 'en' ? 'Not connected. Please wait...' : 'সংযুক্ত নয়। অপেক্ষা করুন...');
      return;
    }
    setInputText('');
    setIsTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, [inputText, consultationId, user, language, sendTypingSignal]);

  if (isLoading || !isAuthenticated) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }} />;
  }

  const backLink = user?.role === 'advocate' ? '/advocate/dashboard' : '/matters';
  const backLabel = user?.role === 'advocate'
    ? (language === 'en' ? 'Back to dashboard' : 'ড্যাশবোর্ডে ফিরুন')
    : (language === 'en' ? 'Back to my matters' : 'আমার মামলাগুলিতে ফিরুন');
  const myRole: 'citizen' | 'advocate' = user?.role === 'advocate' ? 'advocate' : 'citizen';
  const peerRole = myRole === 'advocate' ? 'citizen' : 'advocate';
  const peerLabel = peerRole === 'advocate' ? (language === 'en' ? 'Advocate' : 'আইনজীবী') : (language === 'en' ? 'Client' : 'মক্কেল');
  const peerInitial = peerRole === 'advocate' ? 'A' : 'C';

  const aiBrief = brief?.responseEnglish && language === 'en'
    ? brief.responseEnglish
    : brief?.responseBengali && language === 'bn'
      ? brief.responseBengali
      : brief?.responseEnglish || brief?.responseBengali || '';

  return (
    <div className="chat-shell">
      <style>{`
        .chat-layout {
          flex: 1;
          display: flex;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 1.25rem 1rem;
          gap: 1rem;
          align-items: stretch;
        }
        .chat-layout .chat-container {
          flex: 1;
          padding: 0;
          max-width: none;
        }
        .matter-sidebar {
          width: 320px;
          flex-shrink: 0;
          background: white;
          border-radius: 1.25rem;
          border: 1px solid rgba(13,27,42,0.06);
          box-shadow: 0 12px 30px -12px rgba(13,27,42,0.16);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-self: flex-start;
          max-height: calc(100vh - 6rem);
          position: sticky;
          top: 5rem;
        }
        .matter-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 1rem 1.125rem;
          background: linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%);
          color: white;
        }
        .matter-sidebar-header h2 {
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0;
          color: rgba(255,255,255,0.92);
        }
        .matter-sidebar-toggle {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: white;
          border-radius: 0.5rem;
          width: 1.75rem;
          height: 1.75rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.875rem;
          line-height: 1;
        }
        .matter-sidebar-toggle:hover { background: rgba(255,255,255,0.22); }
        .matter-sidebar-body {
          padding: 1.125rem 1.125rem 1.25rem;
          overflow-y: auto;
          font-size: 0.875rem;
          color: #1F2937;
        }
        .matter-sidebar-body::-webkit-scrollbar { width: 6px; }
        .matter-sidebar-body::-webkit-scrollbar-thumb { background: rgba(13,27,42,0.12); border-radius: 9999px; }
        .matter-sidebar-section { margin-bottom: 1rem; }
        .matter-sidebar-section:last-child { margin-bottom: 0; }
        .matter-sidebar-label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9CA3AF;
          margin-bottom: 0.375rem;
        }
        .matter-sidebar-chip {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          background: rgba(201,168,76,0.14);
          color: #8B6E1A;
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 0.375rem;
          margin-bottom: 0.25rem;
        }
        .matter-sidebar-query {
          background: #F8F5F0;
          border-left: 3px solid #C9A84C;
          padding: 0.75rem 0.875rem;
          border-radius: 0.5rem;
          font-style: italic;
          color: #374151;
          line-height: 1.55;
        }
        .matter-sidebar-brief {
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
        }
        .matter-sidebar-citation {
          padding: 0.5rem 0.75rem;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          margin-bottom: 0.375rem;
          color: #1F2937;
        }
        .matter-sidebar-citation .sec {
          font-weight: 600;
          color: #0D1B2A;
        }
        .sidebar-collapsed-rail {
          width: 2.5rem;
          background: white;
          border-radius: 1.25rem;
          border: 1px solid rgba(13,27,42,0.06);
          box-shadow: 0 12px 30px -12px rgba(13,27,42,0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 0;
          align-self: flex-start;
          max-height: calc(100vh - 6rem);
          position: sticky;
          top: 5rem;
        }
        .sidebar-collapsed-rail button {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          background: transparent;
          border: none;
          color: #0D1B2A;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 1rem 0;
        }
        .sidebar-collapsed-rail button:hover { color: #C9A84C; }
        .chat-back-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .chat-back-row a {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #0D1B2A;
          font-size: 0.8125rem;
          font-weight: 600;
          text-decoration: none;
          padding: 0.5rem 0.875rem;
          background: white;
          border: 1px solid rgba(13,27,42,0.08);
          border-radius: 9999px;
          box-shadow: 0 4px 10px -2px rgba(13,27,42,0.06);
          transition: all 0.2s;
        }
        .chat-back-row a:hover { color: #C9A84C; border-color: rgba(201,168,76,0.4); transform: translateX(-2px); }
        @media (max-width: 1024px) {
          .chat-layout { flex-direction: column; padding: 1rem 0.75rem; }
          .matter-sidebar { width: 100%; position: static; max-height: 50vh; }
          .sidebar-collapsed-rail { width: 100%; position: static; padding: 0.5rem; }
          .sidebar-collapsed-rail button { writing-mode: horizontal-tb; transform: none; padding: 0.5rem 1rem; }
        }
      `}</style>

      <div className="chat-layout">
        {sidebarOpen ? (
          <aside className="matter-sidebar" aria-label={language === 'en' ? 'Matter context' : 'মামলার প্রসঙ্গ'}>
            <div className="matter-sidebar-header">
              <h2 style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'Matter context' : 'মামলার প্রসঙ্গ'}
              </h2>
              <button
                className="matter-sidebar-toggle"
                onClick={() => setSidebarOpen(false)}
                aria-label={language === 'en' ? 'Collapse sidebar' : 'সাইডবার বন্ধ করুন'}
              >
                ×
              </button>
            </div>
            <div className="matter-sidebar-body">
              {briefLoading && !brief ? (
                <>
                  <div className="skeleton" style={{ height: '1rem', width: '40%', marginBottom: '0.75rem', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '3.5rem', marginBottom: '1rem', borderRadius: '8px' }} />
                  <div className="skeleton" style={{ height: '1rem', width: '30%', marginBottom: '0.5rem', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '4.5rem', borderRadius: '8px' }} />
                </>
              ) : !brief ? (
                <div style={{ fontSize: '0.8125rem', color: '#9CA3AF', textAlign: 'center', padding: '1rem 0' }}>
                  {language === 'en' ? 'Matter context unavailable.' : 'মামলার প্রসঙ্গ পাওয়া যাচ্ছে না।'}
                </div>
              ) : (
                <>
                  {brief.classification && (
                    <div className="matter-sidebar-section">
                      <div className="matter-sidebar-label">
                        {language === 'en' ? 'Classification' : 'শ্রেণীবিভাগ'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {brief.classification.matterType && (
                          <span className="matter-sidebar-chip">{brief.classification.matterType}</span>
                        )}
                        {brief.classification.statute && (
                          <span className="matter-sidebar-chip" style={{ background: 'rgba(13,27,42,0.06)', color: '#0D1B2A', borderColor: 'rgba(13,27,42,0.12)' }}>
                            {brief.classification.statute}
                          </span>
                        )}
                        {formatLocation(brief.classification.location) && (
                          <span className="matter-sidebar-chip" style={{ background: 'rgba(16,185,129,0.10)', color: '#065F46', borderColor: 'rgba(16,185,129,0.25)' }}>
                            📍 {formatLocation(brief.classification.location)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="matter-sidebar-section">
                    <div className="matter-sidebar-label">
                      {language === 'en' ? 'Original query' : 'মূল প্রশ্ন'}
                    </div>
                    <div
                      className="matter-sidebar-query"
                      style={{ fontFamily: brief.queryLanguage === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
                    >
                      “{brief.queryText}”
                    </div>
                  </div>

                  {aiBrief && (
                    <div className="matter-sidebar-section">
                      <div className="matter-sidebar-label">
                        {language === 'en' ? 'AI legal brief' : 'এআই আইনি সারাংশ'}
                      </div>
                      <div
                        className="matter-sidebar-brief"
                        style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
                      >
                        {aiBrief}
                      </div>
                    </div>
                  )}

                  {brief.citations && brief.citations.length > 0 && (
                    <div className="matter-sidebar-section">
                      <div className="matter-sidebar-label">
                        {language === 'en' ? 'Citations' : 'উদ্ধৃতি'}
                      </div>
                      {brief.citations.slice(0, 5).map((c, i) => (
                        <div key={i} className="matter-sidebar-citation">
                          <div className="sec">{c.section || c.citation || '—'}</div>
                          <div style={{ color: '#4B5563', fontSize: '0.75rem', marginTop: '2px' }}>{c.title}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {brief.matterId && user?.role !== 'advocate' && (
                    <Link
                      href={`/matter/${brief.matterId}`}
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        marginTop: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: '#F8F5F0',
                        border: '1px solid rgba(13,27,42,0.08)',
                        borderRadius: '0.5rem',
                        color: '#0D1B2A',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {language === 'en' ? 'Open full matter →' : 'সম্পূর্ণ মামলা দেখুন →'}
                    </Link>
                  )}

                  <div style={{ marginTop: '1rem', padding: '0.625rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '0.5rem', fontSize: '0.6875rem', color: '#92400E', lineHeight: 1.5 }}>
                    {language === 'en'
                      ? 'AI brief is informational only — not legal advice.'
                      : 'এআই সারাংশ কেবল তথ্যমূলক — আইনি পরামর্শ নয়।'}
                  </div>
                </>
              )}
            </div>
          </aside>
        ) : (
          <div className="sidebar-collapsed-rail">
            <button onClick={() => setSidebarOpen(true)} aria-label={language === 'en' ? 'Show matter context' : 'মামলার প্রসঙ্গ দেখুন'}>
              {language === 'en' ? '› Matter context' : '› মামলার প্রসঙ্গ'}
            </button>
          </div>
        )}

        <div className="chat-container">
          <div className="chat-back-row">
            <Link href={backLink}>← {backLabel}</Link>
          </div>

          <div className="chat-card">
            {/* Header */}
            <header className="chat-header">
              <div className="chat-header-info">
                <Link href={backLink} className="chat-back-btn" aria-label={backLabel}>←</Link>
                <div className="chat-peer-avatar">{peerInitial}</div>
                <div className="chat-title-block">
                  <h1 style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                    {peerLabel}
                  </h1>
                  <span className="chat-subtitle">
                    {language === 'en' ? `Session ${consultationId.slice(0, 8).toUpperCase()}` : `সেশন ${consultationId.slice(0, 8).toUpperCase()}`}
                  </span>
                </div>
              </div>
              <div className="chat-status-pill">
                <span className={`chat-status-dot ${wsStatus}`} />
                <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                  {t(`chat.status.${wsStatus}` as TranslationKey) || wsStatus}
                </span>
              </div>
            </header>

            {(error || warningMsg) && (
              <div style={{ paddingTop: '0.75rem' }}>
                {error && <div className="chat-err-banner">⚠️ {error}</div>}
                {warningMsg && <div className="chat-warn-banner">⚠️ {warningMsg}</div>}
              </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-icon">💬</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#6B7280', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                    {t('chat.empty')}
                  </div>
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                    {language === 'en' ? 'Your conversation is end-to-end private.' : 'আপনার কথোপকথন ব্যক্তিগত।'}
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === user?.userId;
                  const senderInitial = msg.senderType === 'advocate' ? 'A' : 'C';
                  const senderLabel = msg.senderType === 'advocate' ? (language === 'en' ? 'Advocate' : 'আইনজীবী') : (language === 'en' ? 'Client' : 'মক্কেল');
                  return (
                    <div key={msg.id} className={`chat-msg-row ${isOwn ? 'own' : 'peer'}`}>
                      <div className="chat-msg-avatar">{senderInitial}</div>
                      <div className="chat-msg-stack">
                        {!isOwn && <span className="chat-msg-sender">{senderLabel}</span>}
                        <div
                          className={`chat-bubble ${isOwn ? 'own' : 'peer'}`}
                          style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'var(--font-sans)' }}
                        >
                          {msg.content}
                        </div>
                        <div className="chat-msg-meta">
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.moderationStatus === 'pending' && isOwn && (
                            <span className="pending">• {t('chat.moderation')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {typingUser && (
                <div className="chat-typing">
                  <span className="dots"><span /><span /><span /></span>
                  <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                    {typingUser === 'advocate' ? (language === 'en' ? 'Advocate is typing…' : 'আইনজীবী টাইপ করছেন…') : (language === 'en' ? 'Client is typing…' : 'মক্কেল টাইপ করছেন…')}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-bar">
              <form onSubmit={handleSendMessage} className="chat-input-row">
                <input
                  type="text"
                  className="chat-input"
                  style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
                  placeholder={t('chat.placeholder')}
                  value={inputText}
                  onChange={handleInputChange}
                  disabled={wsStatus === 'connecting'}
                  maxLength={1000}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!inputText.trim() || (wsStatus !== 'connected' && !USE_MOCK)}
                  aria-label={t('chat.send')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
              {wsStatus === 'disconnected' && !USE_MOCK && (
                <p style={{ fontSize: '0.75rem', color: '#F59E0B', textAlign: 'center', marginTop: '0.625rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                  {language === 'en' ? '🔄 Reconnecting…' : '🔄 পুনরায় সংযুক্ত হচ্ছে…'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
