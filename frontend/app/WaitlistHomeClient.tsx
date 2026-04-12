"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronDown,
  ChevronRight,
  Database,
  FlaskConical,
  Mail,
  Sparkles,
  SprayCan,
  TestTube2,
  ThermometerSun,
  TrendingUp,
  Droplets,
  Wand2,
  Layers,
  ShoppingBag,
  Package,
  Brain,
  Zap,
  Gift,
  Briefcase,
} from 'lucide-react';
import IconBadge from '@/components/common/IconBadge';
import BrandLogosSection from '@/components/sections/BrandLogosSection';
import { useWaitlistPerfumes } from '@/hooks/useWaitlistPerfumes';
import { BorderBeam } from '@/components/ui/border-beam';
import { Button } from '@/components/ui/button';
import {
  WAITLIST_EMAIL_MAX_LENGTH,
  getWaitlistEmailValidationError,
  isValidWaitlistEmail,
} from '@/lib/waitlist/emailValidation';
import { toast } from 'sonner';
import { storePreviewSessionFromSignup } from '@/lib/waitlist/previewSessionClient';
import HomeExploreShowcase from '@/components/waitlist/HomeExploreShowcase';

// Lazy-load heavy below-fold sections - keeps hero JS bundle small for LCP
const WaitlistValueTicker = dynamic(() => import('@/components/waitlist/WaitlistValueTicker'), { ssr: false });
const WaitlistCatalogMarquee = dynamic(() => import('@/components/waitlist/WaitlistCatalogMarquee'), { ssr: false });
const WaitlistWhatWeOffer = dynamic(() => import('@/components/waitlist/WaitlistWhatWeOffer'), { ssr: false });
const WaitlistBlindBuyPipeline = dynamic(() => import('@/components/waitlist/WaitlistBlindBuyPipeline'), { ssr: false });
const WaitlistProblemsAndFixes = dynamic(() => import('@/components/waitlist/WaitlistProblemsAndFixes'), { ssr: false });
const WaitlistFeedbackSection = dynamic(() => import('@/components/waitlist/WaitlistFeedbackSection'), { ssr: false });
const FragDbStatsDashboard = dynamic(() => import('@/components/waitlist/FragDbStatsDashboard'), { ssr: false });

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

const BADGE_LINES = [
  'Bringing the scent revolution to India',
  'Try before you commit. Keep what fits.',
];

/**
 * Hero quick links: quiz, gift, lab, catalog, subscribe (desktop cards + mobile list).
 * `name` is used for accessible labels; `t` / `a` are punchy marketing lines.
 */
const HERO_EXPLORE_LINKS = [
  {
    name: 'Scent quiz',
    t: 'Your scent match',
    a: 'Escape "I smell… fine?" in under three minutes',
    href: '/quiz',
    Icon: Wand2,
    bg: 'bg-[#FFF5EF]',
    iconColor: 'text-[#B85A3A]',
  },
  {
    name: 'Gift finder',
    t: 'Gifts that actually fit',
    a: 'They said "anything." That was a hostage situation.',
    href: '/gift',
    Icon: Gift,
    bg: 'bg-[#FDF6F3]',
    iconColor: 'text-[#B85A3A]',
  },
  {
    name: 'Layering Lab',
    t: 'Will they blend?',
    a: 'Two bottles enter. One nose leaves offended.',
    href: '/layering-lab',
    Icon: Layers,
    bg: 'bg-[#EEF2EB]',
    iconColor: 'text-[#6D7D63]',
  },
  {
    name: 'Catalog',
    t: 'Try before the splurge',
    a: 'Main-character energy, side-character receipt',
    href: '/catalog',
    Icon: ShoppingBag,
    bg: 'bg-[#FFF5EF]',
    iconColor: 'text-[#B85A3A]',
  },
  {
    name: 'Subscribe',
    t: 'The monthly drop',
    a: 'Curated bottles every month. Cancel or skip anytime.',
    href: '/subscribe',
    Icon: Package,
    bg: 'bg-[#EDE4FF]',
    iconColor: 'text-[#5B21B6]',
  },
] as const;

