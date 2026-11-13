'use client'

import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import {
  ShieldCheck, Lock, EyeOff, Zap, ArrowRight,
  Globe, Building, Fingerprint, Heart,
} from '@/app/components/icons'

export default function AboutClient() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppNav page="about" />

      {/* Hero header */}
      <div style={{
        background: 'var(--ink)', color: '#f4ede0',
        padding: '64px 24px 60px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position:'absolute',top:0,right:0,width:480,height:480,pointerEvents:'none', background:'radial-gradient(circle,rgba(20,72,232,.2) 0%,transparent 60%)' }} />
        <div aria-hidden style={{ position:'absolute',bottom:-100,left:-60,width:360,height:360,pointerEvents:'none', background:'radial-gradient(circle,rgba(10,158,114,.14) 0%,transparent 65%)' }} />
        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20,
            padding: '5px 12px', borderRadius: 999,
            background: 'rgba(10,158,114,.15)', border: '1px solid rgba(10,158,114,.3)',
            fontSize: 11.5, fontWeight: 500, color: '#4de6a8', letterSpacing: '.03em',
          }}>
            <ShieldCheck size={12} />
            Privacy-first infrastructure
          </div>
          <h1 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 400, letterSpacing: '-.045em', lineHeight: .92, marginBottom: 20, maxWidth: 640 }}>
            Financial truth,<br />without exposure.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(244,237,224,.6)', maxWidth: 500, lineHeight: 1.65, marginBottom: 36 }}>
            Vouch lets you prove financial facts — income, balance, runway — to anyone who needs
            to verify them, without ever showing your actual bank data.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/prove" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'var(--blue)', color: '#fff',
              padding: '12px 24px', borderRadius: 999, fontSize: 13.5, fontWeight: 500,
              boxShadow: '0 8px 24px -10px rgba(20,72,232,.55)',
              transition: 'transform .3s, box-shadow .3s',
            }}>
              Create a proof <ArrowRight size={12} />
            </Link>
            <Link href="/v" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              border: '1px solid rgba(244,237,224,.2)', color: 'rgba(244,237,224,.75)',
              padding: '12px 24px', borderRadius: 999, fontSize: 13.5, fontWeight: 500,
              transition: 'border-color .2s, color .2s',
            }}>
              Verify a proof
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Mission */}
        <section style={{ marginBottom: 56 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16,
          }}>
            {[
              {
                icon: <EyeOff size={20} />,
                iconColor: 'var(--blue)',
                iconBg: 'rgba(20,72,232,.1)',
                title: 'Zero data exposure',
                body: 'Your bank statement is processed entirely inside a hardware-sealed Trusted Execution Environment. Vouch\'s own servers cannot see your transactions — only the final verdict leaves the enclave.',
              },
              {
                icon: <ShieldCheck size={20} />,
                iconColor: 'var(--green)',
                iconBg: 'rgba(10,158,114,.1)',
                title: 'Cryptographic attestation',
                body: 'Every proof carries a hardware-signed attestation from an Intel TDX chip on NEAR AI Cloud. Anyone can verify the signature independently — no need to trust Vouch.',
              },
              {
                icon: <Lock size={20} />,
                iconColor: 'var(--amber)',
                iconBg: 'rgba(200,144,13,.1)',
                title: 'Minimum disclosure',
                body: 'Verifiers learn only what they need: pass or fail, the threshold, and the period. Transaction amounts, descriptions, and account numbers are never shared.',
              },
            ].map(({ icon, iconColor, iconBg, title, body }) => (
              <div key={title} style={{
                background: 'rgba(252,249,243,.88)',
                backdropFilter: 'blur(20px) saturate(130%)',
                border: '1px solid rgba(255,255,255,.65)',
                boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
                borderRadius: 20, padding: '24px',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 13,
                  background: iconBg, display: 'grid', placeItems: 'center',
                  color: iconColor, marginBottom: 16, flexShrink: 0,
                }}>
                  {icon}
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--ink)', marginBottom: 8 }}>{title}</h2>
                <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How TEE works */}
        <section style={{ marginBottom: 56 }}>
          <div style={{
            background: 'rgba(252,249,243,.88)',
            backdropFilter: 'blur(20px) saturate(130%)',
            border: '1px solid rgba(255,255,255,.65)',
            boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
            borderRadius: 20, padding: '32px 28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>How it works</p>
            </div>
            <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 400, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 12 }}>
              Hardware-sealed verification
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.65, maxWidth: 600, marginBottom: 32 }}>
              A Trusted Execution Environment (TEE) is a physically isolated region of a CPU chip. Code and data
              inside cannot be read or modified by anyone — including cloud operators, Vouch, or even the kernel.
              Every computation is signed by the chip itself.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {[
                { step: '01', label: 'Upload statement', detail: 'Sent over TLS directly into the TEE. Never touches Vouch\'s application code.' },
                { step: '02', label: 'NEAR AI classifies', detail: 'Model runs inside the enclave. Transactions are categorised without leaving hardware memory.' },
                { step: '03', label: 'Claim checked', detail: 'Arithmetic and threshold logic runs in code — model only classifies, never decides.' },
                { step: '04', label: 'Chip signs result', detail: 'The Intel TDX chip signs the verdict with a hardware key. The signature is unforgeable.' },
              ].map(({ step, label, detail }) => (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(20,72,232,.08)', border: '1px solid rgba(20,72,232,.14)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 10.5, fontWeight: 700, color: 'var(--blue)', letterSpacing: '.04em',
                  }}>{step}</div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy principles */}
        <section style={{ marginBottom: 56 }}>
          <div style={{
            background: 'linear-gradient(145deg,#0d1a0d,#0a160d)',
            borderRadius: 20, padding: '36px 32px', color: '#f4ede0', position: 'relative', overflow: 'hidden',
          }}>
            <div aria-hidden style={{ position:'absolute',top:0,right:0,width:300,height:300,pointerEvents:'none', background:'radial-gradient(circle,rgba(10,158,114,.18) 0%,transparent 65%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(77,230,168,.6)', marginBottom: 8 }}>Privacy principles</p>
              <h2 style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 400, letterSpacing: '-.04em', marginBottom: 24 }}>
                What we never do
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {[
                  'Store your bank statement or any transactions',
                  'Log amounts, descriptions, or account details',
                  'Share your data with third parties',
                  'Allow our servers to see inside the TEE',
                  'Follow instructions embedded in documents',
                  'Use your data to train any model',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: 'rgba(220,38,38,.2)', border: '1px solid rgba(220,38,38,.35)',
                      display: 'grid', placeItems: 'center',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                        <path d="M2 2l4 4M6 2L2 6" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(244,237,224,.7)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Built for */}
        <section style={{ marginBottom: 56 }}>
          <div style={{
            background: 'rgba(252,249,243,.88)',
            backdropFilter: 'blur(20px) saturate(130%)',
            border: '1px solid rgba(255,255,255,.65)',
            boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
            borderRadius: 20, padding: '32px 28px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 8 }}>Who uses Vouch</p>
            <h2 style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 400, letterSpacing: '-.04em', marginBottom: 24 }}>
              Built for trust-sensitive situations
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { icon: <Building size={18} />, iconC: 'var(--blue)', iconBg: 'rgba(20,72,232,.1)', label: 'Landlords & agencies', desc: 'Verify tenant income without seeing full bank history.' },
                { icon: <Zap size={18} />, iconC: 'var(--amber)', iconBg: 'rgba(200,144,13,.1)', label: 'Lenders & fintechs', desc: 'Assess creditworthiness with zero raw-data compliance risk.' },
                { icon: <Globe size={18} />, iconC: 'var(--green)', iconBg: 'rgba(10,158,114,.1)', label: 'Remote hiring', desc: 'Confirm contractor runway or company runway confidentially.' },
                { icon: <Fingerprint size={18} />, iconC: '#9b59b6', iconBg: 'rgba(155,89,182,.1)', label: 'DAO membership', desc: 'Prove skin-in-the-game without revealing exact holdings.' },
                { icon: <Heart size={18} />, iconC: '#e74c3c', iconBg: 'rgba(231,76,60,.1)', label: 'Community access', desc: 'Gate Discord roles or premium tiers behind verified thresholds.' },
                { icon: <ShieldCheck size={18} />, iconC: 'var(--ink-2)', iconBg: 'rgba(20,16,11,.06)', label: 'Compliance teams', desc: 'AML/KYB checks with provable data integrity, no raw PII.' },
              ].map(({ icon, iconC, iconBg, label, desc }) => (
                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: iconBg, display: 'grid', placeItems: 'center',
                    color: iconC, flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section style={{ marginBottom: 56 }}>
          <div style={{
            background: 'rgba(252,249,243,.88)',
            backdropFilter: 'blur(20px) saturate(130%)',
            border: '1px solid rgba(255,255,255,.65)',
            boxShadow: '0 4px 24px -12px rgba(20,16,11,.14), inset 0 1px 0 rgba(255,255,255,.8)',
            borderRadius: 20, padding: '28px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 20 }}>Powered by</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { name: 'NEAR AI Cloud', desc: 'OpenAI-compatible inference inside a hardware TEE', href: 'https://cloud.near.ai' },
                { name: 'Intel TDX', desc: 'Trusted Domain Extensions — CPU-level memory isolation', href: 'https://www.intel.com/content/www/us/en/developer/tools/trust-domain-extensions/overview.html' },
                { name: 'Next.js 15', desc: 'App Router with React Server Components', href: '#' },
                { name: 'Open source', desc: 'Vouch code is auditable — no black boxes', href: '#' },
              ].map(({ name, desc, href }) => (
                <a
                  key={name}
                  href={href}
                  target={href !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '14px 16px', borderRadius: 14,
                    background: 'rgba(20,16,11,.03)', border: '1px solid rgba(20,16,11,.07)',
                    transition: 'border-color .2s, background .2s',
                    textDecoration: 'none',
                  }}
                  className="hover:!border-[rgba(20,16,11,.16)] hover:!bg-[rgba(20,16,11,.05)]"
                >
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{name}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>{desc}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{
          background: 'var(--ink)', borderRadius: 20, padding: '44px 36px',
          position: 'relative', overflow: 'hidden', textAlign: 'center',
        }}>
          <div aria-hidden style={{ position:'absolute',top:0,right:0,width:300,height:300,pointerEvents:'none', background:'radial-gradient(circle,rgba(20,72,232,.2) 0%,transparent 65%)' }} />
          <div aria-hidden style={{ position:'absolute',bottom:-60,left:-30,width:240,height:240,pointerEvents:'none', background:'radial-gradient(circle,rgba(10,158,114,.14) 0%,transparent 65%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, letterSpacing: '-.04em', color: '#f4ede0', marginBottom: 12 }}>
              Ready to prove it?
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(244,237,224,.55)', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
              Upload a statement, configure a threshold, and get a shareable proof link in under a minute.
            </p>
            <Link href="/prove" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#f4ede0', color: 'var(--ink)',
              padding: '14px 28px', borderRadius: 999, fontSize: 14, fontWeight: 600,
              transition: 'transform .3s, box-shadow .3s',
            }}>
              Create a proof <ArrowRight size={13} />
            </Link>
          </div>
        </section>

      </main>
    </div>
  )
}
