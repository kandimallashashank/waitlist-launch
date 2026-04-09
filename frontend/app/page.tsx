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

      <WaitlistValueTicker />

      <section className="relative overflow-hidden border-b border-[#E0D8CC]/90 pb-20 pt-14 md:pb-28 md:pt-24">
        {/* warm radial glow only */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-60"
          aria-hidden
          style={{
            background: 'radial-gradient(ellipse 90% 100% at 50% 0%, rgba(184,90,58,0.13) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-2xl px-5 sm:px-6 text-center">
          <div data-hero className="space-y-5">
            <p className="inline-flex items-center gap-2 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#B85A3A]" aria-hidden />
              <span className="inline bg-gradient-to-r from-[#B85A3A] via-[#D4A574] to-[#B85A3A] bg-[length:300%_100%] bg-clip-text font-semibold text-transparent animate-gradient">
                Early access + launch discount
              </span>
            </p>

            <h1 className="font-display text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-[#14120F] sm:text-5xl md:text-[3.25rem]">
              Explore more. Regret less.<br />
              <span className="text-[#B85A3A]">Find the ones worth keeping.</span>
            </h1>

            <p className="mx-auto max-w-lg text-base leading-relaxed text-[#3A3530] md:text-[1.0625rem]">
              A 10-second store sniff is nothing like wearing a perfume all day in Indian heat. Try a small sample first, from ₹199. Take a quick quiz to find something that fits, or use the{" "}
              <Link href="/layering-lab" className="font-semibold text-[#B85A3A] underline decoration-[#D4B8A4] underline-offset-2 hover:text-[#A04D2F]">
                Layering Lab
              </Link>
              {" "}to mix two scents. Love it? The full bottle is right here.
            </p>
          </div>

          {/* Waitlist form */}
          <div data-hero className="mt-9" id="waitlist-form">
            {submitted ? (
              <div className="rounded-2xl border border-[#E0D8CC] bg-white/90 px-6 py-8 text-center">
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
                      : "This email is already registered. Your launch discount is below."
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
                  className="mt-6 inline-block text-sm font-medium text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
                >
                  How signals show up in the product →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                <div className="hidden">
                  <label htmlFor="waitlist-company" className="text-sm">Company</label>
                  <input
                    id="waitlist-company"
                    type="text"
                    value={botTrap}
                    onChange={(e) => setBotTrap(e.target.value)}
                    className="w-full rounded-lg border border-[#E5DDD6] px-3 py-2 text-sm"
                  />
                </div>
                <div className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
                  <div
                    className={`flex flex-1 items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-[#B85A3A]/15 ${
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
                      placeholder="your@email.com"
                      aria-invalid={emailFieldError ? true : undefined}
                      aria-describedby={emailFieldError ? 'waitlist-email-error' : undefined}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-[#A39A91] focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !emailPassesValidation}
                    className="h-12 whitespace-nowrap rounded-xl bg-[#B85A3A] px-6 text-[15px] font-semibold text-white shadow-md shadow-[#B85A3A]/20 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#A04D2F] hover:shadow-lg hover:shadow-[#B85A3A]/25 active:scale-[0.98] disabled:active:scale-100"
                  >
                    {loading ? 'Joining…' : 'Get early access'}
                  </Button>
                </div>
                {emailFieldError ? (
                  <p id="waitlist-email-error" className="text-sm text-[#B85A3A]" role="alert">
                    {emailFieldError}
                  </p>
                ) : null}
                <p className="text-center text-[11px] leading-relaxed text-[#8A8279]">
                  We&apos;ll email a thank-you note and keep you posted on launch.
                </p>
              </form>
            )}
          </div>

          {/* Chips */}
          <div data-hero className="mt-7 flex flex-wrap justify-center gap-2">
            {(
              [
                { t: 'New to fragrance?', a: 'Quiz finds your match', href: '/quiz' },
                { t: 'From ₹199', a: 'Try before you commit', href: '/catalog' },
                { t: '450+ fragrances', a: 'Decants + full bottles', href: '/catalog' },
              ] as const
            ).map((chip) => (
              <Link
                key={chip.t}
                href={chip.href}
                className="inline-flex items-center gap-2 rounded-full border border-[#E0D8CC] bg-white/80 px-3.5 py-1.5 text-[12px] text-[#14120F] shadow-[0_1px_0_rgba(255,255,255,0.9)] transition-colors hover:border-[#B85A3A]/45 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B85A3A]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F0E8]"
              >
                <span className="font-semibold tabular-nums">{chip.t}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#8A8279]">
                  {chip.a}
                </span>
              </Link>
            ))}
          </div>

          {/* Brand logos */}
          <div data-hero className="mx-auto mt-8 max-w-xl">
            <BrandLogosSection variant="inline" eyebrow="Brands on ScentRev" />
          </div>

          <a
            href="#sample-first"
            data-hero
            className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
          >
            <span>See how samples compare</span>
            <ChevronDown
              className="h-4 w-4 opacity-80 motion-safe:animate-[hero-chevron-nudge_2.2s_ease-in-out_infinite]"
              aria-hidden
            />
          </a>
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
                Try it for three days.<br />Then decide.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#3A3530]">
                A paper strip in a cold mall is not a real test. Your skin, your body heat, your whole day -- that is the real test. A small sample gives you that.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#3A3530]">
                Still love it after three days? The full bottle is right here. Not feeling it? No harm done.
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">Why you can trust our picks</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#14120F] sm:text-3xl">
              Not brand claims.<br />
              <span className="text-[#3A3530]">Real data from real wearers.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: Database,
                color: 'text-[#8B9E7E]',
                stat: '120k+',
                label: 'Perfumes mapped',
                sub: 'Every dimension of a perfume mapped -- notes, how long it lasts, how strong it projects, what season it suits.',
              },
              {
                icon: ThermometerSun,
                color: 'text-[#D4A574]',
                stat: 'India-first',
                label: 'Climate-aware data',
                sub: 'A perfume that works in London rain fails in Delhi summer. Every pick is scored for Indian weather.',
              },
              {
                icon: TrendingUp,
                color: 'text-[#B85A3A]',
                stat: '0–5',
                label: 'Blind Buy Score',
                sub: 'We read thousands of reviews so you don\'t have to. One number tells you how safe it is to buy without smelling first.',
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
