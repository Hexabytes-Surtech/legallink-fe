'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface FeedbackModalProps {
  consultationId: string;
  advocateName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const STORAGE_KEY_DONE = (id: string) => `ll_feedback_done_${id}`;
const STORAGE_KEY_SKIP = (id: string) => `ll_feedback_skip_${id}`;

export function markFeedbackDone(consultationId: string) {
  try { localStorage.setItem(STORAGE_KEY_DONE(consultationId), '1'); } catch { /* ignore */ }
}
export function markFeedbackSkipped(consultationId: string) {
  try { localStorage.setItem(STORAGE_KEY_SKIP(consultationId), '1'); } catch { /* ignore */ }
}
export function isFeedbackPending(consultationId: string): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY_DONE(consultationId)) &&
           !localStorage.getItem(STORAGE_KEY_SKIP(consultationId));
  } catch {
    return false;
  }
}

export function FeedbackModal({ consultationId, advocateName, onClose, onSubmitted }: FeedbackModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    setError('');
    const res = await apiClient(`/consultations/${consultationId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
    });
    setSubmitting(false);
    if (res.success) {
      markFeedbackDone(consultationId);
      setDone(true);
      setTimeout(onSubmitted, 1400);
    } else {
      setError(res.error ?? (isBn ? 'কিছু একটা ভুল হয়েছে।' : 'Something went wrong.'));
    }
  }

  function handleSkip() {
    markFeedbackSkipped(consultationId);
    onClose();
  }

  const activeStars = hovered || rating;

  return (
    <>
      <style>{`
        .fb-overlay {
          position: fixed; inset: 0; z-index: 1200;
          background: rgba(13,27,42,0.55);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fbFadeIn 0.18s ease;
        }
        @keyframes fbFadeIn { from { opacity: 0 } to { opacity: 1 } }
        .fb-modal {
          background: white; border-radius: 1.5rem;
          width: 100%; max-width: 420px;
          box-shadow: 0 24px 64px rgba(13,27,42,0.18);
          animation: fbScaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
          overflow: hidden;
        }
        @keyframes fbScaleIn { from { transform: scale(0.92); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        .fb-header {
          background: linear-gradient(135deg, #0D1B2A, #1E3249);
          padding: 1.5rem; color: white; text-align: center;
        }
        .fb-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem; }
        .fb-subtitle { font-size: 0.875rem; color: rgba(255,255,255,0.65); }
        .fb-body { padding: 1.75rem 1.5rem; }
        .fb-stars {
          display: flex; justify-content: center; gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .fb-star {
          font-size: 2.5rem; cursor: pointer;
          transition: transform 0.1s ease, color 0.1s ease;
          color: #D1D5DB; line-height: 1; user-select: none;
        }
        .fb-star.active { color: #C9A84C; }
        .fb-star:hover { transform: scale(1.15); }
        .fb-textarea {
          width: 100%; border: 1px solid #E5E7EB; border-radius: 0.75rem;
          padding: 0.75rem 1rem; font-size: 0.9rem; resize: none;
          color: #1F2937; outline: none; transition: border-color 0.15s;
          font-family: inherit;
        }
        .fb-textarea:focus { border-color: #C9A84C; }
        .fb-char-counter {
          text-align: right; font-size: 0.75rem; color: #9CA3AF; margin-top: 4px;
        }
        .fb-hint {
          margin-top: 1rem;
          padding: 0.625rem 0.875rem;
          background: rgba(201,168,76,0.06);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 0.5rem;
          font-size: 0.75rem;
          color: #92794A;
          line-height: 1.5;
        }
        .fb-actions {
          display: flex; gap: 0.75rem; margin-top: 1.5rem;
        }
        .fb-skip {
          flex: 0 0 auto;
          background: none; border: none; cursor: pointer;
          font-size: 0.875rem; color: #9CA3AF;
          padding: 0 0.5rem;
          text-decoration: underline;
        }
        .fb-skip:hover { color: #6B7280; }
        .fb-error {
          margin-top: 0.75rem; padding: 0.625rem 0.875rem;
          background: rgba(239,68,68,0.07); border-radius: 0.5rem;
          font-size: 0.8125rem; color: #DC2626;
        }
        .fb-success {
          padding: 2.5rem 1.5rem; text-align: center;
        }
        .fb-success-icon { font-size: 3rem; margin-bottom: 1rem; }
        .fb-success-msg { font-size: 1.1rem; font-weight: 700; color: #0D1B2A; }
        .fb-success-sub { font-size: 0.875rem; color: #6B7280; margin-top: 0.375rem; }
      `}</style>

      <div className="fb-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}>
        <div className="fb-modal">
          <div className="fb-header">
            <div className="fb-title">
              {isBn ? 'আপনার পরামর্শ কেমন ছিল?' : 'How was your consultation?'}
            </div>
            <div className="fb-subtitle">
              {isBn ? `অ্যাডভোকেট ${advocateName}` : `with Adv. ${advocateName}`}
            </div>
          </div>

          {done ? (
            <div className="fb-success">
              <div className="fb-success-icon">🌟</div>
              <div className="fb-success-msg">
                {isBn ? 'ধন্যবাদ!' : 'Thank you!'}
              </div>
              <div className="fb-success-sub">
                {isBn ? 'আপনার মতামত সংরক্ষিত হয়েছে।' : 'Your feedback has been saved.'}
              </div>
            </div>
          ) : (
            <div className="fb-body">
              {/* Star selector */}
              <div className="fb-stars">
                {[1, 2, 3, 4, 5].map(n => (
                  <span
                    key={n}
                    className={`fb-star${activeStars >= n ? ' active' : ''}`}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(n)}
                    role="button"
                    aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Comment */}
              <textarea
                className="fb-textarea"
                rows={3}
                maxLength={500}
                placeholder={isBn ? 'মন্তব্য লিখুন (ঐচ্ছিক)' : 'Leave a comment (optional)'}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div className="fb-char-counter">{comment.length} / 500</div>

              {/* BCI compliance hint */}
              <div className="fb-hint">
                {isBn
                  ? '⚖️ শুধুমাত্র সাড়া দেওয়ার দক্ষতা ও যোগাযোগ মূল্যায়ন করুন — আইনি ফলাফল নয় (BCI Rule 36)'
                  : '⚖️ Rate responsiveness and communication only — not legal outcome (BCI Rule 36)'}
              </div>

              {error && <div className="fb-error">{error}</div>}

              <div className="fb-actions">
                <button className="fb-skip" onClick={handleSkip} type="button">
                  {isBn ? 'এখনকে জন্য বাদ দিন' : 'Skip for now'}
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={rating === 0 || submitting}
                  onClick={handleSubmit}
                  type="button"
                >
                  {submitting
                    ? (isBn ? 'জমা হচ্ছে...' : 'Submitting...')
                    : (isBn ? 'জমা দিন' : 'Submit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
