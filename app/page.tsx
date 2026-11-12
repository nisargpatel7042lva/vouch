import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-sm text-green-700 font-medium">Powered by NEAR AI Cloud TEE</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
          Share the proof,<br />not the document.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Prove income, balance, or financial runway to landlords, lenders, or DAOs — without
          revealing your bank statements.
        </p>
        <Link
          href="/prove"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold text-lg px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          Create a Proof
        </Link>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              icon: '📄',
              title: 'Upload your statement',
              body: 'Drag-drop a bank statement PDF or CSV. Your raw data is never stored.',
            },
            {
              step: '2',
              icon: '🎯',
              title: 'Choose your claim',
              body: 'Select what to prove — income floor, balance floor, or financial runway.',
            },
            {
              step: '3',
              icon: '🔗',
              title: 'Share the link',
              body: 'Get a shareable link. Recipients see only the verdict, not your numbers.',
            },
          ].map(({ step, icon, title, body }) => (
            <div key={step} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Step {step}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-10 flex flex-wrap justify-center gap-8">
          {[
            { icon: '🔒', label: 'Zero raw data stored' },
            { icon: '🤖', label: 'NEAR AI Cloud TEE' },
            { icon: '✅', label: 'Cryptographic attestation' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
