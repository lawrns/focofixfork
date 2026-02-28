'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Terminal,
  ChevronRight,
  Cpu,
  Activity,
  Shield,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Terminal mockup data ─────────────────────────────────────── */
const terminalLines = [
  { delay: 0,    text: '$ critter dispatch --agent recon-7 --task "Scan staging endpoints"', type: 'cmd' },
  { delay: 600,  text: '  ◆ Connecting to gateway...', type: 'info' },
  { delay: 1100, text: '  ✓ Agent recon-7 acknowledged', type: 'ok' },
  { delay: 1500, text: '  ✓ Run #4812 started', type: 'ok' },
  { delay: 1900, text: '  → Streaming logs to ledger', type: 'branch' },
  { delay: 2400, text: '  ✓ 23 endpoints scanned, 0 anomalies', type: 'ok' },
  { delay: 2900, text: '  ✓ Run completed in 8.2s', type: 'ok' },
];

const features = [
  {
    slash: '01',
    title: 'Mission Control',
    desc: 'Dispatch agents with a single click. Monitor real-time status, pause or kill any run instantly from one unified console.',
    icon: Cpu,
  },
  {
    slash: '02',
    title: 'Live Log Stream',
    desc: 'Every agent action is recorded to an immutable ledger. Stream logs in real time or replay any past execution step by step.',
    icon: Activity,
  },
  {
    slash: '03',
    title: 'Fleet Policies',
    desc: 'Define guardrails for your entire fleet. Rate limits, kill switches, and approval gates — enforced before agents act.',
    icon: Shield,
  },
  {
    slash: '04',
    title: 'Execution Ledger',
    desc: 'Full audit trail of every dispatch, every event, every outcome. Filter, search, and export for compliance or debugging.',
    icon: BookOpen,
  },
];

const stats = [
  { value: '< 5s', label: 'Dispatch latency' },
  { value: '500+', label: 'Events/hr capacity' },
  { value: '1-click', label: 'Kill switch' },
];

/* ─── Terminal component ───────────────────────────────────────── */
function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    const timers = terminalLines.map((line, idx) =>
      setTimeout(() => {
        setVisibleLines(prev => [...prev, idx]);
      }, line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-2xl shadow-black/40">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-mono-display tracking-wide">
            critter · terminal
          </span>
        </div>
        <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {/* Terminal body */}
      <div className="p-5 font-mono-display text-[13px] leading-6 min-h-[200px] space-y-1">
        {terminalLines.map((line, idx) => (
          <div
            key={idx}
            className={`transition-all duration-300 ${
              visibleLines.includes(idx)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-1'
            }`}
          >
            <span
              className={
                line.type === 'cmd'    ? 'text-foreground' :
                line.type === 'ok'     ? 'text-[color:var(--foco-teal)]' :
                line.type === 'branch' ? 'text-amber-400' :
                'text-muted-foreground'
              }
            >
              {line.text}
            </span>
          </div>
        ))}
        {/* Blinking cursor */}
        <div className="terminal-cursor text-[color:var(--foco-teal)] opacity-80" />
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/focologo.png" alt="Critter" width={26} height={26} className="w-6.5 h-6.5 rounded-md" />
            <span className="text-[15px] font-semibold tracking-tight">Critter</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              asChild
              size="sm"
              className="text-[13px] h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="text-[13px] h-8 px-4 font-medium bg-[color:var(--foco-teal)] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
            >
              <Link href="/register">Get started <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — copy */}
            <div>
              <div className="animate-slide-up mb-5">
                <span className="inline-flex items-center gap-2 text-xs font-mono-display text-[color:var(--foco-teal)] tracking-wider uppercase">
                  <span className="w-4 h-px bg-[color:var(--foco-teal)]" />
                  Agents · Runs · Ledger
                </span>
              </div>

              <h1 className="animate-slide-up text-5xl lg:text-[62px] font-bold tracking-[-0.03em] leading-[1.02] mb-6 text-foreground">
                Visual{' '}
                <span className="teal-underline">orchestration</span>
                {' '}for autonomous agents
              </h1>

              <p className="animate-slide-up-delay text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
                Dispatch agents, monitor runs, inspect logs — one dashboard for your entire fleet.
              </p>

              <div className="animate-slide-up-delay-2 flex items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-11 px-6 text-[15px] font-semibold bg-[color:var(--foco-teal)] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity teal-glow"
                >
                  <Link href="/register">
                    Get started free
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <span className="text-[13px] text-muted-foreground font-light">
                  No card · 100% free
                </span>
              </div>
            </div>

            {/* Right — terminal */}
            <div className="animate-fade-in">
              <TerminalMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────── */}
      <section className="border-y border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold font-mono-display text-[color:var(--foco-teal)] mb-2 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-[13px] text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <span className="text-xs font-mono-display text-muted-foreground tracking-widest uppercase">
              Features
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mt-3 text-foreground">
              Everything you need
              <br />
              to run a fleet
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px border border-border rounded-xl overflow-hidden bg-border">
            {features.map((feat, i) => (
              <div
                key={i}
                className="bg-background p-8 group hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[color:var(--foco-teal-dim)] flex items-center justify-center group-hover:teal-glow transition-all">
                    <feat.icon className="w-5 h-5 text-[color:var(--foco-teal)]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono-display text-muted-foreground mb-1 tracking-widest">
                      /{feat.slash}
                    </div>
                    <h3 className="text-[17px] font-semibold text-foreground mb-2 tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-32 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-3">
            <span className="text-xs font-mono-display text-[color:var(--foco-teal)] tracking-widest uppercase">
              Start now
            </span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-bold tracking-[-0.03em] text-foreground mb-5 leading-tight">
            Your agents need
            <br />
            a control room
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Create your account. Connect your fleet. Dispatch your first agent.
          </p>
          <Button
            asChild
            size="lg"
            className="h-12 px-8 text-[15px] font-semibold bg-[color:var(--foco-teal)] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity teal-glow"
          >
            <Link href="/register">
              Create free account
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/focologo.png" alt="Critter" width={20} height={20} className="w-5 h-5 rounded opacity-80" />
            <span className="text-[14px] font-medium text-foreground">Critter</span>
          </div>
          <span className="text-[13px] text-muted-foreground font-mono-display">&copy; 2026 Fyves</span>
        </div>
      </footer>
    </div>
  );
}
