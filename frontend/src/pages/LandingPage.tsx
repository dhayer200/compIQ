import { Link } from 'react-router-dom'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'

const features = [
  {
    title: 'Instant Comps',
    desc: 'Enter an address, get comparable sales within seconds. Our engine finds 3-7 best matches by distance, size, and recency.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    color: 'blue',
  },
  {
    title: 'Dollar Adjustments',
    desc: 'Automatic adjustments for sqft, beds, baths, lot size, age, distance, and market time — just like an appraiser.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'emerald',
  },
  {
    title: 'Rent Estimates',
    desc: 'Get estimated monthly rent, gross rent multiplier, and cap rate analysis for investment properties.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    color: 'violet',
  },
  {
    title: 'CMA Reports',
    desc: 'Auto-generated narrative reports with market context, adjustments breakdown, and professional formatting.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: 'amber',
  },
  {
    title: 'Batch Analysis',
    desc: 'Analyze up to 25 properties in one request. Perfect for portfolio reviews and market surveys.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    color: 'rose',
  },
  {
    title: 'PDF Export',
    desc: 'Download branded PDF reports ready to share with clients, lenders, or investment partners.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    color: 'cyan',
  },
]

const colorMap: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600' },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">cIQ</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              comp<span className="text-blue-600">IQ</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Show when="signed-out">
              <SignInButton>
                <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Log in
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Get Started
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link to="/app" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Dashboard
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Comps analysis for real estate professionals
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            Property valuations
            <br />
            <span className="text-blue-600">in seconds, not hours</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            Enter an address. Get comparable sales, dollar adjustments, rent estimates,
            and a full CMA report — powered by live market data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <SignUpButton>
              <button className="w-full sm:w-auto text-center bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors text-sm">
                Start Free — 5 analyses/month
              </button>
            </SignUpButton>
            <a
              href="#pricing"
              className="w-full sm:w-auto text-center border border-gray-200 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm"
            >
              View Pricing
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-gray-100 py-8 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-gray-400">
          <span className="font-medium text-gray-500">Powered by</span>
          <span>Real Estate API</span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span>Live MLS Data</span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span>7-Day Smart Cache</span>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Everything you need for comps analysis
            </h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">
              From raw address to polished CMA report — fully automated.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const c = colorMap[f.color]
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center mb-4 ${c.text}`}>
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-16">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Enter Address', desc: 'Type any US property address. We fetch property details, recent sales, and market data automatically.' },
              { step: '2', title: 'Engine Runs', desc: 'Our comps engine selects 3-7 best matches, calculates dollar adjustments, and produces a weighted estimate.' },
              { step: '3', title: 'Get Report', desc: 'Receive a complete CMA with value range, rent estimate, market context, and a downloadable PDF.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center mx-auto mb-4 text-sm">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="text-gray-500 mt-3">Start free, upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="font-semibold text-gray-900">Free</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-sm text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-3">Try compIQ with no commitment.</p>
              <ul className="mt-6 space-y-3">
                {['5 analyses per month', 'Full CMA reports', 'Rent estimates', 'PDF export'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
                {['Batch analysis', 'Cap rate analysis', 'Priority support'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <SignUpButton>
                <button className="block w-full text-center mt-8 border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                  Get Started
                </button>
              </SignUpButton>
            </div>

            {/* Pro */}
            <div className="bg-gray-900 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-blue-500 text-xs font-bold px-2.5 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="font-semibold">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-sm text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-400 mt-3">For agents and investors who run comps daily.</p>
              <ul className="mt-6 space-y-3">
                {[
                  'Unlimited analyses',
                  'Batch analysis (25 at once)',
                  'Full CMA reports',
                  'Rent + cap rate analysis',
                  'PDF export',
                  'Priority support',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-200">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <SignUpButton>
                <button className="block w-full text-center mt-8 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-500 transition-colors text-sm">
                  Start Pro Trial
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Stop spending hours on comps
          </h2>
          <p className="text-gray-400 mt-4 max-w-lg mx-auto">
            Join agents and investors who use compIQ to make faster, data-driven property decisions.
          </p>
          <SignUpButton>
            <button className="inline-block mt-8 bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-500 transition-colors text-sm">
              Get Started Free
            </button>
          </SignUpButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">cIQ</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              comp<span className="text-blue-600">IQ</span>
            </span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} compIQ. Not a licensed appraisal.
          </p>
        </div>
      </footer>
    </div>
  )
}
