"use client";

import {
  BatteryWarning,
  BellRing,
  Car,
  Check,
  Gauge,
  MapPinned,
  Timer,
  TowerControl,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { Async, Notice, useActionError, useCanWrite, ViewOnlyBadge, type Message } from "@/components/dashboard/views/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Chip, SeverityPill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatDateTime, formatNumber, formatRelative, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { Alert, Severity } from "@/lib/types";

const KIND_ICON = {
  engine: TriangleAlert,
  geofence: MapPinned,
  speeding: Gauge,
  battery: BatteryWarning,
  idle: Timer,
  maintenance: Wrench,
  harsh: Car,
  towing: TowerControl,
} as const;

const SEVERITIES: (Severity | "all")[] = ["all", "critical", "serious", "warning", "good"];

export function AlertsView() {
  const { t, locale } = useLocale();
  const alerts = useApi(() => api.alerts({ limit: 60 }), []);
  const { data, reload } = alerts;
  const canWrite = useCanWrite();
  const actionError = useActionError();
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [tab, setTab] = useState<"open" | "done">("open");
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState<Message | null>(null);

  const rows = useMemo(
    () =>
      (data ?? []).filter((alert) => {
        if (tab === "open" && alert.acknowledged) return false;
        if (tab === "done" && !alert.acknowledged) return false;
        if (severity !== "all" && alert.severity !== severity) return false;
        return true;
      }),
    [data, tab, severity],
  );

  const openCount = (data ?? []).filter((alert) => !alert.acknowledged).length;

  const acknowledge = async (alert: Alert) => {
    setBusy(alert.id);
    setNotice(null);
    try {
      await api.acknowledgeAlert(alert.id);
      reload();
    } catch (cause) {
      setNotice({ tone: "error", text: actionError(cause) });
    } finally {
      setBusy(null);
    }
  };

  const emptyTitle = severity !== "all" ? t.common.none : tab === "open" ? t.alerts.empty : t.alerts.emptyDone;

  return (
    <PageBody>
      <PageHeader
        title={t.alerts.title}
        lead={t.alerts.lead}
        actions={canWrite ? undefined : <ViewOnlyBadge />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Chip active={tab === "open"} onClick={() => setTab("open")}>
            {t.alerts.open} ({formatNumber(openCount, locale)})
          </Chip>
          <Chip active={tab === "done"} onClick={() => setTab("done")}>
            {t.alerts.acknowledged}
          </Chip>
        </div>
        <span className="mx-1 h-5 w-px bg-[var(--line)]" aria-hidden="true" />
        <div className="scroll-thin flex items-center gap-1.5 overflow-x-auto">
          {SEVERITIES.map((value) => (
            <Chip key={value} active={severity === value} onClick={() => setSeverity(value)}>
              {value === "all" ? t.common.all : t.alerts.severityLabel[value]}
            </Chip>
          ))}
        </div>
      </div>

      <Notice message={notice} />

      <Async
        state={alerts}
        skeleton={
          <div className="space-y-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Card>
            <EmptyState icon={<BellRing className="size-5" />} title={emptyTitle} />
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((alert) => {
              const Icon = KIND_ICON[alert.kind] ?? TriangleAlert;
              return (
                <li key={alert.id}>
                  <Card className={clsx("flex gap-4", alert.acknowledged && "opacity-70")}>
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        background: `var(--${alert.severity}-soft)`,
                        color: `var(--${alert.severity})`,
                      }}
                    >
                      <Icon className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14.5px] font-semibold text-ink">
                          {pick(alert, "title", locale)}
                        </h3>
                        <SeverityPill
                          severity={alert.severity}
                          label={t.alerts.severityLabel[alert.severity]}
                        />
                        <span className="rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] text-ink-muted">
                          {t.alerts.kindLabel[alert.kind]}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                        {pick(alert, "message", locale)}
                      </p>
                      <p className="mt-2 text-[11.5px] text-ink-muted">
                        {formatRelative(alert.occurred_at, locale)} · {formatDateTime(alert.occurred_at, locale)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-start">
                      {alert.acknowledged ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--good-soft)] px-2.5 py-1.5 text-[12px] text-[var(--good-text)]">
                          <Check className="size-3.5" />
                          {t.alerts.acknowledged}
                        </span>
                      ) : (
                        canWrite && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => acknowledge(alert)}
                            disabled={busy === alert.id}
                            aria-label={t.alerts.acknowledge}
                          >
                            <Check className="size-3.5" />
                            <span className="hidden sm:inline">{t.alerts.acknowledge}</span>
                          </Button>
                        )
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Async>
    </PageBody>
  );
}
