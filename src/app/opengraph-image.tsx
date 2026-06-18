import { ImageResponse } from 'next/og';

// Dynamic social-share card (no static asset needed). Next.js auto-emits the
// og:image + twitter:image tags for every route from this root-level file, so a
// shared LegalLink link renders a branded card instead of a blank preview.
export const alt = 'LegalLink — Free AI Legal Help for West Bengal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#0b0d1a',
          backgroundImage:
            'radial-gradient(circle at 18% 0%, rgba(212,168,67,0.22), transparent 45%), radial-gradient(circle at 100% 100%, rgba(10,120,192,0.20), transparent 45%)',
          padding: '88px',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              width: 72,
              height: 72,
              borderRadius: 18,
              backgroundColor: '#d4a843',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0b0d1a',
              fontSize: 46,
              fontWeight: 800,
            }}
          >
            L
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em' }}>
            LegalLink
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 56,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            maxWidth: 980,
          }}
        >
          Free AI Legal Help for West Bengal
        </div>

        <div style={{ display: 'flex', marginTop: 32, fontSize: 32, color: '#c9cdd6' }}>
          Anonymous · English &amp; Bengali · Real statute citations · Bar-verified advocates
        </div>
      </div>
    ),
    { ...size },
  );
}
