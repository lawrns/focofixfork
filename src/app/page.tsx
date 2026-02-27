'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Mic,
  GitBranch,
  CheckCircle,
  MessageSquare,
  Clock,
  Sparkles,
  Users,
  Zap,
  Terminal,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Terminal mockup data ─────────────────────────────────────── */
const terminalLines = [
  { delay: 0,    text: '$ foco create "Redesign checkout and migrate to Stripe"', type: 'cmd' },
  { delay: 600,  text: '  ◆ Analyzing intent...', type: 'info' },
  { delay: 1100, text: '  ✓ 4 tasks structured', type: 'ok' },
  { delay: 1500, text: '  ✓ Auto-assigned to team', type: 'ok' },
  { delay: 1900, text: '  ✓ Timeline: ~12h estimated', type: 'ok' },
  { delay: 2400, text: '  → branch/checkout-stripe-migration', type: 'branch' },
  { delay: 2900, text: '  ✓ Proposal ready for review', type: 'ok' },
];

const features = [
  {
    slash: '01',
    title: 'Voice proposals',
    desc: 'Speak your ideas. AI converts them into structured proposals with tasks, assignments and automatic estimates.',
    icon: Mic,
  },
  {
    slash: '02',
    title: 'Project branching',
    desc: 'Like Git but for project management. Create branches, review impact side by side, approve and merge when ready.',
    icon: GitBranch,
  },
  {
    slash: '03',
    title: 'Native WhatsApp',
    desc: 'Operate from anywhere. Dictate proposals, check status and create tasks directly from WhatsApp.',
    icon: MessageSquare,
  },
  {
    slash: '04',
    title: 'Multi-workspace',
    desc: 'One place for all your projects, teams and clients. Roles, permissions and visibility per workspace.',
    icon: Users,
  },
];

const stats = [
  { value: '10×', label: 'Faster than spreadsheets' },
  { value: '94%', label: 'Fewer status meetings' },
  { value: '2 min', label: 'To create a complete project' },
];

/* ─── Terminal component ───────────────────────────────────────── */
function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    terminalLines.forEach((line, idx) => {
      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, idx]);
      }, line.delay);
      return () => clearTimeout(t);
    });
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
            foco · terminal
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
                line.type === 'ok'    ? 'text-[color:var(--foco-teal)]' :
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
            <Image src="/focologo.png" alt="Foco" width={26} height={26} className="w-6.5 h-6.5 rounded-md" />
            <span className="text-[15px] font-semibold tracking-tight">Foco</span>
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
                  AI · Projects · Team
                </span>
              </div>

              <h1 className="animate-slide-up text-5xl lg:text-[62px] font-bold tracking-[-0.03em] leading-[1.02] mb-6 text-foreground">
                The{' '}
                <span className="teal-underline">intelligence</span>
                {' '}layer for your projects
              </h1>

              <p className="animate-slide-up-delay text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
                Speak. AI structures. Your team executes.
                Foco turns ideas into actionable projects —
                with branching, review and merge like Git.
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
              Built for teams
              <br />
              that move fast
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

      {/* ── Proposal flow ──────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono-display text-muted-foreground tracking-widest uppercase">
              Proposal system
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mt-3 text-foreground">
              Ideas → Tasks{' '}
              <span className="text-[color:var(--foco-teal)]">in seconds</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: Mic,
                title: 'Describe your idea',
                desc: 'Speak, write or upload documents. AI understands context and extracts tasks automatically.',
                preview: '"We need to redesign the checkout and migrate to Stripe before launch..."',
              },
              {
                step: '02',
                icon: GitBranch,
                title: 'Structured proposal',
                desc: 'AI creates a branch-style proposal with tasks, assignments and a comparative timeline.',
                preview: null,
                chips: ['+ 4 new tasks', '~ 12h estimated', '2 assigned'],
              },
              {
                step: '03',
                icon: CheckCircle,
                title: 'Approve and execute',
                desc: 'Review, adjust and approve line by line. One click to merge into the live project.',
                preview: null,
                actions: true,
              },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-6 hover:border-[color:var(--foco-teal)] transition-colors group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-lg bg-[color:var(--foco-teal-dim)] flex items-center justify-center group-hover:teal-glow transition-all">
                    <card.icon className="w-5 h-5 text-[color:var(--foco-teal)]" />
                  </div>
                  <span className="text-[11px] font-mono-display text-muted-foreground tracking-widest">
                    /{card.step}
                  </span>
                </div>

                <h3 className="text-[16px] font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{card.desc}</p>

                {card.preview && (
                  <div className="p-3 rounded-lg bg-secondary/60 border border-border">
                    <p className="text-[12px] text-muted-foreground italic font-light">{card.preview}</p>
                  </div>
                )}

                {card.chips && (
                  <div className="flex flex-wrap gap-2">
                    {card.chips.map((chip, j) => (
                      <span
                        key={j}
                        className="px-2.5 py-1 text-[11px] font-mono-display rounded-md bg-secondary/60 text-muted-foreground border border-border"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

                {card.actions && (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-[12px] bg-[color:var(--foco-teal)] text-[hsl(var(--primary-foreground))] hover:opacity-90 px-3">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[12px] px-3">
                      <MessageSquare className="w-3.5 h-3.5 mr-1" />
                      Review
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits strip ─────────────────────────────────────── */}
      <section className="py-12 px-6 border-t border-border bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: 'Automatic estimates' },
              { icon: Users, label: 'Smart assignment' },
              { icon: GitBranch, label: 'Comparative timeline' },
              { icon: Zap, label: 'Instant merge' },
            ].map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-[color:var(--foco-teal)] transition-colors"
              >
                <b.icon className="w-4 h-4 text-[color:var(--foco-teal)] flex-shrink-0" />
                <span className="text-[13px] text-foreground">{b.label}</span>
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
            Your team deserves
            <br />
            better tools
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Create your account. Invite your team. Speak your first project.
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
            <Image src="/focologo.png" alt="Foco" width={20} height={20} className="w-5 h-5 rounded opacity-80" />
            <span className="text-[14px] font-medium text-foreground">Foco</span>
          </div>
          <span className="text-[13px] text-muted-foreground font-mono-display">© 2026 Fyves</span>
        </div>
      </footer>
    </div>
  );
}
