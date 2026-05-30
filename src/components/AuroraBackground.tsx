/**
 * A living, drifting aurora made of soft blurred color blobs over a deep
 * twilight base. Purely decorative; sits fixed behind all content.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-night-900">
      {/* Base vertical wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% -10%, #2a1450 0%, #1a0b2e 45%, #120726 100%)',
        }}
      />

      {/* Drifting color blobs */}
      <div
        className="absolute -top-40 -left-32 h-[42rem] w-[42rem] rounded-full blur-[90px]"
        style={{
          background:
            'radial-gradient(circle, rgba(180,120,255,0.55), transparent 65%)',
          animation: 'drift 26s var(--ease-soft) infinite',
        }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[40rem] w-[40rem] rounded-full blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, rgba(255,143,177,0.42), transparent 65%)',
          animation: 'drift 32s var(--ease-soft) infinite reverse',
        }}
      />
      <div
        className="absolute -bottom-52 left-1/4 h-[44rem] w-[44rem] rounded-full blur-[110px]"
        style={{
          background:
            'radial-gradient(circle, rgba(90,209,255,0.30), transparent 65%)',
          animation: 'drift 38s var(--ease-soft) infinite',
        }}
      />
      <div
        className="absolute top-10 left-1/2 h-[30rem] w-[30rem] rounded-full blur-[90px]"
        style={{
          background:
            'radial-gradient(circle, rgba(255,213,107,0.22), transparent 65%)',
          animation: 'drift 30s var(--ease-soft) infinite reverse',
        }}
      />

      {/* Fine grain to avoid banding on the gradients */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
