'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_BN = ['সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি', 'রবি'];

const SLOT_TIMES: string[] = [];
for (let h = 9; h < 21; h++) {
  SLOT_TIMES.push(`${String(h).padStart(2, '0')}:00`);
  SLOT_TIMES.push(`${String(h).padStart(2, '0')}:30`);
}
// 09:00 → 20:30 — 24 rows of 30 min each (last slot ends at 21:00)

interface ApiSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

// Expand API blocks → Set of "day:HH:MM" keys
function expandBlocks(blocks: ApiSlot[]): Set<string> {
  const keys = new Set<string>();
  for (const b of blocks) {
    const [sh, sm] = b.start_time.split(':').map(Number);
    const [eh, em] = b.end_time.split(':').map(Number);
    const endMin = eh * 60 + em;
    let min = sh * 60 + sm;
    while (min + 30 <= endMin) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      keys.add(`${b.day_of_week}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      min += 30;
    }
  }
  return keys;
}

// Collapse selected slot keys → API blocks (merge consecutive slots)
function collapseToBlocks(selected: Set<string>) {
  const byDay: Record<number, string[]> = {};
  for (const key of selected) {
    const [d, h, m] = key.split(':');
    const day = Number(d);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(`${h}:${m}`);
  }

  const blocks: { dayOfWeek: number; startTime: string; endTime: string; slotDurationMinutes: number }[] = [];
  for (const [dayStr, times] of Object.entries(byDay)) {
    const day = Number(dayStr);
    times.sort();

    let blockStart = times[0];
    let prevMin = toMin(times[0]);

    for (let i = 1; i <= times.length; i++) {
      const curMin = i < times.length ? toMin(times[i]) : -1;
      if (curMin === prevMin + 30) {
        prevMin = curMin;
      } else {
        blocks.push({
          dayOfWeek: day,
          startTime: blockStart,
          endTime: addMinStr(times[i - 1], 30),
          slotDurationMinutes: 30,
        });
        if (i < times.length) {
          blockStart = times[i];
          prevMin = curMin;
        }
      }
    }
  }
  return blocks;
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function addMinStr(t: string, add: number): string {
  const total = toMin(t) + add;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdvocateAvailabilityPage() {
  const { language } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const isBn = language === 'bn';
  const dirty = [...selected].some(k => !savedKeys.has(k)) || [...savedKeys].some(k => !selected.has(k));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);
      const res = await apiClient<ApiSlot[]>('/advocate/availability');
      if (res.success && res.data) {
        const keys = expandBlocks(res.data);
        setSelected(keys);
        setSavedKeys(keys);
      }
      setLoading(false);
    })();
  }, [isAuthenticated]);

  const toggle = useCallback((key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const copyMonToWeekdays = useCallback(() => {
    setSelected(prev => {
      const next = new Set(prev);
      const monSlots = SLOT_TIMES.filter(t => prev.has(`0:${t}`));
      for (let d = 1; d <= 4; d++) {
        // clear existing for that day first
        for (const t of SLOT_TIMES) next.delete(`${d}:${t}`);
        for (const t of monSlots) next.add(`${d}:${t}`);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const slots = collapseToBlocks(selected);
    const res = await apiClient('/advocate/availability', {
      method: 'PUT',
      body: JSON.stringify({ slots }),
    });
    setSaving(false);
    if (res.success) {
      setSavedKeys(new Set(selected));
      showToast(isBn ? 'সংরক্ষিত হয়েছে!' : 'Availability saved!');
    } else {
      showToast(res.error ?? (isBn ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Save failed'));
    }
  };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  if (isLoading || loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.5rem' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '40%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '400px', borderRadius: '1rem' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream, #F8F6F2)', paddingBottom: '6rem' }}>
      <style>{`
        .avail-wrap { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem; }
        .avail-table { width: 100%; border-collapse: collapse; }
        .avail-table th {
          background: #0D1B2A;
          color: white;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.625rem 0.25rem;
          text-align: center;
          letter-spacing: 0.06em;
        }
        .avail-table th:first-child { text-align: left; padding-left: 0.75rem; min-width: 3.5rem; }
        .avail-time-label {
          font-size: 0.72rem;
          color: #9CA3AF;
          padding: 2px 0.75rem 2px 0.75rem;
          white-space: nowrap;
          vertical-align: middle;
        }
        .avail-cell {
          width: calc((100% - 3.5rem) / 7);
          height: 1.875rem;
          border: 1px solid #F3F4F6;
          cursor: pointer;
          transition: background 0.1s;
          background: #F9FAFB;
        }
        .avail-cell:hover { background: rgba(201,168,76,0.18); }
        .avail-cell.selected { background: #10B981; border-color: #059669; }
        .avail-cell.selected:hover { background: #059669; }
        .avail-row:nth-child(even) .avail-cell { background: #F3F4F6; }
        .avail-row:nth-child(even) .avail-cell.selected { background: #10B981; border-color: #059669; }
        .avail-legend { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; margin-top: 1rem; }
        .avail-legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8125rem; color: #6B7280; }
        .avail-legend-swatch { width: 14px; height: 14px; border-radius: 3px; }
        .dirty-banner {
          position: fixed; bottom: 5rem; left: 50%; transform: translateX(-50%);
          background: #0D1B2A; color: white; border-radius: 9999px;
          padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 600;
          display: flex; align-items: center; gap: 0.75rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25); z-index: 30;
        }
        .save-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: white; border-top: 1px solid #E5E7EB;
          padding: 0.875rem 1.5rem;
          display: flex; align-items: center; justify-content: center; gap: 1rem;
          z-index: 40; box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
        }
        .toast-chip {
          position: fixed; top: 1.5rem; right: 1.5rem; z-index: 50;
          background: #0D1B2A; color: white; border-radius: 9999px;
          padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 600;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2); animation: fadeIn 0.2s;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {toast && <div className="toast-chip">{toast}</div>}

      <div className="avail-wrap">
        <h1 style={{ fontSize: 'clamp(1.3rem,3vw,1.75rem)', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
          {isBn ? 'আমার উপলব্ধতা' : 'My Availability'}
        </h1>
        <p style={{ color: '#6B7280', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          {isBn
            ? 'সবুজ স্লটে ক্লিক করে উপলব্ধ সময় চিহ্নিত করুন। নাগরিকরা এই সময়গুলিতে বুকিং দিতে পারবেন।'
            : 'Click slots to mark available. Citizens can book these times.'}
        </p>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={copyMonToWeekdays}
            title={isBn ? 'সোমবারের স্লট সোম-শুক্রে কপি করুন' : 'Copy Monday slots to Tue–Fri'}
          >
            {isBn ? 'সোম → সোম-শুক্র কপি' : 'Copy Mon → Weekdays'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: '#DC2626', borderColor: '#DC2626' }}
            onClick={() => setSelected(new Set())}
          >
            {isBn ? 'সব মুছুন' : 'Clear All'}
          </button>
        </div>

        {/* Grid */}
        <div style={{ background: 'white', borderRadius: '1.25rem', overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
          <table className="avail-table">
            <thead>
              <tr>
                <th>{isBn ? 'সময়' : 'Time'}</th>
                {(isBn ? DAYS_BN : DAYS).map((d, i) => (
                  <th key={i}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOT_TIMES.map(time => (
                <tr key={time} className="avail-row">
                  <td className="avail-time-label">{time}</td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${dayIdx}:${time}`;
                    const isSelected = selected.has(key);
                    return (
                      <td
                        key={dayIdx}
                        className={`avail-cell${isSelected ? ' selected' : ''}`}
                        onClick={() => toggle(key)}
                        title={`${(isBn ? DAYS_BN : DAYS)[dayIdx]} ${time}`}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="avail-legend">
          <div className="avail-legend-item">
            <div className="avail-legend-swatch" style={{ background: '#10B981' }} />
            {isBn ? 'উপলব্ধ' : 'Available'}
          </div>
          <div className="avail-legend-item">
            <div className="avail-legend-swatch" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }} />
            {isBn ? 'অনুপলব্ধ' : 'Unavailable'}
          </div>
          <div className="avail-legend-item" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
            {selected.size} {isBn ? 'টি স্লট নির্বাচিত' : 'slots selected'} ({Math.round(selected.size / 2)} {isBn ? 'ঘণ্টা' : 'hrs'})
          </div>
        </div>
      </div>

      {/* Unsaved banner */}
      {dirty && (
        <div className="dirty-banner">
          <span>{isBn ? 'অসংরক্ষিত পরিবর্তন' : 'Unsaved changes'}</span>
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => setSelected(new Set(savedKeys))}
          >
            {isBn ? 'বাতিল' : 'Discard'}
          </button>
        </div>
      )}

      {/* Save bar */}
      <div className="save-bar">
        <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
          {dirty
            ? (isBn ? 'পরিবর্তন সংরক্ষণ না হলে হারিয়ে যাবে।' : 'Changes will be lost if not saved.')
            : (isBn ? 'সব পরিবর্তন সংরক্ষিত।' : 'All changes saved.')}
        </span>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{ minWidth: '120px' }}
        >
          {saving ? (isBn ? 'সংরক্ষণ...' : 'Saving…') : (isBn ? 'সংরক্ষণ করুন' : 'Save')}
        </button>
      </div>
    </div>
  );
}
