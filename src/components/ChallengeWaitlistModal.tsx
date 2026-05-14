// Branded waitlist modal — mirrors the Challenge widget design tokens
// (challenge/widget/src/design-system.js + challenge/widget/src/ui/modal.js).

const CHALLENGE_WAITLIST_URL = 'https://withchallenge.com'

const BRAND_GRADIENT = 'linear-gradient(90deg, #FF4848 16%, #FF59BA 55%, #72E2E6 86%)'
const MODAL_BG =
  'linear-gradient(135deg, rgba(255,72,72,0.03) 0%, rgba(255,89,186,0.02) 50%, rgba(114,226,230,0.05) 100%), rgba(20,20,20,0.85)'
const GLASS_BACKDROP_FILTER = 'blur(20px) saturate(150%)'
const MODAL_SHADOW =
  '0 24px 48px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)'

interface Props {
  open: boolean
  onClose: () => void
}

export function ChallengeWaitlistModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden border border-white/10"
        style={{
          width: '100%',
          maxWidth: 520,
          background: MODAL_BG,
          backdropFilter: GLASS_BACKDROP_FILTER,
          WebkitBackdropFilter: GLASS_BACKDROP_FILTER,
          boxShadow: MODAL_SHADOW,
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <img
            src="/challenge-wordmark-gradient.svg"
            alt="Challenge"
            style={{ height: 22, width: 'auto' }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute flex items-center justify-center transition cursor-pointer"
            style={{
              top: '50%',
              right: 24,
              transform: 'translateY(-50%)',
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              border: 'none',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="flex flex-col items-center text-center"
          style={{ padding: '32px 24px' }}
        >
          <h3
            className="mb-3"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: '-0.01em',
            }}
          >
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: BRAND_GRADIENT }}
            >
              Challenge isn't live yet
            </span>
          </h3>
          <p
            className="mb-7 max-w-sm"
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            Real-money matches are launching soon. Join the waitlist to be first in line.
          </p>

          <a
            href={CHALLENGE_WAITLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex active:translate-y-[2px] transition-transform"
            style={{
              padding: 3,
              borderRadius: 999,
              backgroundImage: BRAND_GRADIENT,
              boxShadow: '0 12px 24px -8px rgba(255, 89, 186, 0.35)',
            }}
          >
            <span
              className="text-white transition-colors group-hover:bg-transparent"
              style={{
                padding: '12px 28px',
                borderRadius: 999,
                background: '#1E1E1E',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: '0.2px',
              }}
            >
              Join Waitlist
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}
