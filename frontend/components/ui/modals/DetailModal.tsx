"use client";

import { LuPencil } from "react-icons/lu";
import type { IconType } from "react-icons";
import type { ReactNode } from "react";
import { cn } from "@utils/libs/cn";
import { Button } from "../buttons/Button";
import { Badge } from "../data-display/Badge";
import { Modal } from "./Modal";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const iconTones: Record<Tone, string> = {
  neutral: "bg-surface-inset text-foreground-muted",
  accent: "bg-accent text-foreground-on-accent shadow-accent",
  success: "bg-success text-foreground-on-accent shadow-success",
  warning: "bg-warning text-foreground-on-accent",
  danger: "bg-danger text-foreground-on-accent shadow-danger",
};

const highlightTones: Record<Tone, string> = {
  neutral: "border-border bg-surface-muted text-foreground-strong",
  accent: "border-accent-ring bg-accent-soft text-accent-text",
  success: "border-success-ring bg-success-soft text-success-text",
  warning: "border-warning-ring bg-warning-soft text-warning-text",
  danger: "border-danger-ring bg-danger-soft text-danger-text",
};

export interface DetailField {
  label: string;
  value: ReactNode;
  /** Spans the full row — for addresses and anything else that needs the room. */
  wide?: boolean;
}

/** A figure that deserves to be read before the field list — a price, a count. */
export interface DetailHighlight {
  label: string;
  value: ReactNode;
  tone?: Tone;
  caption?: string;
}

interface DetailModalProps {
  title: string;
  heading: string;
  /** The record's id, rendered as a mono chip. */
  meta?: string;
  icon?: IconType;
  iconTone?: Tone;
  badges?: {
    label: string;
    tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  }[];
  highlights?: DetailHighlight[];
  fields: DetailField[];
  onClose: () => void;
  /** Omit to make the dialog purely read-only. */
  onEdit?: () => void;
}

/**
 * Read-only record detail, in three bands: an identity header, optional
 * highlight tiles for the figures worth reading first, then the full field list.
 *
 * Registry cards and rows truncate aggressively to stay scannable — a long email
 * or address is cut off with an ellipsis — so this is the one place a record is
 * shown whole, with values wrapping instead of clipping.
 *
 * Generic over its props rather than one modal per feature: customers, products
 * and couriers would otherwise be three near-identical files that drift apart.
 */
export function DetailModal({
  title,
  heading,
  meta,
  icon: Icon,
  iconTone = "accent",
  badges,
  highlights,
  fields,
  onClose,
  onEdit,
}: DetailModalProps) {
  return (
    <Modal
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onEdit ? (
            <Button icon={LuPencil} onClick={onEdit}>
              Edit
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-3">
        {/* ── Identity ─────────────────────────────────────────────── */}
        <div className="bg-surface-muted rounded-control flex items-center gap-3.5 p-4">
          {Icon ? (
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                iconTones[iconTone],
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <h4 className="text-foreground-strong wrap-break-word text-base font-bold">
              {heading}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {meta ? (
                <span className="text-foreground-subtle text-xs font-semibold">
                  {meta}
                </span>
              ) : null}
              {badges?.map((badge) => (
                <Badge
                  key={badge.label}
                  tone={badge.tone ?? "neutral"}
                  pill
                  uppercase
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* ── Highlights ───────────────────────────────────────────── */}
        {highlights?.length ? (
          <div
            className={cn(
              "grid gap-2",
              highlights.length >= 3 ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {highlights.map((highlight) => (
              <div
                key={highlight.label}
                className={cn(
                  "rounded-control border p-3",
                  highlightTones[highlight.tone ?? "neutral"],
                )}
              >
                <p className="text-nano font-bold tracking-wide uppercase opacity-70">
                  {highlight.label}
                </p>
                <p className="font-display mt-1 text-lg font-bold">
                  {highlight.value}
                </p>
                {highlight.caption ? (
                  <p className="text-nano mt-0.5 opacity-70">
                    {highlight.caption}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Fields ───────────────────────────────────────────────── */}
        {/* No outer frame: hairlines between rows carry the structure, which
            keeps the dialog lighter than a boxed table would. */}
        <dl className="flex flex-col">
          {fields.map((field, index) => (
            <div
              key={field.label}
              className={cn(
                "py-3",
                index > 0 && "border-border-subtle border-t",
              )}
            >
              <dt className="text-micro text-foreground-subtle font-bold tracking-wide uppercase">
                {field.label}
              </dt>
              {/* Wraps rather than truncates — showing the whole value is the
                  entire reason this dialog exists. */}
              <dd className="text-foreground wrap-break-word mt-0.5 text-sm font-semibold">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
