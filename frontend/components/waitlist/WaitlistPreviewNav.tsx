"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Menu } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/quiz", label: "Quiz" },
  { href: "/layering-lab", label: "Layering Lab" },
  { href: "/catalog", label: "Catalog" },
  { href: "/subscribe", label: "Subscribe" },
] as const;

export function WaitlistPreviewNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#0F0F0F]">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 select-none group" onClick={() => setOpen(false)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#1C1C1E] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors group-hover:bg-[#2A2A2C]">
              <span className="font-sans text-sm font-semibold text-white">S</span>
            </div>
            <div className="flex flex-col leading-none gap-[3px]">
              <span className="font-sans text-[1.05rem] font-light tracking-[-0.01em] text-white">ScentRev</span>
              <span className="text-[8px] font-semibold tracking-[0.22em] uppercase" style={{ color: '#C9A96E' }}>WAITLIST</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 sm:flex">
            {LINKS.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-all ${
                    label === 'Subscribe'
                      ? active
                        ? 'text-[#F0C060]'
                        : 'text-[#F0C060]/90 hover:text-[#F0C060]'
                      : active
                        ? 'text-white'
                        : 'text-white/90 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-white/10 ring-1 ring-inset ring-white/[0.12]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white sm:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[99] bg-black/60 sm:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.nav
              key="drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 right-0 top-12 z-[100] border-b border-white/[0.08] bg-[#0F0F0F] px-4 pb-4 pt-2 sm:hidden"
            >
              {LINKS.map(({ href, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      label === 'Subscribe'
                        ? active
                          ? 'bg-white/[0.08] text-[#F0C060]'
                          : 'text-[#F0C060]/90 hover:bg-white/[0.04] hover:text-[#F0C060]'
                        : active
                          ? 'bg-white/[0.08] text-white'
                          : 'text-white/50 hover:bg-white/[0.04] hover:text-white/90'
                    }`}
                  >
                    {label}
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[#B85A3A]" />}
                  </Link>
                );
              })}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
