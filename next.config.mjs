/** @type {import('next').NextConfig} */

// ── Security Headers ─────────────────────────────────────────────────────────
// These HTTP headers are sent with every response and tell browsers how to
// behave when loading Teramy's pages, significantly reducing the attack surface.
const securityHeaders = [
  // Prevent clickjacking: our pages must not be embedded in <iframe> on other sites
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },

  // Block MIME-type sniffing attacks
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Enable browser XSS filter (legacy browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },

  // Control what information is sent in the Referer header when navigating away
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Restrict which browser features this site can use
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },

  // Content Security Policy — only load resources from trusted origins
  // Adjust 'connect-src' if you add more third-party APIs in the future.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self + Next.js inline chunks (unsafe-inline needed by Next.js dev/prod)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com",
      // Styles: self + inline styles used by CSS-in-JS / Tailwind
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs (used by Next.js Image) + supabase storage
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://http2.mlstatic.com",
      // API calls: self + Supabase + Resend + MercadoPago
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.resend.com https://api.mercadopago.com",
      // Iframes: only MercadoPago checkout
      "frame-src https://*.mercadopago.com https://*.mercadopago.cl https://*.mercadolibre.com",
      // Everything else is blocked
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Upgrade HTTP to HTTPS automatically
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
