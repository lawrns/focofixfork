import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const surfaceToneClasses = {
  card: "rounded-2xl border border-border/70 bg-card shadow-sm",
  soft: "rounded-2xl border border-border/50 bg-muted/20",
  inset: "rounded-xl border border-border/60 bg-background",
  muted: "rounded-xl border border-border bg-muted/30",
  dashed: "rounded-xl border border-dashed border-border bg-muted/30",
  plain: "rounded-xl border border-border bg-card",
} as const;

const surfacePaddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

type StudioSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof surfaceToneClasses;
  padding?: keyof typeof surfacePaddingClasses;
  signal?: boolean;
  signalClassName?: string;
};

export function StudioSurface({
  tone = "card",
  padding = "md",
  signal = false,
  signalClassName,
  className,
  children,
  ...props
}: StudioSurfaceProps) {
  return (
    <div
      className={cn(
        surfaceToneClasses[tone],
        surfacePaddingClasses[padding],
        signal && "relative overflow-hidden",
        className,
      )}
      {...props}
    >
      {signal ? (
        <div
          className={cn(
            "signal-grid absolute inset-0 opacity-30",
            signalClassName,
          )}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </div>
  );
}

type StudioHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  level?: 1 | 2 | 3;
};

export function StudioHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  bodyClassName,
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
  level = 2,
}: StudioHeaderProps) {
  const HeadingTag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        actions && "lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className={cn("space-y-2", bodyClassName)}>
        {eyebrow ? (
          <div
            className={cn(
              "text-[11px] uppercase tracking-[0.22em] text-muted-foreground",
              eyebrowClassName,
            )}
          >
            {eyebrow}
          </div>
        ) : null}
        <HeadingTag
          className={cn(
            level === 1
              ? "max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.2rem]"
              : level === 2
                ? "text-lg font-semibold tracking-[-0.02em] text-foreground"
                : "text-base font-semibold tracking-[-0.02em] text-foreground",
            titleClassName,
          )}
        >
          {title}
        </HeadingTag>
        {description ? (
          <p
            className={cn(
              "max-w-3xl text-sm leading-6 text-muted-foreground",
              level === 1 && "text-base leading-7",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-col gap-3">{actions}</div>
      ) : null}
    </div>
  );
}

type StudioIconTileProps = {
  icon: LucideIcon;
  className?: string;
  tone?: "muted" | "inverse" | "signal";
};

export function StudioIconTile({
  icon: Icon,
  className,
  tone = "muted",
}: StudioIconTileProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl",
        tone === "inverse" && "bg-foreground text-background",
        tone === "signal" && "bg-[color:var(--foco-teal-dim)] text-foreground",
        tone === "muted" && "bg-muted text-foreground",
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

type StudioStatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export function StudioStatCard({
  label,
  value,
  hint,
  icon,
  className,
}: StudioStatCardProps) {
  return (
    <StudioSurface tone="card" padding="sm" className={className}>
      <div className="flex items-center gap-4">
        {icon ? (
          <StudioIconTile icon={icon} tone="inverse" className="h-11 w-11" />
        ) : null}
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          {hint ? (
            <div className="text-xs text-muted-foreground">{hint}</div>
          ) : null}
        </div>
      </div>
    </StudioSurface>
  );
}

type StudioSectionCardProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function StudioSectionCard({
  title,
  description,
  icon,
  actions,
  className,
  contentClassName,
  children,
}: StudioSectionCardProps) {
  return (
    <StudioSurface tone="card" padding="none" className={className}>
      <div className="border-b border-border/70 bg-muted/20 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {icon ? (
              <StudioIconTile icon={icon} tone="signal" className="h-11 w-11" />
            ) : null}
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">
                {title}
              </h3>
              {description ? (
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className={cn("px-6 py-6", contentClassName)}>{children}</div>
    </StudioSurface>
  );
}
