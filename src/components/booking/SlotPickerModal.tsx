'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api/client';
import type { BackendMatterListItem } from '@/types';

interface DaySlots {
  date: string;
  slots: { time: string; available: boolean }[];
}

interface SlotPickerModalProps {
  advocateId: string;
  advocateName: string;
  avatarUrl?: string;
  onClose: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateLabel(dateStr: string, isBn: boolean): { day: string; date: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00Z');
  const jsDay = d.getUTCDay();
  return {
    day: isBn ? DAY_LABELS_BN[jsDay] : DAY_LABELS[jsDay],
    date: String(d.getUTCDate()),
    month: MONTH_SHORT[d.getUTCMonth()],
  };
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function groupSlots(slots: { time: string; available: boolean }[]) {
  const morning = slots.filter(s => s.time < '12:00');
  const afternoon = slots.filter(s => s.time >= '12:00' && s.time < '17:00');
  const evening = slots.filter(s => s.time >= '17:00');
  return { morning, afternoon, evening };
}

export function SlotPickerModal({ advocateId, advocateName, avatarUrl, onClose }: SlotPickerModalProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const isBn = language === 'bn';

  // Next 7 days
  const today = todayStr();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const [selectedDate, setSelectedDate] = useState<string>(dates[0]);
  const [slotsMap, setSlotsMap] = useState<Record<string, DaySlots>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [matters, setMatters] = useState<BackendMatterListItem[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<string>('');
  const [loadingMatters, setLoadingMatters] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  // Load citizen's matters for the matter selector
  useEffect(() => {
    (async () => {
      setLoadingMatters(true);
      const res = await apiClient<BackendMatterListItem[] | { matters: BackendMatterListItem[] }>('/matter');
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as { matters: BackendMatterListItem[] }).matters ?? [];
        setMatters(list);
        if (list.length > 0) setSelectedMatter(list[0].matterId);
      }
      setLoadingMatters(false);
    })();
  }, []);

  // Load slots when selected date changes (cache by date)
  const loadSlots = useCallback(async (date: string) => {
    if (slotsMap[date]) return;
    setLoadingSlots(true);
    const res = await apiClient<DaySlots[]>(`/advocates/${advocateId}/availability?from=${date}&to=${date}`);
    if (res.success && res.data) {
      const day = res.data.find(d => d.date === date);
      setSlotsMap(prev => ({ ...prev, [date]: day ?? { date, slots: [] } }));
    } else {
      setSlotsMap(prev => ({ ...prev, [date]: { date, slots: [] } }));
    }
    setLoadingSlots(false);
  }, [advocateId, slotsMap]);

  useEffect(() => {
    loadSlots(selectedDate);
    setSelectedSlot(null);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSlots = slotsMap[selectedDate]?.slots ?? null;
  const { morning, afternoon, evening } = currentSlots ? groupSlots(currentSlots) : { morning: [], afternoon: [], evening: [] };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedMatter) return;
    setError('');
    setBooking(true);

    const scheduledAt = `${selectedDate}T${selectedSlot}:00.000Z`;
    const res = await apiClient('/consultations', {
      method: 'POST',
      body: JSON.stringify({
        matterId: selectedMatter,
        advocateId,
        scheduledAt,
      }),
    });
    setBooking(false);

    if (res.success) {
      onClose();
      router.push('/matters');
    } else {
      setError(res.error ?? (isBn ? 'বুকিং ব্যর্থ হয়েছে' : 'Booking failed'));
    }
  };

  const initials = advocateName.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        .sp-sheet {
          background: white; border-radius: 1.5rem 1.5rem 0 0;
          width: 100%; max-width: 540px; max-height: 92vh;
          overflow-y: auto; padding: 1.5rem 1.5rem 2rem;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .sp-header { display: flex; align-items: center; gap: 0.875rem; margin-bottom: 1.25rem; }
        .sp-avatar {
          width: 3rem; height: 3rem; border-radius: 50%;
          background: linear-gradient(135deg, #C9A84C, #E2C475);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; font-weight: 700; color: #0D1B2A; flex-shrink: 0;
          overflow: hidden;
        }
        .sp-advocate-name { font-size: 1.0625rem; font-weight: 700; color: #0D1B2A; }
        .sp-close { margin-left: auto; background: none; border: none; cursor: pointer; color: #9CA3AF; font-size: 1.25rem; }
        .sp-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9CA3AF; margin: 1rem 0 0.5rem; }
        .sp-date-strip { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem; }
        .sp-date-btn {
          flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
          padding: 0.5rem 0.75rem; border-radius: 0.75rem; border: 2px solid #E5E7EB;
          background: white; cursor: pointer; min-width: 3.25rem; transition: all 0.15s;
        }
        .sp-date-btn.active { border-color: #C9A84C; background: #FBF5E7; }
        .sp-date-btn-day { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: #9CA3AF; }
        .sp-date-btn-num { font-size: 1.1rem; font-weight: 800; color: #0D1B2A; line-height: 1.2; }
        .sp-date-btn-mon { font-size: 0.65rem; color: #9CA3AF; }
        .sp-date-btn.active .sp-date-btn-day,
        .sp-date-btn.active .sp-date-btn-num,
        .sp-date-btn.active .sp-date-btn-mon { color: #A0803A; }
        .sp-slots-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.375rem; }
        .sp-slot {
          padding: 0.375rem 0.875rem; border-radius: 9999px;
          border: 1.5px solid #E5E7EB; background: white;
          font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.12s;
        }
        .sp-slot:disabled { cursor: not-allowed; opacity: 0.4; }
        .sp-slot.available:hover { border-color: #C9A84C; background: #FBF5E7; color: #A0803A; }
        .sp-slot.selected { border-color: #C9A84C; background: #C9A84C; color: white; font-weight: 700; }
        .sp-no-slots { font-size: 0.875rem; color: #9CA3AF; padding: 0.75rem 0; }
        .sp-matter-select {
          width: 100%; padding: 0.625rem 0.875rem; border-radius: 0.75rem;
          border: 1.5px solid #E5E7EB; font-size: 0.875rem; color: #0D1B2A;
          background: white; margin-top: 0.375rem;
        }
        .sp-confirm-bar { margin-top: 1.5rem; display: flex; gap: 0.75rem; }
        .sp-error { color: #DC2626; font-size: 0.8125rem; margin-top: 0.5rem; }
      `}</style>

      <div className="sp-sheet">
        {/* Header */}
        <div className="sp-header">
          <div className="sp-avatar" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
            {!avatarUrl && initials}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>
              {isBn ? 'সময় বুক করুন' : 'Book a time slot'}
            </div>
            <div className="sp-advocate-name">{advocateName}</div>
          </div>
          <button className="sp-close" onClick={onClose}>✕</button>
        </div>

        {/* Date strip */}
        <div className="sp-section-label">{isBn ? 'তারিখ বেছে নিন' : 'Select a date'}</div>
        <div className="sp-date-strip">
          {dates.map(date => {
            const lbl = formatDateLabel(date, isBn);
            return (
              <button
                key={date}
                className={`sp-date-btn${selectedDate === date ? ' active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="sp-date-btn-day">{lbl.day}</span>
                <span className="sp-date-btn-num">{lbl.date}</span>
                <span className="sp-date-btn-mon">{lbl.month}</span>
              </button>
            );
          })}
        </div>

        {/* Slots */}
        <div className="sp-section-label">{isBn ? 'সময় বেছে নিন' : 'Select a time'}</div>
        {loadingSlots ? (
          <div className="skeleton" style={{ height: '80px', borderRadius: '0.75rem' }} />
        ) : currentSlots === null ? (
          <div className="sp-no-slots">{isBn ? 'লোড হচ্ছে...' : 'Loading…'}</div>
        ) : currentSlots.length === 0 ? (
          <div className="sp-no-slots">{isBn ? 'এই দিনে কোনো স্লট নেই' : 'No slots available on this day'}</div>
        ) : (
          <>
            {morning.length > 0 && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.625rem', marginBottom: '0.375rem' }}>
                  ☀️ {isBn ? 'সকাল' : 'Morning'}
                </div>
                <div className="sp-slots-grid">
                  {morning.map(s => (
                    <button
                      key={s.time}
                      className={`sp-slot available${selectedSlot === s.time ? ' selected' : ''}`}
                      disabled={!s.available}
                      onClick={() => s.available && setSelectedSlot(s.time)}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              </>
            )}
            {afternoon.length > 0 && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.875rem', marginBottom: '0.375rem' }}>
                  🌤️ {isBn ? 'দুপুর' : 'Afternoon'}
                </div>
                <div className="sp-slots-grid">
                  {afternoon.map(s => (
                    <button
                      key={s.time}
                      className={`sp-slot available${selectedSlot === s.time ? ' selected' : ''}`}
                      disabled={!s.available}
                      onClick={() => s.available && setSelectedSlot(s.time)}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              </>
            )}
            {evening.length > 0 && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.875rem', marginBottom: '0.375rem' }}>
                  🌆 {isBn ? 'সন্ধ্যা' : 'Evening'}
                </div>
                <div className="sp-slots-grid">
                  {evening.map(s => (
                    <button
                      key={s.time}
                      className={`sp-slot available${selectedSlot === s.time ? ' selected' : ''}`}
                      disabled={!s.available}
                      onClick={() => s.available && setSelectedSlot(s.time)}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Matter selector */}
        <div className="sp-section-label">{isBn ? 'কোন বিষয়ের জন্য?' : 'Which matter?'}</div>
        {loadingMatters ? (
          <div className="skeleton" style={{ height: '40px', borderRadius: '0.75rem' }} />
        ) : matters.length === 0 ? (
          <div className="sp-no-slots">
            {isBn ? 'কোনো বিষয় নেই। ' : 'No matters found. '}
            <a href="/intake" style={{ color: '#C9A84C' }}>
              {isBn ? 'প্রথমে আপনার সমস্যা বর্ণনা করুন' : 'Describe your problem first'}
            </a>
          </div>
        ) : (
          <select
            className="sp-matter-select"
            value={selectedMatter}
            onChange={e => setSelectedMatter(e.target.value)}
          >
            {matters.map(m => (
              <option key={m.matterId} value={m.matterId}>
                {m.query.length > 60 ? m.query.slice(0, 60) + '…' : m.query}
              </option>
            ))}
          </select>
        )}

        {error && <div className="sp-error">{error}</div>}

        {/* Confirm */}
        <div className="sp-confirm-bar">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            disabled={!selectedSlot || !selectedMatter || booking || matters.length === 0}
            onClick={handleConfirm}
          >
            {booking
              ? (isBn ? 'বুক করা হচ্ছে...' : 'Booking…')
              : selectedSlot
                ? `${isBn ? 'নিশ্চিত করুন' : 'Confirm'} — ${selectedDate} ${selectedSlot}`
                : (isBn ? 'একটি স্লট বেছে নিন' : 'Select a slot')}
          </button>
        </div>
      </div>
    </div>
  );
}