function HeroBadgeCycler() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % BADGE_LINES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-flex items-center" style={{ minWidth: '14rem' }}>
      {BADGE_LINES.map((line, i) => (
        <span
          key={line}
          className="absolute inset-0 flex items-center justify-center text-xs font-semibold transition-all duration-700 ease-in-out"
          style={{
            opacity: i === idx ? 1 : 0,
            transform: i === idx ? 'translateY(0)' : i < idx ? 'translateY(-8px)' : 'translateY(8px)',
            background: 'linear-gradient(90deg, #B85A3A, #D4A574, #B85A3A)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            pointerEvents: i === idx ? 'auto' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {line}
        </span>
      ))}
      {/* invisible widest line to hold layout */}
      <span className="invisible text-xs font-semibold" aria-hidden style={{ whiteSpace: 'nowrap' }}>
        Bringing the scent revolution to India
      </span>
    </span>
  );
}

export default function WaitlistHomeClient() {
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

    /**
     * Scrolls the waitlist block into view and focuses the email field. Retries
     * briefly so this still works after middleware redirect, Next.js navigation,
     * and sticky-header layout.
     */
    const scrollWaitlistIntoViewAndFocusEmail = () => {
      const formEl = document.getElementById('waitlist-form');
      formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const tryFocusEmail = (attempt: number) => {
        const el =
          emailInputRef.current ??
          (document.getElementById('waitlist-email') as HTMLInputElement | null);
        if (el && !el.disabled) {
          el.focus({ preventScroll: true });
          return;
        }
        if (attempt < 16) {
          window.setTimeout(() => tryFocusEmail(attempt + 1), 75);
        }
      };
      window.setTimeout(() => tryFocusEmail(0), 200);
    };

    const stripLockedParam = (): boolean => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('locked') !== '1') return false;
      toast.warning('Pilot preview is locked', {
        description:
          'Join the waitlist below (email + Join). After that, Quiz and other preview links work.',
        duration: 7000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('locked');
      if (!url.hash || url.hash === '#') {
        url.hash = 'waitlist-form';
      }
      window.history.replaceState(
        null,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      );
      return true;
    };

    const shouldScrollToWaitlist = (hadLockedParam: boolean) => {
      if (hadLockedParam) return true;
      const h = window.location.hash;
      return h === '#waitlist-form' || h === '#waitlist-email' || h === '#join';
    };

    const syncFromUrl = () => {
      try {
        const hadLocked = stripLockedParam();
        if (shouldScrollToWaitlist(hadLocked)) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => scrollWaitlistIntoViewAndFocusEmail());
          });
        }

        const params = new URLSearchParams(window.location.search);
        if (!params.has('email')) return;
        const raw = params.get('email')?.trim();
        if (!raw) return;
        const decoded = decodeURIComponent(raw).slice(0, WAITLIST_EMAIL_MAX_LENGTH);
        if (!decoded) return;
        setEmail((prev) => (prev.trim() ? prev : decoded));
        const url = new URL(window.location.href);
        url.searchParams.delete('email');
        window.history.replaceState(
          null,
          '',
          `${url.pathname}${url.search}${url.hash}`,
        );
      } catch {
        /* ignore malformed ?email= */
      }
    };

    syncFromUrl();

    const onHashChange = () => {
      const h = window.location.hash;
      if (h === '#waitlist-form' || h === '#waitlist-email' || h === '#join') {
        scrollWaitlistIntoViewAndFocusEmail();
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
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
      className="waitlist-page min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F4F0E8] text-[#14120F] selection:bg-[#B85A3A]/25 selection:text-[#14120F]"
    >

      <WaitlistValueTicker />

      <section className="relative overflow-x-clip overflow-y-visible border-b border-[#E0D8CC]/90 bg-gradient-to-b from-[#FAF8F4] via-[#F4F0E8] to-[#F0EBE3] pb-[max(3.5rem,calc(2rem+env(safe-area-inset-bottom,0px)))] pt-4 sm:pt-5 md:pb-24 md:pt-10 lg:pb-24 lg:pt-12">
        {/* warm radial glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] opacity-70"
          aria-hidden
          style={{
            background: 'radial-gradient(ellipse 85% 90% at 50% 0%, rgba(184,90,58,0.11) 0%, transparent 68%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-40"
          aria-hidden
          style={{
            background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(212,165,116,0.06) 0%, transparent 65%)',
          }}
        />

        <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 sm:px-6">
          <div className="flex w-full min-w-0 flex-col items-center text-center">
            <div className="min-w-0 w-full max-w-2xl">
              <div data-hero className="space-y-5 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-[#E0D8CC] bg-white/80 px-4 py-2 shadow-[0_2px_12px_rgba(184,90,58,0.10)] backdrop-blur-sm animate-[hero-badge-in_0.6s_cubic-bezier(0.23,1,0.32,1)_both]">
                  <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <HeroBadgeCycler />
                </div>

                <h1 className="font-display max-w-full text-[clamp(1.25rem,3.5vw+0.5rem,2.75rem)] font-semibold tracking-tight text-[#14120F]">
                  <span className="block leading-tight">Stop guessing. Start wearing.</span>
                  <span className="mt-2 block leading-tight animate-gradient bg-gradient-to-r from-[#7A2E18] via-[#B85A3A] to-[#7A2E18] bg-[length:300%_100%] bg-clip-text text-transparent">
                    The perfume engine built for India.
                  </span>
                </h1>
              </div>
            </div>

            {/* Full-width carousel (not constrained by headline column) */}
            <div className="mt-8 w-full min-w-0 sm:mt-10">
              <HomeExploreShowcase />
            </div>

            <div className="min-w-0 w-full max-w-2xl">
              {/* Brand logos: full column width + min-w-0 so marquee cannot widen layout on mobile */}
              <div data-hero className="mx-auto mt-8 w-full min-w-0 max-w-full sm:mt-10">
                <BrandLogosSection variant="inline" eyebrow="Brands on ScentRev" />
              </div>

              {/* Waitlist email - extra top space so it reads as its own block below brands */}
              <div
                data-hero
                className="mt-12 w-full scroll-mt-20 sm:mt-14 md:mt-16 sm:scroll-mt-24"
                id="waitlist-form"
              >
            {submitted ? (
              <div className="rounded-2xl border border-[#E0D8CC] bg-white/90 px-6 py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3ED]">
                  <Sparkles className="h-7 w-7 text-[#B85A3A]" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-[#14120F]">
                  {alreadyJoined ? "You're already on the waitlist" : "You're on the list"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#3A342E]">
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
                  href="/"
                  className="mt-6 inline-block text-sm font-medium text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
                >
                  Explore the platform →
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
                <div className="mx-auto flex w-full min-w-0 max-w-md flex-col gap-2 sm:flex-row md:max-w-2xl md:gap-3">
                  <div
                    className={`relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-xl border bg-white px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-[#B85A3A]/15 md:gap-3 md:rounded-2xl md:px-5 md:py-4 ${
                      emailFieldError
                        ? 'border-[#B85A3A] focus-within:border-[#B85A3A]'
                        : 'border-[#E0D8CC] focus-within:border-[#B85A3A]/40'
                    }`}
                  >
                    <BorderBeam
                      size={110}
                      duration={8}
                      borderWidth={2}
                      colorFrom="rgba(184, 90, 58, 0)"
                      colorTo="rgba(184, 90, 58, 0.95)"
                    />
                    <Mail
                      className="relative z-[1] h-4 w-4 shrink-0 text-[#B85A3A] md:h-5 md:w-5"
                      aria-hidden
                    />
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
                      className="relative z-[1] w-full min-h-[44px] bg-transparent text-sm outline-none placeholder:text-[#7A726A] focus-visible:ring-0 focus-visible:ring-offset-0 md:min-h-0 md:text-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !emailPassesValidation}
                    className="h-12 whitespace-nowrap rounded-xl bg-[#B85A3A] px-6 text-[15px] font-semibold text-white shadow-md shadow-[#B85A3A]/20 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#A04D2F] hover:shadow-lg hover:shadow-[#B85A3A]/25 active:scale-[0.98] disabled:active:scale-100 md:h-14 md:rounded-2xl md:px-10 md:text-base"
                  >
                    {loading ? 'Joining…' : 'Get early access'}
                  </Button>
                </div>
                {emailFieldError ? (
                  <p id="waitlist-email-error" className="text-sm text-[#B85A3A]" role="alert">
                    {emailFieldError}
                  </p>
                ) : null}
                <p className="mx-auto max-w-md px-0 text-center text-[11px] leading-relaxed text-[#4E463E] [overflow-wrap:anywhere] md:max-w-2xl md:text-xs">
                  We&apos;ll email a thank-you note and keep you posted on launch.
                </p>
              </form>
            )}
          </div>

              <nav
                data-hero
                className="mx-auto mt-8 max-w-2xl sm:mt-10"
                aria-label="Explore: scent quiz, gift finder, layering lab, catalog, and subscription"
              >
                <div className="overflow-hidden rounded-2xl border border-[#D9D0C4]/85 bg-white/90 shadow-sm sm:hidden">
                  <ul className="divide-y divide-[#EDE8E0]">
                    {HERO_EXPLORE_LINKS.map((chip) => (
                      <li key={chip.href}>
                        <Link
                          href={chip.href}
                          aria-label={`${chip.name}: ${chip.t}. ${chip.a}`}
                          className="group flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors active:bg-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B85A3A]/35"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${chip.bg}`}
                          >
                            <chip.Icon
                              className={`h-[18px] w-[18px] ${chip.iconColor}`}
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </span>
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block text-[15px] font-semibold leading-tight tracking-tight text-[#0F0D0A]">
                              {chip.t}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-[#4E463E]">
                              {chip.a}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-5 w-5 shrink-0 text-[#B85A3A]/75 transition-transform duration-150 ease-out group-active:translate-x-0.5"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hidden grid-cols-5 gap-2 sm:grid">
                  {HERO_EXPLORE_LINKS.map((chip) => (
                    <Link
                      key={chip.href}
                      href={chip.href}
                      aria-label={`${chip.name}: ${chip.t}. ${chip.a}`}
                      className="group flex flex-col items-center gap-1.5 rounded-2xl border border-[#C8BFB3] bg-white px-2 py-3.5 text-center shadow-[0_2px_8px_rgba(20,18,15,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B85A3A]/40 hover:shadow-[0_6px_20px_rgba(184,90,58,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B85A3A]/35 focus-visible:ring-offset-2 active:scale-[0.97]"
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${chip.bg}`}>
                        <chip.Icon className={`h-4 w-4 ${chip.iconColor}`} strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="text-[11px] font-semibold leading-snug text-[#0F0D0A] lg:text-[12px]">
                        {chip.t}
                      </span>
                      <span className="text-[10px] font-medium leading-snug text-[#3A342E]">
                        {chip.a}
                      </span>
                    </Link>
                  ))}
                </div>
              </nav>

              <div data-hero className="mx-auto mt-8 max-w-xl sm:mt-10">
                <div className="relative overflow-hidden rounded-2xl border border-[#E8DDD6]/80 bg-gradient-to-br from-white/80 via-[#FFF7F3]/70 to-[#FDF0E8]/60 px-5 py-5 text-left shadow-[0_8px_32px_rgba(184,90,58,0.13),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" aria-hidden />
                  <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(184,90,58,0.12),transparent_70%)]" aria-hidden />

                  <div className="relative flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B85A3A]/15 to-[#D4A574]/10 ring-1 ring-[#B85A3A]/20">
                      <TrendingUp className="h-5 w-5 text-[#B85A3A]" aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug text-[#14120F]">
                        Miniature &amp; sample formats are one of the most significant growth levers for India&apos;s fragrance market.
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-[#B85A3A]/50" aria-hidden />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B85A3A]">Euromonitor, 2025</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <a
                href="#catalog-marquee"
                data-hero
                className="mt-7 inline-flex items-center justify-center gap-2 text-sm font-medium text-[#B85A3A] transition-colors hover:text-[#A04D2F] sm:mt-8"
              >
                <span>See bottles from the catalog</span>
                <ChevronDown
                  className="h-4 w-4 text-[#B85A3A] motion-safe:animate-[hero-chevron-nudge_2.2s_ease-in-out_infinite]"
                  aria-hidden
                />
              </a>
            </div>

          </div>
        </div>
      </section>

      <WaitlistCatalogMarquee sharedCatalog={marqueePicks} />

      <FragDbStatsDashboard />

      <WaitlistProblemsAndFixes />

      <WaitlistBlindBuyPipeline />

      <WaitlistFeedbackSection />

      <section className="border-t border-[#E0D8CC] bg-[#14120F] py-10 text-white">
        <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/about" className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline">Our Story</Link>
            <span className="text-white/20 hidden sm:inline">·</span>
            <a href="#waitlist-feedback" className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline">Feedback</a>
            <span className="text-white/20 hidden sm:inline">·</span>
            <a href="mailto:support@scentrev.com" className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline">support@scentrev.com</a>
            <span className="text-white/20">·</span>
            <a href="mailto:shashank@scentrev.com" className="font-medium text-[#D4A574] underline-offset-2 transition-colors hover:text-[#e0b589] hover:underline">shashank@scentrev.com</a>
          </div>
          <p className="mt-4 text-xs text-white/40">© {new Date().getFullYear()} ScentRev. Built in India.</p>
        </div>
      </section>
    </main>
  );
}
