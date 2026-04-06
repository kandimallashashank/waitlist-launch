"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Database,
  FlaskConical,
  LayoutDashboard,
  Mail,
  Sparkles,
  SprayCan,
  TestTube2,
  ThermometerSun,
  TrendingUp,
} from 'lucide-react';
import IconBadge from '@/components/common/IconBadge';
import WaitlistBlindBuyPipeline from '@/components/waitlist/WaitlistBlindBuyPipeline';
import WaitlistCatalogMarquee from '@/components/waitlist/WaitlistCatalogMarquee';
import WaitlistValueTicker from '@/components/waitlist/WaitlistValueTicker';
import WaitlistWhatWeOffer from '@/components/waitlist/WaitlistWhatWeOffer';
import BrandLogosSection from '@/components/sections/BrandLogosSection';
import { useWaitlistPerfumes } from '@/hooks/useWaitlistPerfumes';
import { Button } from '@/components/ui/button';
import {
  WAITLIST_EMAIL_MAX_LENGTH,
  getWaitlistEmailValidationError,
  isValidWaitlistEmail,
} from '@/lib/waitlist/emailValidation';
import { toast } from 'sonner';

const sizes = [
  {
    label: '3ml Micro',
    detail: 'Perfect for 5-7 wears',
    icon: TestTube2,
    gradient: 'from-[#E9F0EC] via-[#F6FAF8] to-white',
    iconColor: 'text-[#6D7D63]',
  },
  {
    label: '8ml Travel',
    detail: 'Everyday carry size',
    icon: SprayCan,
    gradient: 'from-[#F8E8E0] via-[#FFF3ED] to-white',
    iconColor: 'text-[#B85A3A]',
  },
  {
    label: '10ml Plus',
    detail: 'Longer stays and gifting',
    icon: FlaskConical,
    gradient: 'from-[#F6EFE6] via-[#FFF7ED] to-white',
    iconColor: 'text-[#D4A574]',
  },
];

