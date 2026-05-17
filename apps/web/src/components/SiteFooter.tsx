import Link from 'next/link';

const cols = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features', badge: null },
      { label: 'Pricing', href: '/pricing', badge: null },
      { label: 'Integrations', href: '#', badge: null },
      { label: 'Changelog', href: '/changelog', badge: null },
      { label: 'Roadmap', href: '/roadmap', badge: null },
      { label: 'API Docs', href: '/api-docs', badge: null },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '#', badge: null },
      { label: 'Documentation', href: '/api-docs', badge: null },
      { label: 'Video Tutorials', href: '#', badge: null },
      { label: 'Community Forum', href: '#', badge: null },
      { label: 'FAQs', href: '/pricing#faq', badge: null },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy', badge: null },
      { label: 'Terms of Service', href: '/terms', badge: null },
      { label: 'Cookie Policy', href: '/policy', badge: null },
      { label: 'GDPR Compliance', href: '/gdpr-compliance', badge: null },
      { label: 'Security', href: '/security', badge: null },
      { label: 'Accessibility', href: '#', badge: null },
    ],
  },
];

const socials = [
  {
    label: 'X',
    href: 'https://x.com/arjav0112',
    icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    style: 'default',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/arjav0112',
    icon: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z',
    style: 'filled',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/arjav-jain21/',
    icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z',
    style: 'default',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/arjav0112/',
    icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
    style: 'default',
  },
];

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-white">
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 pt-12 pb-0 sm:px-6 lg:px-8">
        <div className="grid gap-12 border-t border-gray-100 pt-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)] lg:gap-16">
          {/* Brand */}
          <div className="max-w-[320px]">
            <Link href="/" className="mb-5 flex items-center gap-3">
              <img src="/ehr-icon.png" alt="EHR Copilot logo" className="h-10 w-10 flex-shrink-0 rounded-xl" />
              <span className="text-[17px] font-bold text-gray-900">EHR Copilot</span>
            </Link>
            <p className="mb-7 max-w-[280px] text-[13px] leading-[1.75] text-gray-500 sm:text-[14px]">
              Discover an AI-driven clinical documentation platform that helps teams document accurately and efficiently. This innovative solution uses artificial intelligence to simplify clinical workflows.
            </p>
            {/* Social icons */}
            <div className="flex flex-wrap gap-2.5">
              {socials.map(({ label, href, icon, style }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
                    style === 'filled'
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'border border-gray-200 text-gray-500 hover:border-black hover:bg-black hover:text-white'
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-10 lg:grid-cols-3">
            {cols.map(({ title, links }) => (
              <div key={title}>
                <h4 className="mb-4 text-[15px] font-semibold text-gray-900">{title}</h4>
                <ul className="space-y-3.5">
                  {links.map(({ label, href, badge }) => (
                    <li key={label} className="flex items-center gap-2">
                      <Link
                        href={href}
                        className="text-[13px] text-gray-400 transition-colors duration-200 hover:text-gray-700 sm:text-[14px]"
                      >
                        {label}
                      </Link>
                      {badge === 'soon' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                          Soon
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-gray-100 py-5 sm:flex-row sm:items-center">
          <p className="text-[12px] text-gray-400">© 2026 EHR Copilot Inc. All rights reserved.</p>
          <div className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-500 transition-colors hover:border-gray-300">
            <span>🇺🇸</span>
            <span>Prices in:</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
