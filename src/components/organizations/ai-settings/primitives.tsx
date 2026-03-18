"use client";

import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SettingsFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
};

export function SettingsField({
  label,
  htmlFor,
  hint,
  className,
  labelClassName,
  children,
}: SettingsFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className={cn("text-sm font-medium text-foreground", labelClassName)}
      >
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type SettingsChoiceCardProps = {
  control: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  controlPosition?: "start" | "end";
};

export function SettingsChoiceCard({
  control,
  title,
  description,
  className,
  controlPosition = "start",
}: SettingsChoiceCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-background p-3",
        className,
      )}
    >
      {controlPosition === "start" ? control : null}
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {controlPosition === "end" ? control : null}
    </div>
  );
}

type SettingsToolCardProps = {
  id?: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  tone?: "background" | "muted";
  className?: string;
};

export function SettingsToolCard({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  tone = "muted",
  className,
}: SettingsToolCardProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border p-3",
        tone === "background" ? "bg-background" : "bg-muted/30",
        className,
      )}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

type SettingsSelectFieldProps = {
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  inheritedLabel?: string;
  hint?: ReactNode;
  className?: string;
};

export function SettingsSelectField({
  label,
  value,
  onValueChange,
  placeholder,
  options,
  inheritedLabel,
  hint,
  className,
}: SettingsSelectFieldProps) {
  return (
    <SettingsField label={label} hint={hint} className={className}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {inheritedLabel ? (
            <SelectItem value="__default__">{inheritedLabel}</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsField>
  );
}