const comparison = [
  { label: 'Cost to try', micro: '₹199-₹399', full: '₹3,000+' },
  { label: 'Variety', micro: 'Try 6-8 scents', full: 'One scent' },
  { label: 'Risk', micro: 'Low commitment', full: 'High commitment' },
  { label: 'Travel friendly', micro: 'Pocket-ready', full: 'Bulky and fragile' },
  { label: 'Gifting', micro: 'Easy add-on', full: 'Pricey gift' },
];

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [couponEmailSent, setCouponEmailSent] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [botTrap, setBotTrap] = useState('');
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const { marqueePicks } = useWaitlistPerfumes(24);

  const emailPassesValidation = useMemo(() => isValidWaitlistEmail(email), [email]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('email')) return;
      const raw = params.get('email')?.trim();
      if (!raw) return;
      const decoded = decodeURIComponent(raw).slice(0, WAITLIST_EMAIL_MAX_LENGTH);
      if (!decoded) return;
      setEmail((prev) => (prev.trim() ? prev : decoded));
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    } catch {
      /* ignore malformed ?email= */
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (botTrap) {
      toast.error('Something went wrong. Please try again.');
      return;
    }
    const validationMessage = getWaitlistEmailValidationError(email);
    if (validationMessage) {
      setEmailFieldError(validationMessage);
      toast.error(validationMessage);
      emailInputRef.current?.focus();
      return;
    }
    setEmailFieldError(null);
    const trimmed = email.trim();
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to join waitlist');
      }
      const data = (await res.json()) as {
        couponCode?: string;
        discountPercent?: number;
        already?: boolean;
        emailSent?: boolean;
      };
      if (data.couponCode) setCouponCode(data.couponCode);
      if (data.discountPercent != null) setDiscountPercent(data.discountPercent);
      setAlreadyJoined(Boolean(data.already));
      setCouponEmailSent(Boolean(data.emailSent));
      setSubmitted(true);
      if (data.already) {
        toast.message('Already on the waitlist', {
          description: 'This email is already signed up. Your code is below if you need it.',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join waitlist';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let cancelled = false;
    let revert: (() => void) | null = null;
    let refreshOnLoadHandler: (() => void) | null = null;
    let refreshTimerId: number | undefined;

    void (async () => {
      try {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !rootRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const easeOut = 'expo.out';

        gsap.set('[data-hero]', { opacity: 0, y: 20 });
        gsap.to('[data-hero]', {
          opacity: 1,
          y: 0,
          duration: 0.72,
          ease: easeOut,
          stagger: 0.065,
          delay: 0.06,
        });

        const scrollDefaults = {
          start: 'top 88%',
          toggleActions: 'play none none none' as const,
          once: true,
          invalidateOnRefresh: true,
        };

        gsap.utils.toArray<HTMLElement>('[data-scroll="fade"]').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.68,
              ease: easeOut,
              scrollTrigger: {
                trigger: el,
                ...scrollDefaults,
              },
            }
          );
        });

        gsap.utils.toArray<HTMLElement>('[data-scroll="lift"]').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 32, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.72,
              ease: easeOut,
              scrollTrigger: {
                trigger: el,
                ...scrollDefaults,
              },
            }
          );
        });

        gsap.utils.toArray<HTMLElement>('[data-stagger="cards"]').forEach((wrap) => {
          const cards = wrap.querySelectorAll('[data-card]');
          gsap.fromTo(
            cards,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.65,
              ease: easeOut,
              stagger: 0.055,
              scrollTrigger: {
                trigger: wrap,
                start: 'top 88%',
                toggleActions: 'play none none none',
                once: true,
                invalidateOnRefresh: true,
              },
            }
          );
        });

        gsap.utils.toArray<HTMLElement>('[data-stagger="rows"]').forEach((wrap) => {
          const rows = wrap.querySelectorAll('[data-row]');
          gsap.fromTo(
            rows,
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              ease: easeOut,
              stagger: 0.05,
              scrollTrigger: {
                trigger: wrap,
                start: 'top 88%',
                toggleActions: 'play none none none',
                once: true,
                invalidateOnRefresh: true,
              },
            }
          );
        });
      }, root);
      revert = () => ctx.revert();
      const refreshTriggers = () => {
        if (!cancelled) ScrollTrigger.refresh();
      };
      requestAnimationFrame(refreshTriggers);
      refreshOnLoadHandler = () => refreshTriggers();
      window.addEventListener('load', refreshOnLoadHandler);
      refreshTimerId = window.setTimeout(refreshTriggers, 320);
      if (cancelled) ctx.revert();
      } catch (err) {
        console.error('Waitlist motion init failed:', err);
        const r = rootRef.current;
        if (r) {
          r.querySelectorAll('[data-hero]').forEach((node) => {
            const el = node as HTMLElement;
            el.style.removeProperty('opacity');
            el.style.removeProperty('transform');
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (refreshOnLoadHandler) {
        window.removeEventListener('load', refreshOnLoadHandler);
      }
      if (refreshTimerId !== undefined) {
        window.clearTimeout(refreshTimerId);
      }
      revert?.();
    };
  }, []);

  return (
    <main
      ref={rootRef}
      className="waitlist-page min-h-screen bg-[#F4F0E8] text-[#14120F] selection:bg-[#B85A3A]/25 selection:text-[#14120F]"
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <WaitlistValueTicker />

      <section className="relative overflow-hidden border-b border-[#E0D8CC]/90 pb-20 pt-10 md:pb-28 md:pt-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(105deg, transparent 0%, transparent 38%, rgba(184,90,58,0.06) 50%, transparent 62%),
              radial-gradient(ellipse 100% 80% at 0% 0%, rgba(184,90,58,0.14), transparent 55%),
              radial-gradient(ellipse 80% 70% at 100% 10%, rgba(109,125,99,0.11), transparent 50%),
              radial-gradient(ellipse 60% 45% at 70% 100%, rgba(212,165,116,0.1), transparent 55%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgba(20,18,15,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(20,18,15,0.03) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-10 xl:gap-14">
            <div className="min-w-0 flex-1 space-y-8 lg:max-w-[min(640px,58%)] lg:pt-2">
              <div data-hero className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-2xl bg-[#14120F] px-2 text-xs font-semibold tracking-tight text-white shadow-lg shadow-[#14120F]/20 ring-1 ring-white/10 sm:text-sm">
                  SR
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold tracking-tight text-[#14120F]">ScentRev</p>
                  <p className="text-xs text-[#6B645C]">Micro samples · full bottles · shipped in India</p>
                </div>
                <span className="hidden h-8 w-px bg-[#D9D1C7] sm:block" aria-hidden />
                <span className="rounded-full border border-[#D9D1C7] bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6B645C] shadow-sm backdrop-blur-sm">
                  Waitlist
                </span>
              </div>

              <div data-hero className="space-y-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#B85A3A]" aria-hidden />
                  <span className="inline bg-gradient-to-r from-[#B85A3A] via-[#D4A574] to-[#B85A3A] bg-[length:300%_100%] bg-clip-text font-semibold text-transparent animate-gradient">
                    Early access + launch discount
                  </span>
                </p>
                <h1 className="font-display text-[2.125rem] font-semibold leading-[1.1] tracking-tight text-[#14120F] sm:text-4xl md:text-[2.85rem] md:leading-[1.06]">
                  Find your scent with data, not guesswork.
                </h1>
              </div>

              <p data-hero className="max-w-xl text-base leading-relaxed text-[#4A4540] md:text-[1.0625rem]">
                We sell <span className="font-medium text-[#14120F]">micro fragrance samples</span> (3ml to 10ml) and{' '}
                <span className="font-medium text-[#14120F]">full-size bottles</span> in India: try on real skin first,
                then buy the bottle when your skin agrees. Join for launch timing and your discount, then keep
                scrolling for sizes, how micro compares to full bottles, and{' '}
                <span className="font-medium text-[#14120F]">Blind Buy Score</span>
                : a 0-5 blind-buy rating from Reddit, Facebook, and web chatter fused with perfume metrics so you waste
                less time searching.
              </p>

              <div data-hero className="flex flex-wrap gap-2 pt-1">
                {[
                  { t: '450+ fragrances', a: 'Samples & full bottles' },
                  { t: 'From ₹199', a: 'Micro samples' },
                  { t: 'India-first', a: 'Heat & humidity' },
                ].map((chip) => (
                  <span
                    key={chip.t}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E0D8CC] bg-white/80 px-3.5 py-1.5 text-[12px] text-[#14120F] shadow-[0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm"
                  >
                    <span className="font-semibold tabular-nums">{chip.t}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#8A8279]">{chip.a}</span>
                  </span>
                ))}
              </div>

              <div data-hero className="max-w-xl">
                <BrandLogosSection variant="inline" eyebrow="Brands on ScentRev" />
              </div>

              <a
                href="#sample-first"
                data-hero
                className="inline-flex items-center gap-2 text-sm font-medium text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
              >
                <span>See how samples compare</span>
                <ChevronDown
                  className="h-4 w-4 opacity-80 motion-safe:animate-[hero-chevron-nudge_2.2s_ease-in-out_infinite]"
                  aria-hidden
                />
              </a>
            </div>

            <div
              data-hero
              className="relative w-full shrink-0 lg:sticky lg:top-28 lg:w-[min(100%,420px)] lg:self-start xl:top-32"
              id="waitlist-form"
            >
              <div className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-90 blur-2xl" aria-hidden>
                <div
                  className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 animate-[orb-circle_18s_ease-in-out_infinite]"
                  style={{ background: 'radial-gradient(circle, rgba(184,90,58,0.5) 0%, transparent 70%)' }}
                />
                <div
                  className="absolute left-1/2 top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 animate-[orb-circle-alt_22s_ease-in-out_infinite]"
                  style={{ background: 'radial-gradient(circle, rgba(212,165,116,0.45) 0%, transparent 70%)' }}
                />
              </div>

              <div className="relative z-10 rounded-[1.75rem] bg-gradient-to-br from-[#B85A3A]/30 via-[#D4A574]/18 to-[#8B9E7E]/22 p-[1px] shadow-[0_28px_80px_-20px_rgba(20,18,15,0.22)] ring-1 ring-[#14120F]/[0.04]">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-[#E8E2DA] bg-white/[0.97] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:p-8">
                  <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">Join</p>
                    <p className="mt-1 font-display text-xl font-semibold text-[#14120F]">Waitlist</p>
                  </div>
                  <span className="hidden shrink-0 rounded-full border border-[#E8E0D6] bg-[#FAF7F2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B645C] sm:inline-flex sm:items-center sm:gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#B85A3A]" aria-hidden />
                    Launching soon
                  </span>
                  </div>

                {submitted ? (
                  <div className="py-6 text-center sm:py-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3ED]">
                    <Sparkles className="h-7 w-7 text-[#B85A3A]" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-[#14120F]">
                    {alreadyJoined ? "You're already on the waitlist" : "You're on the list"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#5F5C57]">
                    {alreadyJoined
                      ? couponEmailSent
                        ? 'Check your inbox. We just sent your discount details again.'
                        : "This email is already registered. Your launch discount is below; check past emails from us if you need the full welcome note."
                      : "Check your inbox. We've sent your exclusive discount code."}
                  </p>
                  {couponCode && (
                    <div className="mt-6 rounded-2xl border-2 border-dashed border-[#D4A574]/80 bg-[#FDF6F3] p-5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">
                        Your early access code
                      </p>
                      <p className="font-mono text-2xl font-bold tracking-[0.2em] text-[#14120F]">{couponCode}</p>
                      {discountPercent && (
                        <p className="mt-2 text-sm font-semibold text-[#B85A3A]">
                          {discountPercent}% off · single use
                        </p>
                      )}
                    </div>
                  )}
                  <Link
                    href="#recommendation-signals"
                    className="mt-8 inline-block text-sm font-medium text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
                  >
                    How signals show up in the product →
                  </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div>
                    <label htmlFor="waitlist-email" className="text-sm font-medium text-[#4A4540]">
                      Email
                    </label>
                    <div
                      className={`mt-2 flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-[#B85A3A]/15 ${
                        emailFieldError
                          ? 'border-[#B85A3A] focus-within:border-[#B85A3A]'
                          : 'border-[#E0D8CC] focus-within:border-[#B85A3A]/40'
                      }`}
                    >
                      <Mail className="h-4 w-4 shrink-0 text-[#B85A3A]" aria-hidden />
                      <input
                        ref={emailInputRef}
                        id="waitlist-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        spellCheck={false}
                        maxLength={WAITLIST_EMAIL_MAX_LENGTH}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailFieldError(null);
                        }}
                        placeholder="you@example.com"
                        aria-invalid={emailFieldError ? true : undefined}
                        aria-describedby={emailFieldError ? 'waitlist-email-error' : undefined}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-[#A39A91] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    {emailFieldError ? (
                      <p id="waitlist-email-error" className="mt-2 text-sm text-[#B85A3A]" role="alert">
                        {emailFieldError}
                      </p>
                    ) : null}
                  </div>

                  <div className="hidden">
                    <label htmlFor="waitlist-company" className="text-sm">
                      Company
                    </label>
                    <input
                      id="waitlist-company"
                      type="text"
                      value={botTrap}
                      onChange={(e) => setBotTrap(e.target.value)}
                      className="w-full rounded-lg border border-[#E5DDD6] px-3 py-2 text-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !emailPassesValidation}
                    className="h-12 w-full rounded-xl bg-[#B85A3A] text-[15px] font-semibold text-white shadow-md shadow-[#B85A3A]/20 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#A04D2F] hover:shadow-lg hover:shadow-[#B85A3A]/25 active:scale-[0.98] disabled:active:scale-100"
                  >
                    {loading ? 'Joining…' : 'Join the waitlist'}
                  </Button>
                  <p className="text-center text-[11px] leading-relaxed text-[#8A8279]">
                    We&apos;ll email a thank-you note and keep you posted on launch.
                  </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section
        id="sample-first"
        className="relative z-[1] -mt-10 border-t border-transparent bg-gradient-to-b from-[#E8DFD4]/90 via-[#EDE6DC] to-[#F0EBE3] pb-16 pt-6 md:-mt-16 md:pb-24 md:pt-8"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4C9BB] to-transparent" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            data-scroll="fade"
            className="relative overflow-hidden rounded-[1.5rem] border border-[#D9D0C4] bg-[#FAF7F2] p-5 shadow-[0_32px_90px_-28px_rgba(20,18,15,0.2)] sm:rounded-[1.75rem] sm:p-6 md:rounded-[2rem] md:p-10 lg:p-12"
          >
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(184,90,58,0.12),transparent_68%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(109,125,99,0.1),transparent_70%)]"
              aria-hidden
            />

            <div className="relative grid gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-12 lg:items-start">
              <div className="min-w-0 lg:col-span-5">
                <span className="inline-block max-w-full text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B85A3A] sm:text-xs sm:tracking-[0.28em] md:tracking-[0.32em]">
                  Who we are
                </span>
                <h2 className="mt-2 font-display text-[1.625rem] font-semibold leading-[1.12] tracking-tight text-[#14120F] text-balance sm:mt-3 sm:text-3xl sm:leading-tight md:text-[2.25rem] md:leading-tight">
                  <span className="block">Sample first.</span>
                  <span className="mt-2 block text-[1.35rem] font-semibold leading-[1.15] text-[#5F5C57] sm:mt-1.5 sm:text-3xl sm:leading-tight">
                    Buy smarter.
                  </span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#4A4540] sm:mt-5 sm:text-sm md:text-base md:leading-relaxed">
                  ScentRev is built for India: affordable micro-sizes for honest wear in your climate, and full bottles
                  when you are ready. We sell both so you can try first, then commit with confidence. Everything on this
                  page exists to make that decision easier.
                </p>

                <span className="mt-8 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A8279] sm:mt-10 sm:tracking-[0.28em]">
                  Sizes we ship
                </span>
                <div
                  data-stagger="cards"
                  className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
                >
                  {sizes.map((size) => (
                    <div
                      key={size.label}
                      data-card
                      className="waitlist-section-card min-w-[148px] shrink-0 rounded-2xl border border-[#D9D0C4] bg-white/80 p-4 shadow-[0_12px_40px_rgba(20,18,15,0.06)] backdrop-blur-sm sm:min-w-0"
                    >
                      <IconBadge
                        icon={size.icon}
                        gradient={size.gradient}
                        iconClassName={size.iconColor}
                        className="mb-3 h-12 w-12"
                      />
                      <p className="text-sm font-medium text-[#14120F]">{size.label}</p>
                      <p className="mt-1 text-xs text-[#7A726A]">{size.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 lg:col-span-7">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8279] sm:tracking-[0.22em]">
                      At a glance
                    </p>
                    <p className="mt-1 max-w-[22rem] text-[15px] font-medium leading-snug text-[#14120F] sm:max-w-none sm:text-sm sm:leading-normal">
                      Micro samples vs. jumping to a full bottle
                    </p>
                  </div>
                  <span className="w-fit shrink-0 rounded-full border border-[#E0D6CC] bg-white/90 px-3 py-1.5 text-[9px] font-semibold uppercase leading-tight tracking-wide text-[#6B645C] sm:py-1 sm:text-[10px] sm:tracking-wider">
                    Same juice, different risk
                  </span>
                </div>
                <div
                  data-scroll="lift"
                  className="overflow-hidden rounded-2xl border border-[#D4C9BB] bg-gradient-to-b from-[#FFFCF8] to-[#F6F1E9] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_50px_-20px_rgba(20,18,15,0.12)]"
                >
                  <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] items-center gap-4 border-b border-[#E8DFD6] bg-[#F0E9E0] px-5 py-3 sm:grid">
                    <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#5F5C57]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B85A3A]" aria-hidden />
                      Comparison
                    </div>
                    <span className="min-w-0 text-center text-[11px] font-bold uppercase tracking-wide text-[#B85A3A]">
                      Micro
                    </span>
                    <span className="min-w-0 text-center text-[11px] font-bold uppercase tracking-wide text-[#5F5C57]">
                      Full bottle
                    </span>
                  </div>
                  <div data-stagger="rows" className="divide-y divide-[#E8DFD6]">
                    {comparison.map((row) => (
                      <div key={row.label} data-row className="transition-colors hover:bg-[#FFF9F3]/90">
                        <div className="px-3 py-3.5 sm:hidden">
                          <p className="text-[13px] font-semibold leading-snug text-[#14120F]">{row.label}</p>
                          <div className="mt-2.5 grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-[#E4D9CE] bg-white/90 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]">
                            <div className="border-r border-[#EDE5DC] px-3 py-3">
                              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#B85A3A]">
                                Micro
                              </p>
                              <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[#2C2824]">
                                {row.micro}
                              </p>
                            </div>
                            <div className="px-3 py-3">
                              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#7A726A]">
                                Full bottle
                              </p>
                              <p className="mt-1.5 text-[13px] leading-snug text-[#5F5C57]">{row.full}</p>
                            </div>
                          </div>
                        </div>
                        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] items-center gap-4 px-5 py-3.5 text-sm sm:grid">
                          <span className="min-w-0 font-medium leading-normal text-[#14120F]">{row.label}</span>
                          <span className="min-w-0 text-center font-semibold leading-normal text-[#B85A3A]">
                            {row.micro}
                          </span>
                          <span className="min-w-0 text-center leading-normal text-[#5F5C57]">{row.full}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WaitlistCatalogMarquee sharedCatalog={marqueePicks} />

      <WaitlistWhatWeOffer />

      <WaitlistBlindBuyPipeline />

      <section
        id="recommendation-signals"
        className="relative border-t border-[#E8E0D6] bg-gradient-to-b from-[#EFEBE3] to-[#F8F5EF] py-16 md:py-24"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div data-scroll="fade" className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#B85A3A]">
              In the product
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-[#14120F] md:text-4xl">
              ~120k perfumes, serious analytics, India-aware KPIs
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#4A4540] md:text-lg">
              We draw on a dataset of roughly <span className="font-medium text-[#14120F]">120,000 perfumes</span>: rich
              enough for real analytics: what people actually like, how demand shifts by season, how notes and accords
              cluster, brand and reformulation lineage, and plenty beyond. A fragrance that crushes in cooler, drier
              Western weather often falls flat in Indian heat and humidity; we surface{' '}
              <span className="font-medium text-[#14120F]">KPIs and fit metrics</span> so you can see what is more
              likely to work here, not just what is trending abroad. Same stack powers{' '}
              <span className="font-medium text-[#14120F]">Blind Buy Score</span> (0-5, weighted across community
              signals and catalog metrics) and the quiz.
            </p>
          </div>

          <div className="mt-12">
            <div
              data-scroll="lift"
              className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#2A2826] bg-[#14120F] text-white shadow-[0_28px_90px_rgba(20,18,15,0.22)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#1A1816] px-5 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 shrink-0 text-[#D4A574]" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Project KPIs</p>
                    <p className="truncate text-sm font-medium text-white">Dataset &amp; fit KPIs (illustrative)</p>
                  </div>
                </div>
                <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90 sm:inline">
                  Live signals
                </span>
              </div>
              <div className="space-y-4 p-5">
                <p className="text-xs leading-relaxed text-white/55">
                  Illustrative preview: catalog depth, climate fit, and readable KPIs in one place.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                    <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#8B9E7E]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">120k+ perfume dataset</span>
                        <span className="font-mono text-xs text-emerald-300/95">Rich analytics</span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        Massive structured data for serious analysis: preferences, seasons, notes and accords, brands,
                        reformulations, and cross-links so we can answer what people like and how profiles compare.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                    <ThermometerSun className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A574]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">India vs. Western climate</span>
                        <span className="font-mono text-xs text-amber-200/90">Wearability</span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        What sells in the West does not always survive Indian heat and monsoon humidity. We bake
                        climate into fit so you are not judging a Delhi summer by a London autumn.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#B85A3A]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">KPIs &amp; fit metrics</span>
                        <span className="font-mono text-xs text-rose-200/85">Clear signals</span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        Lots of readable indicators: will this likely work for you here, not just on paper? Crowd and
                        purchase signals cut hype and highlight what repeatedly performs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#E0D8CC] bg-[#14120F] py-16 text-white">
        <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Get early access
          </h3>
          <p className="mt-3 text-sm leading-relaxed !text-white/75">
            Join the waitlist and we&apos;ll notify you at launch, with your discount locked in.
          </p>
          <div className="mt-8">
            <Link
              href="#waitlist-form"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#B85A3A] px-8 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-colors hover:bg-[#c96a47]"
            >
              Join the waitlist
            </Link>
          </div>
          <p className="mx-auto mt-12 max-w-lg border-t border-white/10 pt-10 text-sm leading-relaxed text-white/65">
            Questions? Email{' '}
            <a
              href="mailto:support@scentrev.com"
              className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline"
            >
              support@scentrev.com
            </a>{' '}
            or{' '}
            <a
              href="mailto:shashank@scentrev.com"
              className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline"
            >
              shashank@scentrev.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
