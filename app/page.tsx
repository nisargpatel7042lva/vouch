import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-bold text-gray-900 text-lg tracking-tight">Vouch</Link>
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <Link href="/audit" className="hover:text-gray-900 transition-colors">Expense audit</Link>
            <Link href="/prove" className="hover:text-gray-900 transition-colors">Create proof</Link>
            <Link href="/my-proofs" className="hover:text-gray-900 transition-colors">My proofs</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-700 font-medium">Powered by NEAR AI Cloud Trusted Execution Environment</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Share the proof,<br />not the document.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
          Prove income, account balance, or financial runway to anyone — without
          handing over your bank statements. The result is verified by tamper-proof
          hardware, not just a promise.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/prove"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold text-lg px-8 py-3.5 rounded-xl transition-colors shadow-sm"
          >
            Create a Proof
          </Link>
          <a
            href="#how-it-works"
            className="inline-block border border-gray-300 hover:border-gray-400 text-gray-700 font-medium text-lg px-8 py-3.5 rounded-xl transition-colors"
          >
            How it works
          </a>
        </div>
      </section>

      {/* Real-world use cases */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Who uses Vouch</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Built for real situations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                scenario: 'Renting an apartment',
                ask: 'Landlord wants 3 months of bank statements',
                withVouch: 'Send a link that proves your income meets the threshold — nothing else.',
                icon: '🏠',
              },
              {
                scenario: 'Applying for a loan',
                ask: 'Lender needs proof of financial runway',
                withVouch: 'Share a verifiable fact: "runway ≥ 6 months" — no account numbers visible.',
                icon: '🏦',
              },
              {
                scenario: 'Joining a DAO or community',
                ask: 'Protocol requires proof of minimum balance',
                withVouch: 'Prove the balance floor on-chain without doxxing your wallet history.',
                icon: '🌐',
              },
            ].map(({ scenario, ask, withVouch, icon }) => (
              <div key={scenario} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{scenario}</h3>
                <p className="text-sm text-gray-500 mb-3 italic">"{ask}"</p>
                <p className="text-sm text-gray-700">{withVouch}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Process</p>
        <h2 className="text-3xl font-bold text-gray-900 mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '1',
              title: 'Upload',
              body: 'Drag-drop a CSV or PDF bank statement. It never leaves your session — no raw data is stored anywhere.',
            },
            {
              step: '2',
              title: 'Choose claim',
              body: 'Pick what to prove: income floor, balance floor, or financial runway. Set the threshold.',
            },
            {
              step: '3',
              title: 'TEE computes',
              body: 'NEAR AI Cloud\'s tamper-proof chip runs the analysis. Even Vouch\'s own servers cannot see the result before it\'s attested.',
            },
            {
              step: '4',
              title: 'Share the link',
              body: 'Get a link. Verifiers see only PASS/FAIL against the threshold you chose — nothing else.',
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="relative">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-sm mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEE explanation */}
      <section className="bg-gray-900 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">The innovation</p>
            <h2 className="text-3xl font-bold mb-6 leading-snug">Why a TEE makes this trustworthy</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              A Trusted Execution Environment (TEE) is a sealed compartment inside the processor chip.
              Code running inside a TEE is <strong className="text-white">physically isolated</strong> — the operating system,
              cloud provider, and even Vouch itself cannot read its memory or change its output.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              After the analysis runs, the chip produces a signed attestation report —
              a cryptographic receipt that proves: (1) the specific software that ran, (2) the nonce
              that ties it to this exact request, and (3) a hardware signature no one can forge.
            </p>
            <p className="text-gray-300 leading-relaxed">
              That receipt is what verifiers see. It means you can trust the verdict even if you have
              never met the prover — and even if you have no reason to trust Vouch.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: '🔐', title: 'Hardware-sealed', body: 'Intel TDX isolates computation at the chip level. No software override is possible.' },
              { icon: '🧾', title: 'Signed receipt', body: 'Every proof links to an attestation signed by the TEE\'s private key — unforgeable.' },
              { icon: '🔎', title: 'Independently verifiable', body: 'Anyone can check the signing address on NEAR AI Cloud\'s public registry.' },
              { icon: '🚫', title: 'No data stored', body: 'Raw transactions are classified in memory and discarded. Only the verdict persists.' },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex gap-4 bg-gray-800 rounded-xl p-4">
                <span className="text-2xl shrink-0">{icon}</span>
                <div>
                  <p className="font-semibold text-white text-sm mb-1">{title}</p>
                  <p className="text-gray-400 text-sm">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy table */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Privacy</p>
        <h2 className="text-3xl font-bold text-gray-900 mb-8">What verifiers see — and what they never do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <h3 className="font-bold text-green-800 mb-4">What they see</h3>
            <ul className="space-y-2 text-sm text-green-900">
              {[
                'PASS or FAIL verdict',
                'The claim threshold (e.g., "income ≥ $3,000")',
                'Period covered (month range)',
                'NEAR AI attestation receipt',
              ].map(item => (
                <li key={item} className="flex gap-2 items-start">
                  <span className="text-green-600 font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h3 className="font-bold text-red-800 mb-4">What they never see</h3>
            <ul className="space-y-2 text-sm text-red-900">
              {[
                'Your bank statements or PDFs',
                'Individual transaction amounts',
                'Account numbers or bank name',
                'Exact income or balance figures',
              ].map(item => (
                <li key={item} className="flex gap-2 items-start">
                  <span className="text-red-600 font-bold">✗</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to prove it?</h2>
        <p className="text-green-100 mb-8 text-lg max-w-xl mx-auto">
          Upload a bank statement and get a shareable proof link in under a minute.
        </p>
        <Link
          href="/prove"
          className="inline-block bg-white text-green-700 hover:bg-green-50 font-bold text-lg px-10 py-4 rounded-xl transition-colors shadow-md"
        >
          Create your first proof
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-500">
        <p>Built for the NEAR Hackathon · <a href="https://near.ai" className="underline hover:text-gray-700">NEAR AI Cloud</a></p>
      </footer>

    </main>
  )
}
