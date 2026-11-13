'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import {
  VouchMark, ShieldCheck, ArrowRight, TEEIcon,
  Home, Building, Globe, Briefcase,
  UploadCloud, TrendingUp, Fingerprint, ExternalLink,
  Lock, FileText, EyeOff,
} from './components/icons'

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeClient() {
  useEffect(() => {
    document.documentElement.classList.add('js')

    // ── Lenis smooth scroll ─────────────────────────────────────────
    let lenisCleanup: (() => void) | null = null
    import('lenis').then(({ default: Lenis }) => {
      const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 })
      let rafId = 0
      const raf = (time: number) => {
        lenis.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)
      lenisCleanup = () => { cancelAnimationFrame(rafId); lenis.destroy() }
    })

    // ── Nav frosted on scroll ───────────────────────────────────────
    const nav = document.getElementById('v-nav')
    const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // ── Split headings ──────────────────────────────────────────────
    document.querySelectorAll('[data-split]').forEach(el => {
      let i = 0
      const walk = (node: Node) => {
        ;[...node.childNodes].forEach(n => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment()
            ;(n.textContent ?? '').split(/(\s+)/).forEach(part => {
              if (!part) return
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return }
              const w = document.createElement('span'); w.className = 'w'
              const s = document.createElement('span'); s.textContent = part
              s.style.setProperty('--i', String(i++))
              w.appendChild(s); frag.appendChild(w)
            })
            n.replaceWith(frag)
          } else if (n.nodeType === 1 && (n as Element).tagName !== 'BR') {
            walk(n)
          }
        })
      }
      walk(el)
    })

    // ── Scroll reveals ──────────────────────────────────────────────
    const targets = document.querySelectorAll<HTMLElement>('.rv, [data-split]')
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement
          el.classList.add('in')
          // Count-up numbers
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(c => countUp(c))
          // Gauge arc
          if (el.id === 'gauge-card') {
            const arc = document.getElementById('g-arc')
            if (arc) arc.style.strokeDashoffset = String(252 * (1 - 0.94))
          }
          // Progress bars
          el.querySelectorAll('.prog-bar').forEach(p => p.classList.add('in'))
          io.unobserve(el)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' })
    targets.forEach(el => io.observe(el))

    const sweep = () => targets.forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.top < innerHeight * .95 && r.bottom > 0) {
        el.classList.add('in')
        el.querySelectorAll<HTMLElement>('[data-count]').forEach(c => countUp(c))
        el.querySelectorAll('.prog-bar').forEach(p => p.classList.add('in'))
      }
    })
    requestAnimationFrame(() => requestAnimationFrame(sweep))
    window.addEventListener('load', sweep)

    // ── Count-up ────────────────────────────────────────────────────
    function countUp(el: HTMLElement) {
      if (el.dataset.counted) return
      el.dataset.counted = '1'
      const end = parseFloat(el.dataset.count ?? '0')
      const dec = String(end).includes('.') ? (String(end).split('.')[1] ?? '').length : 0
      const dur = 1800
      const t0 = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur)
        const v = end * (1 - Math.pow(1 - p, 4))
        el.textContent = v.toFixed(dec)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    // ── Hero proof demo animation ───────────────────────────────────
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

    async function typeInto(container: Element | null, text: string, speed = 16) {
      if (!container) return
      const ghost = container.querySelector<HTMLElement>('.ghost')
      const live = container.querySelector<HTMLElement>('.live')
      if (!ghost || !live) return
      ghost.textContent = text
      live.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'
      await wait(600)
      live.textContent = ''
      let k = 0
      await new Promise<void>(res => {
        const step = () => { k += 2; live.textContent = text.slice(0, k); if (k < text.length) { setTimeout(step, speed) } else { res() } }
        step()
      })
    }

    async function runDemo() {
      await wait(1600)
      const msgs = document.querySelectorAll('.demo-msg')
      for (const msg of msgs) {
        msg.classList.add('show')
        const t = msg.querySelector('.ai-t')
        if (t) {
          await typeInto(t, t.getAttribute('data-text') ?? '')
        } else {
          await wait(400)
        }
      }
      // Animate proof card and bar
      document.getElementById('demo-card')?.classList.add('in')
      document.querySelector('.prog-bar')?.classList.add('in')
    }

    // Init ai-t ghost/live spans
    document.querySelectorAll('.ai-t').forEach(el => {
      const text = el.getAttribute('data-text') ?? ''
      el.innerHTML = `<span class="ghost"></span><span class="live"></span>`
      const ghost = el.querySelector<HTMLElement>('.ghost')
      if (ghost) ghost.textContent = text
    })

    runDemo()

    // ── Cycling headline words ──────────────────────────────────────
    const cycleContainer = document.getElementById('cycle-container')
    if (cycleContainer) {
      const spans = Array.from(cycleContainer.querySelectorAll<HTMLElement>('.cycle-word'))
      let cycleIdx = 0

      // Container is sized by the hidden spacer span — no width override needed
      spans[0].classList.add('active')

      setInterval(() => {
        spans[cycleIdx].classList.remove('active')
        spans[cycleIdx].classList.add('leaving')
        const prev = cycleIdx
        setTimeout(() => spans[prev].classList.remove('leaving'), 700)
        cycleIdx = (cycleIdx + 1) % spans.length
        spans[cycleIdx].classList.add('active')
      }, 2200)
    }

    // ── Anchor smooth scroll ────────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href')
        if (!id || id.length < 2) return
        const target = document.querySelector(id)
        if (!target) return
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('load', sweep)
      io.disconnect()
      lenisCleanup?.()
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <header
        id="v-nav"
        style={{
          position: 'fixed', inset: '0 0 auto 0', zIndex: 50,
          padding: '16px 0',
          transition: 'background .45s var(--ease), padding .45s var(--ease), box-shadow .45s var(--ease)',
        }}
        className="[&.scrolled]:bg-[rgba(240,235,224,.82)] [&.scrolled]:backdrop-blur-xl [&.scrolled]:![padding-top:10px] [&.scrolled]:![padding-bottom:10px] [&.scrolled]:shadow-[0_1px_0_var(--border)]"
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500, fontSize: 18, letterSpacing: '-.03em' }}>
            <VouchMark size={30} />
            Vouch
          </Link>

          {/* Centre links */}
          <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }} className="hidden sm:flex">
            {[['#how-it-works', 'How it works'], ['#use-cases', 'Use cases'], ['/audit', 'Expense audit'], ['/about', 'About']].map(([href, label]) => (
              <a key={label} href={href}
                style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 13,
                  color: 'var(--ink-2)', fontWeight: 500,
                  transition: 'background .3s, color .3s',
                }}
                className="hover:bg-black/[.06] hover:!text-[var(--ink)]"
              >{label}</a>
            ))}
          </nav>

          {/* Right CTAs */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/v"
              style={{
                padding: '9px 18px', borderRadius: 999, fontSize: 13,
                fontWeight: 500, border: '1px solid var(--border)',
                color: 'var(--ink-2)',
                transition: 'border-color .3s, color .3s',
              }}
              className="hidden sm:block hover:border-[rgba(20,16,11,.22)] hover:!text-[var(--ink)]"
            >Verify a proof</Link>
            <Link href="/prove"
              style={{
                padding: '10px 22px', borderRadius: 999, fontSize: 13,
                fontWeight: 500, background: 'var(--ink)', color: '#f4ede0',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                position: 'relative', overflow: 'hidden',
                transition: 'transform .3s var(--ease), box-shadow .3s var(--ease)',
              }}
              className="group hover:shadow-[0_10px_26px_-10px_rgba(20,16,11,.55)] hover:-translate-y-px"
            >
              Create proof
              <ArrowRight />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 108,
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Grain overlay */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E")`,
          opacity: .6,
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 64px', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}
            className="grid-cols-1 lg:!grid-cols-[1fr_1fr]">

            {/* Left: headline + CTAs */}
            <div>
              {/* Eyebrow */}
              <div className="rv" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(10,158,114,.1)', border: '1px solid rgba(10,158,114,.22)',
                borderRadius: 999, padding: '6px 14px', marginBottom: 28,
                fontSize: 12, fontWeight: 500, color: 'var(--green)',
                letterSpacing: '.03em',
              }}>
                <ShieldCheck size={14} />
                NEAR AI Cloud · TEE Verified
              </div>

              {/* Headline */}
              <h1 className="h-display" style={{ '--base': '100ms' } as React.CSSProperties}>
                {/* Line 1: cycling word (simple fade-in) */}
                <span className="rv" style={{ '--base': '100ms', display: 'block' } as React.CSSProperties}>
                  Prove{' '}
                  <span id="cycle-container" className="accent-word"
                    style={{ position: 'relative', display: 'inline-block', verticalAlign: 'baseline' }}>
                    {/* Invisible spacer — widest word anchors container width & height */}
                    <span style={{ visibility: 'hidden', userSelect: 'none', display: 'inline-block' }} aria-hidden>balance</span>
                    <span className="cycle-word">income</span>
                    <span className="cycle-word">balance</span>
                    <span className="cycle-word">runway</span>
                  </span>
                </span>
                {/* Line 2: word-by-word reveal */}
                <span className="split rv" data-split
                  style={{ '--base': '260ms', display: 'block' } as React.CSSProperties}>
                  without sharing it.
                </span>
              </h1>

              {/* Sub */}
              <p className="rv" style={{
                '--base': '500ms',
                marginTop: 24, fontSize: 'clamp(15px,1.4vw,18px)',
                color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55,
              } as React.CSSProperties}>
                Upload a bank statement. Vouch runs the analysis inside a hardware-sealed
                enclave — your data never leaves the chip. Share the verdict link, nothing else.
              </p>

              {/* CTAs */}
              <div className="rv" style={{
                '--base': '650ms',
                display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 36,
              } as React.CSSProperties}>
                <Link href="/prove" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'var(--blue)', color: '#fff',
                  padding: '13px 28px', borderRadius: 999,
                  fontSize: 14, fontWeight: 500, letterSpacing: '-.01em',
                  transition: 'transform .3s var(--ease), box-shadow .3s var(--ease)',
                }}
                  className="hover:-translate-y-px hover:shadow-[0_14px_32px_-12px_rgba(20,72,232,.55)]">
                  Create a proof
                  <ArrowRight size={13} />
                </Link>
                <Link href="/audit" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  border: '1px solid var(--border)', color: 'var(--ink-2)',
                  padding: '13px 24px', borderRadius: 999,
                  fontSize: 14, fontWeight: 500,
                  transition: 'border-color .3s, color .3s',
                }}
                  className="hover:border-[rgba(20,16,11,.22)] hover:!text-[var(--ink)]">
                  Expense audit
                </Link>
              </div>
            </div>

            {/* Right: animated glass proof demo */}
            <div className="rv rv-scale" style={{
              '--base': '750ms',
              borderRadius: 28,
              overflow: 'hidden',
              background: 'rgba(236,230,220,.55)',
              backdropFilter: 'blur(28px) saturate(130%)',
              border: '1px solid var(--glass-b)',
              boxShadow: '0 36px 72px -40px rgba(20,16,11,.38), inset 0 1px 0 rgba(255,255,255,.65)',
              display: 'grid',
              gridTemplateColumns: '1.55fr 1fr',
              minHeight: 440,
            } as React.CSSProperties}>

              {/* Chat column */}
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Header */}
                <div className="demo-msg" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
                  color: '#4b3a2f', textTransform: 'uppercase',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6,
                    background: 'var(--bg)', display: 'grid', placeItems: 'center',
                  }}>
                    <VouchMark size={14} />
                  </div>
                  New Proof Request
                </div>

                {/* User request */}
                <div className="bubble demo-msg">
                  Prove my monthly income is ≥&nbsp;$3,000 for the last 3 months.
                </div>

                {/* TEE processing */}
                <div className="ai-msg demo-msg" style={{ gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 7,
                      background: 'rgba(20,72,232,.1)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      <TEEIcon size={13} />
                    </div>
                    <span style={{ fontSize: 10.5, letterSpacing: '.04em', color: 'var(--blue)', fontWeight: 600 }}>
                      NEAR AI CLOUD · TEE
                    </span>
                  </div>
                  <div className="ai-t"
                    data-text="Analyzing 47 transactions in a hardware-sealed enclave. Zero data leaves the chip — only the verdict can exit."
                  />
                </div>

                {/* Follow-up */}
                <div className="bubble demo-msg" style={{ '--d': '1' } as React.CSSProperties}>
                  Show me the attestation receipt.
                </div>

                {/* Result */}
                <div className="ai-msg demo-msg">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 7,
                      background: 'rgba(10,158,114,.1)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      <ShieldCheck size={13} />
                    </div>
                    <span style={{ fontSize: 10.5, letterSpacing: '.04em', color: 'var(--green)', fontWeight: 600 }}>
                      8/8 CHECKS PASSED
                    </span>
                  </div>
                  <div className="ai-t"
                    data-text="Intel TDX signature verified. Proof ID a3f8…c221 is ready. Share the link — the verifier sees only PASS."
                  />
                </div>

                {/* Bottom */}
                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                  <div style={{
                    background: 'var(--bg)', borderRadius: 12, padding: '10px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '.06em', color: '#7a655a', fontWeight: 600, textTransform: 'uppercase' }}>Income Floor</div>
                      <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.03em', marginTop: 2 }}>≥ $3,000 / month</div>
                    </div>
                    <div style={{
                      padding: '5px 12px', borderRadius: 999,
                      background: 'rgba(10,158,114,.12)', border: '1px solid rgba(10,158,114,.25)',
                      color: 'var(--green)', fontSize: 12, fontWeight: 600, letterSpacing: '.04em',
                    }}>PASS</div>
                  </div>
                </div>
              </div>

              {/* Proof card column */}
              <div style={{
                padding: 14,
                borderLeft: '1px solid rgba(255,255,255,.45)',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div className="demo-msg" style={{ fontSize: 11, letterSpacing: '.05em', color: '#4b3a2f', fontWeight: 600 }}>
                  PROOF CARD
                </div>

                {/* Card */}
                <div id="demo-card"
                  className="proof-card-anim demo-msg"
                  style={{
                    flex: 1, borderRadius: 16, overflow: 'hidden',
                    background: 'var(--ink)', color: '#f4ede0',
                    padding: 16, display: 'flex', flexDirection: 'column',
                    minHeight: 180,
                  }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}>
                    <VouchMark size={22} />
                    <span style={{
                      padding: '4px 10px', borderRadius: 999,
                      background: 'rgba(10,158,114,.25)', border: '1px solid rgba(10,158,114,.4)',
                      color: '#4de6a8', fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                    }}>PASS</span>
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.05em', color: 'rgba(244,237,224,.5)', textTransform: 'uppercase' }}>Income Floor</div>
                    <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-.02em', marginTop: 3 }}>≥ $3,000 / mo</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(244,237,224,.55)', marginTop: 6 }}>Jul – Sep 2026 · 8/8 checks ✓</div>
                    <div style={{
                      marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,.07)', cursor: 'pointer',
                    }}>
                      <div style={{ flex: 1, fontSize: 9, color: 'rgba(244,237,224,.4)', letterSpacing: '.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        vouch.app/v/a3f8c221…
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(244,237,224,.55)', flexShrink: 0 }}>Copy</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--ink)', color: '#f4ede0',
        padding: '36px 24px',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24, textAlign: 'center',
        }} className="grid-cols-1 sm:!grid-cols-3">
          {[
            { n: '8', unit: '/8', label: 'TEE attestation checks', desc: 'All pass, every request' },
            { n: '0', unit: ' bytes', label: 'Raw data ever stored', desc: 'Transactions discarded after analysis' },
            { n: '< 60', unit: 's', label: 'Proof generation time', desc: 'Faster than emailing a PDF' },
          ].map(({ n, unit, label, desc }) => (
            <div key={label} className="rv" style={{ padding: '8px 0' }}>
              <div style={{ fontSize: 'clamp(36px,4vw,52px)', fontWeight: 300, letterSpacing: '-.06em', lineHeight: 1 }}>
                <span data-count={n.replace('< ', '')}>{n.startsWith('<') ? '< 0' : '0'}</span>
                <span style={{ fontSize: '0.5em', opacity: .6 }}>{unit}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, letterSpacing: '-.01em' }}>{label}</div>
              <div style={{ fontSize: 12, opacity: .45, marginTop: 3 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="rv" style={{
              display: 'inline-block',
              fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
              color: 'var(--ink-2)', fontWeight: 600, marginBottom: 12,
            }}>The process</span>
            <h2 className="h2 split rv" data-split style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
              From upload to<br /><span className="lt">shareable proof</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, position: 'relative' }}
            className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4">
            {([
              {
                n: '01', title: 'Upload statement',
                body: 'Drop a CSV or PDF bank statement. It\'s read in memory — never written to disk or logged anywhere.',
                icon: <UploadCloud size={20} />, color: 'rgba(20,72,232,.1)', iconColor: 'var(--blue)',
              },
              {
                n: '02', title: 'Choose your claim',
                body: 'Set what you need to prove: income floor, account balance, or financial runway. Set the threshold.',
                icon: <TrendingUp size={20} />, color: 'rgba(10,158,114,.1)', iconColor: 'var(--green)',
              },
              {
                n: '03', title: 'TEE verifies',
                body: 'NEAR AI Cloud\'s Intel TDX enclave classifies transactions and computes the verdict in hardware-sealed memory.',
                icon: <Fingerprint size={20} />, color: 'rgba(200,144,13,.1)', iconColor: 'var(--amber)',
              },
              {
                n: '04', title: 'Share the link',
                body: 'Get a permanent, verifiable link. The viewer sees only PASS/FAIL and the threshold — your data never appears.',
                icon: <ExternalLink size={20} />, color: 'rgba(20,72,232,.1)', iconColor: 'var(--blue)',
              },
            ] as Array<{ n: string; title: string; body: string; icon: React.ReactNode; color: string; iconColor: string }>).map(({ n, title, body, icon, color, iconColor }, i) => (
              <div key={n} className="rv bento-card" style={{
                '--d': String(i + 1),
                background: 'var(--glass)', backdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-b)',
                borderRadius: 22, padding: '24px 22px',
                boxShadow: '0 2px 20px -12px rgba(20,16,11,.2), inset 0 1px 0 rgba(255,255,255,.65)',
              } as React.CSSProperties}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: color, display: 'grid', placeItems: 'center',
                  marginBottom: 16, color: iconColor,
                }}>{icon}</div>
                <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-2)', fontWeight: 600, marginBottom: 8 }}>{n}</div>
                <h3 style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.02em', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES BENTO ──────────────────────────────────────────── */}
      <section id="use-cases" style={{ padding: '0 24px 100px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <span className="rv" style={{
              display: 'inline-block', fontSize: 11, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'var(--ink-2)', fontWeight: 600, marginBottom: 12,
            }}>Who uses Vouch</span>
            <h2 className="h2 split rv" data-split>
              Real situations,<br /><span className="lt">real proof</span>
            </h2>
          </div>

          {/* Bento grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 14 }}
            className="!grid-cols-1 md:!grid-cols-2 lg:!grid-cols-[1.3fr_1fr_1fr]">

            {/* Big card */}
            <div className="rv bento-card" style={{
              '--d': '1',
              gridRow: 'span 2',
              borderRadius: 26, overflow: 'hidden', position: 'relative',
              minHeight: 460, padding: 28,
              background: 'var(--ink)', color: '#f4ede0',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            } as React.CSSProperties}>
              {/* Background gradient */}
              <div aria-hidden style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'linear-gradient(145deg, #1a130d 0%, #2a1e14 40%, #1a1510 100%)',
              }} />
              <div aria-hidden style={{
                position: 'absolute', bottom: 0, right: 0, width: 300, height: 300, zIndex: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(20,72,232,.18) 0%, transparent 70%)',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20,
                  padding: '5px 12px', borderRadius: 999,
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                  fontSize: 11, fontWeight: 500, letterSpacing: '.03em',
                }}>
                  <Home size={12} />
                  Rental applications
                </div>
                <h3 style={{ fontSize: 'clamp(24px,2.4vw,34px)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-.04em' }}>
                  My landlord asked<br />for bank statements.<br />
                  <span style={{ opacity: .55 }}>I sent a proof link instead.</span>
                </h3>
                <p style={{ marginTop: 14, fontSize: 13, opacity: .7, maxWidth: 300, lineHeight: 1.5 }}>
                  The landlord sees one fact: income meets the requirement. Nothing else.
                </p>
              </div>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '.06em', opacity: .5, textTransform: 'uppercase' }}>Income Floor</div>
                    <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-.02em', marginTop: 2 }}>≥ $3,500 / month ✓</div>
                  </div>
                  <div style={{
                    padding: '5px 12px', borderRadius: 999,
                    background: 'rgba(10,158,114,.2)', color: '#4de6a8',
                    fontSize: 11, fontWeight: 700, letterSpacing: '.05em',
                  }}>PASS</div>
                </div>
                <Link href="/prove" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 10, padding: '12px', borderRadius: 999,
                  background: 'rgba(255,255,255,.12)', fontSize: 13, fontWeight: 500,
                  transition: 'background .3s',
                }}
                  className="hover:bg-[rgba(255,255,255,.18)]">
                  Try Vouch now
                </Link>
              </div>
            </div>

            {/* Loan card */}
            <div className="rv bento-card" style={{
              '--d': '2',
              borderRadius: 22, padding: 22,
              background: 'var(--glass)', backdropFilter: 'blur(22px)',
              border: '1px solid var(--glass-b)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.65), 0 2px 20px -12px rgba(20,16,11,.18)',
            } as React.CSSProperties}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(20,72,232,.08)', display: 'grid', placeItems: 'center', marginBottom: 12, color: 'var(--blue)' }}>
                <Building size={18} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.02em' }}>Loan applications</h4>
              <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Prove financial runway ≥ 6 months without exposing account numbers or exact balances.
              </p>
              <div style={{
                marginTop: 16, padding: '10px 12px', borderRadius: 12,
                background: 'rgba(20,72,232,.07)', border: '1px solid rgba(20,72,232,.14)',
              }}>
                <div style={{ fontSize: 10, letterSpacing: '.06em', color: 'var(--blue)', fontWeight: 600 }}>RUNWAY PROOF</div>
                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-.02em', marginTop: 3 }}>≥ 6 months cash runway</div>
              </div>
            </div>

            {/* DAO card */}
            <div className="rv bento-card" style={{
              '--d': '3',
              borderRadius: 22, padding: 22,
              background: 'var(--glass)', backdropFilter: 'blur(22px)',
              border: '1px solid var(--glass-b)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.65), 0 2px 20px -12px rgba(20,16,11,.18)',
            } as React.CSSProperties}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(10,158,114,.08)', display: 'grid', placeItems: 'center', marginBottom: 12, color: 'var(--green)' }}>
                <Globe size={18} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.02em' }}>DAO membership</h4>
              <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Prove a minimum wallet balance on-chain without doxxing your address history or exact holdings.
              </p>
              <div id="gauge-card" className="rv" style={{
                '--d': '4',
                marginTop: 14, position: 'relative',
              } as React.CSSProperties}>
                <svg viewBox="0 0 180 114" style={{ width: '100%', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="gg" x1="0" x2="1">
                      <stop offset="0%" stopColor="var(--blue)" />
                      <stop offset="100%" stopColor="var(--green)" />
                    </linearGradient>
                  </defs>
                  {/* Track */}
                  <path d="M10 95 A80 80 0 0 1 170 95" stroke="rgba(20,16,11,.08)" strokeWidth="10" strokeLinecap="round" fill="none" />
                  {/* Fill arc */}
                  <path id="g-arc" d="M10 95 A80 80 0 0 1 170 95" stroke="url(#gg)" strokeWidth="10" strokeLinecap="round" fill="none"
                    strokeDasharray="252" strokeDashoffset="252" />
                  {/* Center value */}
                  <text x="90" y="85" textAnchor="middle" fontFamily="inherit" fontWeight="300" fontSize="22" letterSpacing="-1" fill="var(--ink)">
                    <tspan data-count="94">0</tspan><tspan fontSize="13" opacity=".6">%</tspan>
                  </text>
                  <text x="90" y="98" textAnchor="middle" fontFamily="inherit" fontSize="8" fill="var(--ink-2)" opacity=".6">threshold met</text>
                  {/* Min / Max labels at arc endpoints */}
                  <text x="10" y="112" textAnchor="middle" fontFamily="inherit" fontSize="9" fill="var(--ink-2)" opacity=".55">Min</text>
                  <text x="170" y="112" textAnchor="middle" fontFamily="inherit" fontSize="9" fill="var(--ink-2)" opacity=".55">Max</text>
                </svg>
              </div>
            </div>

            {/* HR / Freelance card */}
            <div className="rv bento-card" style={{
              '--d': '4',
              borderRadius: 22, padding: 22,
              background: 'var(--glass)', backdropFilter: 'blur(22px)',
              border: '1px solid var(--glass-b)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.65), 0 2px 20px -12px rgba(20,16,11,.18)',
            } as React.CSSProperties}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(200,144,13,.08)', display: 'grid', placeItems: 'center', marginBottom: 12, color: 'var(--amber)' }}>
                <Briefcase size={18} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.02em' }}>Freelance &amp; HR</h4>
              <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Prove consistent monthly income to clients, recruiters, or platforms — without sending full statements.
              </p>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Income verified', 'Professional', 'TEE attested'].map(label => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                    color: 'var(--ink-2)',
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEE DEEP DIVE ─────────────────────────────────────────────── */}
      <section style={{ background: '#0d0b08', color: '#f1ebe0', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}
          className="!grid-cols-1 lg:!grid-cols-2">
          <div>
            <span className="rv" style={{
              '--base': '0ms',
              display: 'inline-block', fontSize: 11, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'var(--blue)', fontWeight: 600, marginBottom: 14,
            } as React.CSSProperties}>The innovation</span>
            <h2 className="rv h2 split" data-split
              style={{ '--base': '50ms', color: '#f1ebe0' } as React.CSSProperties}>
              Why you can<br /><span style={{ color: 'rgba(241,235,224,.4)', fontWeight: 300 }}>trust this</span>
            </h2>
            <p className="rv" style={{
              '--d': '2', marginTop: 20,
              color: 'rgba(241,235,224,.55)', lineHeight: 1.6, maxWidth: 440, fontSize: 14,
            } as React.CSSProperties}>
              A Trusted Execution Environment (TEE) is a sealed compartment inside the processor chip.
              Code running inside is{' '}
              <strong style={{ color: '#f1ebe0' }}>physically isolated</strong> — the cloud provider,
              operating system, and even Vouch itself cannot read its memory or alter its output.
            </p>
            <p className="rv" style={{
              '--d': '3', marginTop: 14,
              color: 'rgba(241,235,224,.55)', lineHeight: 1.6, maxWidth: 440, fontSize: 14,
            } as React.CSSProperties}>
              After analysis runs, the chip signs an attestation report — a cryptographic receipt proving
              the exact software that ran, the nonce tying it to your request, and a hardware signature
              no one can forge.
            </p>

            {/* Attestation badge */}
            <div className="rv" style={{
              '--d': '4', marginTop: 28,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 18px', borderRadius: 999,
              background: 'rgba(10,158,114,.12)', border: '1px solid rgba(10,158,114,.25)',
              color: '#4de6a8', fontSize: 13, fontWeight: 500,
            } as React.CSSProperties}>
              <ShieldCheck size={15} />
              Signing address: <code style={{ fontFamily: 'monospace', opacity: .8 }}>0xb98a…e779</code>
            </div>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              {
                icon: <Lock size={18} />, iconBg: 'rgba(20,72,232,.15)', iconColor: '#6b96f6',
                title: 'Hardware-sealed computation',
                body: 'Intel TDX isolates computation at the chip level. No software override is possible.',
                d: 1,
              },
              {
                icon: <FileText size={18} />, iconBg: 'rgba(10,158,114,.15)', iconColor: '#4de6a8',
                title: 'Signed attestation receipt',
                body: 'Every proof links to a receipt signed by the TEE\'s private key — mathematically unforgeable.',
                d: 2,
              },
              {
                icon: <ShieldCheck size={18} />, iconBg: 'rgba(10,158,114,.15)', iconColor: '#4de6a8',
                title: 'Independently verifiable',
                body: 'Anyone can check the signing address on NEAR AI Cloud\'s public registry without trusting Vouch.',
                d: 3,
              },
              {
                icon: <EyeOff size={18} />, iconBg: 'rgba(200,144,13,.15)', iconColor: '#f0bc50',
                title: 'Zero data retention',
                body: 'Raw transactions are classified in memory and discarded. Only the verdict is stored.',
                d: 4,
              },
            ] as Array<{ icon: React.ReactNode; iconBg: string; iconColor: string; title: string; body: string; d: number }>).map(({ icon, iconBg, iconColor, title, body, d }) => (
              <div key={title} className="rv bento-card" style={{
                '--d': String(d),
                display: 'flex', gap: 14, alignItems: 'flex-start',
                background: 'rgba(255,255,255,.04)', borderRadius: 16, padding: '16px 18px',
                border: '1px solid rgba(255,255,255,.07)',
              } as React.CSSProperties}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'grid', placeItems: 'center', flexShrink: 0, color: iconColor }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14, letterSpacing: '-.01em' }}>{title}</p>
                  <p style={{ color: 'rgba(241,235,224,.5)', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY COMPARISON ───────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <span className="rv" style={{
              display: 'inline-block', fontSize: 11, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'var(--ink-2)', fontWeight: 600, marginBottom: 12,
            }}>Privacy</span>
            <h2 className="rv h2 split" data-split>
              What verifiers see —<br /><span className="lt">and what they never do</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
            className="!grid-cols-1 md:!grid-cols-2">
            {/* What they see */}
            <div className="rv bento-card" style={{
              '--d': '1',
              background: 'rgba(10,158,114,.06)', borderRadius: 22, padding: '28px 26px',
              border: '1px solid rgba(10,158,114,.18)',
            } as React.CSSProperties}>
              <h3 style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-.01em', color: '#0a7855', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: 'rgba(10,158,114,.2)', color: '#0a7855', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                What they see
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'PASS or FAIL verdict',
                  'The claim threshold (e.g., "income ≥ $3,000")',
                  'Period covered (month range)',
                  'NEAR AI attestation receipt',
                  'Proof expiry date',
                ].map(item => (
                  <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: '#0a5c42' }}>
                    <span style={{ color: 'var(--green)', fontWeight: 700, marginTop: 1, flexShrink: 0, fontSize: 15, lineHeight: 1 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* What they never see */}
            <div className="rv bento-card" style={{
              '--d': '2',
              background: 'rgba(200,144,13,.06)', borderRadius: 22, padding: '28px 26px',
              border: '1px solid rgba(200,144,13,.2)',
            } as React.CSSProperties}>
              <h3 style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-.01em', color: '#8a5f06', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: 'rgba(200,144,13,.18)', color: '#8a5f06', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </span>
                What they never see
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Your bank statements or PDFs',
                  'Individual transaction amounts',
                  'Account numbers or bank name',
                  'Exact income or balance figures',
                  'Who you pay or receive from',
                ].map(item => (
                  <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: '#7a5500' }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 700, marginTop: 1, flexShrink: 0 }}>✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{
        margin: '0 24px 80px', borderRadius: 32, overflow: 'hidden',
        background: 'var(--ink)', color: '#f4ede0',
        padding: 'clamp(40px,6vw,80px) clamp(28px,6vw,80px)',
        position: 'relative',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        minHeight: 360,
      }}>
        {/* BG gradient */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'linear-gradient(145deg, #17110c 0%, #1e1610 40%, #12100e 100%)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: 0, right: 0, width: 480, height: 480, zIndex: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,72,232,.15) 0%, transparent 65%)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, left: 0, width: 360, height: 360, zIndex: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(10,158,114,.12) 0%, transparent 65%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
          <h2 className="rv split" data-split style={{
            '--base': '50ms',
            fontWeight: 400,
            fontSize: 'clamp(40px,5.5vw,78px)',
            lineHeight: .94, letterSpacing: '-.05em',
            color: '#f4ede0',
          } as React.CSSProperties}>
            Ready<br />to prove it?
          </h2>
          <p className="rv" style={{
            '--d': '2', marginTop: 20,
            fontSize: 14, color: 'rgba(244,237,224,.55)', maxWidth: 340, lineHeight: 1.6,
          } as React.CSSProperties}>
            Upload a bank statement and get a shareable proof in under 60 seconds.
            No account required.
          </p>
          <div className="rv" style={{
            '--d': '3', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32,
          } as React.CSSProperties}>
            <Link href="/prove" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#f4ede0', color: 'var(--ink)',
              padding: '14px 30px', borderRadius: 999,
              fontSize: 14, fontWeight: 500, letterSpacing: '-.01em',
              transition: 'transform .3s var(--ease), box-shadow .3s var(--ease)',
            }}
              className="hover:-translate-y-px hover:shadow-[0_14px_32px_-12px_rgba(244,237,224,.3)]">
              Create your first proof
              <ArrowRight size={13} />
            </Link>
            <Link href="/audit" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: '1px solid rgba(244,237,224,.18)', color: 'rgba(244,237,224,.7)',
              padding: '14px 24px', borderRadius: 999,
              fontSize: 14, fontWeight: 500,
              transition: 'border-color .3s, color .3s',
            }}
              className="hover:border-[rgba(244,237,224,.35)] hover:!text-[#f4ede0]">
              Try expense audit
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ padding: '56px 24px 32px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 32, marginBottom: 56 }}
            className="!grid-cols-2 md:!grid-cols-[1.6fr_1fr_1fr_1fr]">

            {/* Brand */}
            <div className="rv !col-span-2 md:!col-span-1" style={{ gridColumn: 'span 2' }}>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontWeight: 500, fontSize: 16, letterSpacing: '-.03em' }}>
                <VouchMark size={28} />
                Vouch
              </Link>
              <p style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-2)', maxWidth: 260, lineHeight: 1.55 }}>
                Prove financial facts to anyone — without revealing your bank statements.
                Verified by hardware, not promises.
              </p>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 999,
                  background: 'rgba(10,158,114,.08)', border: '1px solid rgba(10,158,114,.18)',
                  fontSize: 11, fontWeight: 500, color: 'var(--green)',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px rgba(10,158,114,.2)' }} />
                  NEAR Hackathon 2026
                </div>
              </div>
            </div>

            {[
              {
                heading: 'Product',
                links: [['Create proof', '/prove'], ['Expense audit', '/audit'], ['My proofs', '/my-proofs'], ['Verify', '/v']],
              },
              {
                heading: 'Claims',
                links: [['Income floor', '/prove'], ['Balance floor', '/prove'], ['Financial runway', '/prove']],
              },
              {
                heading: 'Resources',
                links: [['About Vouch', '/about'], ['NEAR AI Cloud', 'https://cloud.near.ai'], ['What is a TEE?', '#how-it-works']],
              },
            ].map(({ heading, links }) => (
              <div key={heading} className="rv">
                <h6 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.01em', marginBottom: 16 }}>{heading}</h6>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} style={{ fontSize: 13, color: 'var(--ink-2)', transition: 'color .25s' }}
                        className="hover:!text-[var(--ink)]">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 16, paddingTop: 24, borderTop: '1px solid var(--border)',
            fontSize: 12, color: 'var(--ink-2)',
            flexWrap: 'wrap',
          }}>
            <span>© 2026 Vouch · Built for the NEAR Hackathon</span>
            <span style={{ display: 'flex', gap: 24 }}>
              <Link href="#" className="hover:!text-[var(--ink)]" style={{ transition: 'color .25s' }}>Privacy</Link>
              <Link href="#" className="hover:!text-[var(--ink)]" style={{ transition: 'color .25s' }}>Terms</Link>
              <a href="https://near.ai" target="_blank" rel="noopener" className="hover:!text-[var(--ink)]" style={{ transition: 'color .25s' }}>NEAR AI Cloud ↗</a>
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}
