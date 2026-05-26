'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { USE_MOCK, mockDelay, MOCK_MESSAGES } from '@/data/mock';
import type { Message, WsMessage } from '@/types';
import type { TranslationKey } from '@/i18n/config';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

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

  const backLink = user?.role === 'advocate' ? '/advocate/consultations' : '/matters';
  const myRole: 'citizen' | 'advocate' = user?.role === 'advocate' ? 'advocate' : 'citizen';
  const peerRole = myRole === 'advocate' ? 'citizen' : 'advocate';
  const peerLabel = peerRole === 'advocate' ? (language === 'en' ? 'Advocate' : 'আইনজীবী') : (language === 'en' ? 'Client' : 'মক্কেল');
  const peerInitial = peerRole === 'advocate' ? 'A' : 'C';

  return (
    <div className="chat-shell">
      <div className="chat-container">
        <div className="chat-card">
          {/* Header */}
          <header className="chat-header">
            <div className="chat-header-info">
              <Link href={backLink} className="chat-back-btn" aria-label="Back">←</Link>
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
  );
}
