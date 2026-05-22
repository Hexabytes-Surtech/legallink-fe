'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay, MOCK_MESSAGES } from '@/data/mock';
import type { Message } from '@/types';
import type { TranslationKey } from '@/i18n/config';

export default function ChatPage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const { t, language } = useLanguage();
  const { user, accessToken, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'pending'>('pending');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/signup?returnTo=/chat/${consultationId}`);
    }
  }, [isLoading, isAuthenticated, router, consultationId]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    async function loadMessages() {
      try {
        if (USE_MOCK) {
          await mockDelay(600);
          setMessages(MOCK_MESSAGES);
          setWsStatus('pending');
        } else {
          const res = await apiClient<Message[]>(`/advocate/messages?consultationId=${consultationId}`);
          if (res.success && res.data) {
            setMessages(res.data);
          } else {
            console.warn('REST messages fetch failed:', res.error);
          }
          connectWebSocket();
        }
      } catch {
        setError(t('chat.load.error'));
      }
    }

    function connectWebSocket() {
      setWsStatus('connecting');
      const wsUrl = `ws://localhost:3000/ws/consultation/${consultationId}?token=${accessToken}`;
      try {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onopen = () => { setWsStatus('connected'); };
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'message' && data.payload) {
              setMessages(prev => [...prev, data.payload]);
            }
          } catch (e) {
            console.error('Failed to parse WS message:', e);
          }
        };
        wsRef.current.onclose = () => {
          setWsStatus('disconnected');
          reconnectTimer = setTimeout(connectWebSocket, 5000);
        };
        wsRef.current.onerror = () => { setWsStatus('pending'); };
      } catch { setWsStatus('pending'); }
    }

    loadMessages();

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(reconnectTimer);
    };
  }, [isAuthenticated, consultationId, accessToken, t]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const senderType: 'citizen' | 'advocate' = user?.role === 'advocate' ? 'advocate' : 'citizen';
    const messagePayload = {
      id: `msg-new-${Date.now()}`,
      consultationId,
      senderType,
      senderId: user?.userId || 'mock-id',
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    if (USE_MOCK) {
      const mockMsg: Message = {
        ...messagePayload,
        moderationStatus: 'approved',
      };
      setMessages(prev => [...prev, mockMsg]);
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        payload: {
          content: inputText.trim(),
          senderType,
        }
      }));
    } else {
      console.warn('WebSocket not connected. Message not sent to server.');
      // Add local message representation anyway for testing UI resilience
      const fallbackMsg: Message = {
        ...messagePayload,
        moderationStatus: 'approved',
      };
      setMessages(prev => [...prev, fallbackMsg]);
    }
    setInputText('');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
        <div />
      </div>
    );
  }

  const backLink = user?.role === 'advocate' ? '/advocate/dashboard' : '/matters';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '800px', margin: '0 auto', width: '100%', padding: '1rem' }}>
        <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '1rem 1rem 0 0', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href={backLink} style={{ textDecoration: 'none', color: 'var(--color-gray-500)', fontSize: '1.25rem' }}>←</Link>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('chat.title')}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: wsStatus === 'connected' ? '#10B981' : wsStatus === 'connecting' ? '#F59E0B' : '#9CA3AF' }} />
            <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t(`chat.status.${wsStatus}` as TranslationKey) || wsStatus}</span>
          </div>
        </div>

        <div style={{ flex: 1, background: 'var(--color-gray-50)', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', height: '60vh' }}>
          {error && <div style={{ textAlign: 'center', color: '#DC2626', fontSize: '0.875rem' }}>{error}</div>}
          {messages.length === 0 && !error ? (
            <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', margin: 'auto', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('chat.empty')}</div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.senderId === user?.userId || msg.senderType === user?.role;
              return (
                <div key={msg.id} style={{ alignSelf: isOwnMessage ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isOwnMessage ? 'flex-end' : 'flex-start' }}>
                  <div className={isOwnMessage ? 'message-citizen' : 'message-advocate'} style={{ padding: '0.75rem 1rem', fontSize: '0.9375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'var(--font-sans)', lineHeight: 1.5 }}>{msg.content}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-gray-400)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.moderationStatus === 'pending' && isOwnMessage && <span style={{ color: '#F59E0B' }}>• {t('chat.moderation')}</span>}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '0 0 1rem 1rem', borderTop: '1px solid var(--color-gray-200)', boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
            <input type="text" className="input" style={{ flex: 1, borderRadius: '9999px', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }} placeholder={t('chat.placeholder')} value={inputText} onChange={(e) => setInputText(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-icon" disabled={!inputText.trim()} aria-label={t('chat.send')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}