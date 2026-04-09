"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Database,
  FlaskConical,
  Mail,
  Sparkles,
  SprayCan,
  TestTube2,
  ThermometerSun,
  TrendingUp,
  Droplets,
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
import { storePreviewSessionFromSignup } from '@/lib/waitlist/previewSessionClient';

const sizes = [
  {
    label: '3ml Micro',
    detail: 'Perfect for 5-7 wears',
    icon: TestTube2,
    gradient: 'from-[#E9F0EC] via-[#F6FAF8] to-white',
    iconColor: 'text-[#6D7D63]',
  },
  {
    label: '5ml Standard',
    detail: 'Between sample and travel',
    icon: Droplets,
    gradient: 'from-[#EDE9F5] via-[#F5F3FA] to-white',
    iconColor: 'text-[#6B5B8E]',
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
      if (params.get('locked') === '1') {
        toast.warning('Pilot preview is locked', {
          description:
            'Join the waitlist below (email + Join). After that, Quiz and other preview links work.',
          duration: 7000,
        });
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
        const focusWaitlist = () => {
          document.getElementById('waitlist-form')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          emailInputRef.current?.focus({ preventScroll: true });
        };
        requestAnimationFrame(() => {
          setTimeout(focusWaitlist, 80);
        });
      }
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
        previewSessionToken?: string;
      };
      storePreviewSessionFromSignup(data.previewSessionToken);
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

        // Hero is not animated here: opacity/transform entrances delay LCP and cause a jump
        // after async GSAP loads. Scroll-triggered blocks below still animate.

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
            <div data-hero className="space-y-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#B85A3A]" aria-hidden />
                  <span className="inline bg-gradient-to-r from-[#B85A3A] via-[#D4A574] to-[#B85A3A] bg-[length:300%_100%] bg-clip-text font-semibold text-transparent animate-gradient">
                    Early access + launch discount
                  </span>
                </p>
                <h1 className="font-display text-[2.125rem] font-semibold leading-[1.1] tracking-tight text-[#14120F] sm:text-4xl md:text-[2.85rem] md:leading-[1.06]">
                  Explore more. Regret less.<br />
                  <span className="text-[#B85A3A]">Find the ones worth keeping.</span>
                </h1>
              </div>

              <p data-hero className="max-w-lg text-base leading-snug text-[#3A3530] md:text-[1.0625rem] md:leading-relaxed">
                A full bottle is a big decision off a tiny strip of paper. We&apos;re lining up small decants from about ₹199 at launch, a quick quiz when you want a starting point, and sizes you can actually wear before you commit to the bottle. Love layering? Use our{" "}
                <Link href="/layering-lab" className="font-semibold text-[#B85A3A] underline decoration-[#D4B8A4] underline-offset-2 hover:text-[#A04D2F]">
                  Layering Lab
                </Link>
                {" "}
                to play with blends, then grab curated combos or discovery kits if you want a ready set. On this pilot, prices and blind-buy scores are placeholders (see the notice under the nav).
              </p>

              <div data-hero className="flex flex-wrap gap-2 pt-1">
                {(
                  [
                    {
                      t: 'New to fragrance?',
                      a: 'Quiz finds your match',
                      href: '/quiz',
                    },
                    {
                      t: 'From ₹199',
                      a: 'Try before you commit',
                      href: '/catalog',
                    },
                    {
                      t: '450+ fragrances',
                      a: 'Decants + full bottles',
                      href: '/catalog',
                    },
                  ] as const
                ).map((chip) => (
                  <Link
                    key={chip.t}
                    href={chip.href}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E0D8CC] bg-white/80 px-3.5 py-1.5 text-[12px] text-[#14120F] shadow-[0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm transition-colors hover:border-[#B85A3A]/45 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B85A3A]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F0E8]"
                  >
                    <span className="font-semibold tabular-nums">{chip.t}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#8A8279]">
                      {chip.a}
                    </span>
                  </Link>
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
                  <span className="hidden shrink-0 rounded-full border border-[#E8E0D6] bg-[#FAF7F2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#3A3530] sm:inline-flex sm:items-center sm:gap-1.5">
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

      <WaitlistCatalogMarquee sharedCatalog={marqueePicks} />

      <section
        id="sample-first"
        className="border-t border-[#E0D8CC] bg-[#F4F0E8] py-14 md:py-20"
      >
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div data-scroll="fade" className="grid gap-10 md:grid-cols-2 md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">The smarter way to buy</p>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-[#14120F] sm:text-3xl">
                You bought the bottle.<br />You wore it twice.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#3A3530]">
                Happens to beginners. Happens to collectors. A full bottle is a commitment your nose makes in 30 seconds in air conditioning, on a paper strip. Your skin in Indian heat is a completely different story.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#3A3530]">
                A decant lets you live with a fragrance for two days before you decide. Wear it to work, through the afternoon, to sleep. If it still feels right, the full bottle is right here. If not, you saved yourself a shelf ornament.
              </p>
            </div>
            <div data-stagger="cards" className="grid grid-cols-3 gap-3">
              {sizes.map((size) => (
                <div key={size.label} data-card className="rounded-2xl border border-[#D9D0C4] bg-white/80 p-4 backdrop-blur-sm">
                  <IconBadge icon={size.icon} gradient={size.gradient} iconClassName={size.iconColor} className="mb-3 h-10 w-10" />
                  <p className="text-xs font-semibold text-[#14120F]">{size.label}</p>
                  <p className="mt-0.5 text-[10px] text-[#7A726A]">{size.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <WaitlistWhatWeOffer />

      <WaitlistBlindBuyPipeline />

      <section
        id="recommendation-signals"
        className="border-t border-[#E0D8CC] bg-[#F4F0E8] py-14 md:py-20"
      >
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div data-scroll="fade" className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">The data behind it</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#14120F] sm:text-3xl">
              Not hype. Not guesswork.<br />
              <span className="text-[#3A3530]">120,000 perfumes worth of signal.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: Database,
                color: 'text-[#8B9E7E]',
                stat: '120k+',
                label: 'Perfumes mapped',
                sub: 'Notes, accords, longevity, sillage, gender lean, seasons, occasions every dimension scored.',
              },
              {
                icon: ThermometerSun,
                color: 'text-[#D4A574]',
                stat: 'India-first',
                label: 'Climate-aware data',
                sub: 'A fragrance that works in London autumn may fail in Delhi summer. We bake heat and humidity into every recommendation.',
              },
              {
                icon: TrendingUp,
                color: 'text-[#B85A3A]',
                stat: '0–5',
                label: 'Blind Buy Score',
                sub: 'Real community signals from Reddit, Facebook, and the web fused with perfume metrics. No more 2-hour research sessions.',
              },
            ].map(({ icon: Icon, color, stat, label, sub }) => (
              <div key={label} className="rounded-2xl border border-[#E0D8CC] bg-white/80 p-5 backdrop-blur-sm">
                <Icon className={`mb-3 h-5 w-5 ${color}`} aria-hidden />
                <p className="text-2xl font-bold text-[#14120F]">{stat}</p>
                <p className="mt-0.5 text-sm font-semibold text-[#14120F]">{label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#3A3530]">{sub}</p>
              </div>
            ))}
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
          <div className="mx-auto mt-12 max-w-lg border-t border-white/10 pt-10 space-y-4">
            <div className="flex items-center justify-center gap-6 text-sm">
              <Link
                href="/about"
                className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline"
              >
                Our Story
              </Link>
              <span className="text-white/20">·</span>
              <a
                href="mailto:support@scentrev.com"
                className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline"
              >
                support@scentrev.com
              </a>
              <span className="text-white/20">·</span>
              <a
                href="mailto:shashank@scentrev.com"
                className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline"
              >
                shashank@scentrev.com
              </a>
            </div>
            <p className="text-xs text-white/40 text-center">© {new Date().getFullYear()} ScentRev. Built in India.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
