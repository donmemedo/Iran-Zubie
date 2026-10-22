"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { fade, spring, useShift } from "@/components/ui/motion";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import { useLocale } from "@/lib/locale-context";

/** Destructive-action confirmation. Cancel holds initial focus; Escape and the scrim cancel. */
export function ConfirmDialog({
  open,
  title,
  lead,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  lead?: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const ref = useFocusTrap<HTMLDivElement>(open, onCancel);
  const shift = useShift(8);
  const id = useId();
  const hidden = { opacity: 0, y: shift, scale: shift ? 0.96 : 1 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            className="scrim absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            ref={ref}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={lead ? `${id}-lead` : undefined}
            tabIndex={-1}
            initial={hidden}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={hidden}
            transition={shift ? spring : fade}
            className="relative w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-pop)]"
          >
            <h2 id={`${id}-title`} className="text-[17px] font-semibold tracking-title text-ink">
              {title}
            </h2>
            {lead && (
              <p id={`${id}-lead`} className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
                {lead}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={onCancel} data-autofocus>
                {t.common.cancel}
              </Button>
              <Button variant="danger" onClick={onConfirm} disabled={busy}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
