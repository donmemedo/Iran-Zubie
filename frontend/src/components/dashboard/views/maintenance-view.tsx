"use client";

import { CircleCheck, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Chip } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatDate, formatNumber, formatToman, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { MaintenanceTask } from "@/lib/types";

const STATUS_TONE: Record<MaintenanceTask["status"], string> = {
  overdue: "critical",
  due: "warning",
  upcoming: "good",
  done: "good",
};

const FILTERS: (MaintenanceTask["status"] | "all")[] = ["all", "overdue", "due", "upcoming", "done"];

export function MaintenanceView() {
  const { t, locale } = useLocale();
  const { data, loading, reload } = useApi(() => api.maintenance(), []);
  const { data: forecast } = useApi(() => api.maintenanceForecast(), []);
  const { data: vehicles } = useApi(() => api.vehicles(), []);
  const [filter, setFilter] = useState<MaintenanceTask["status"] | "all">("all");
  const [busy, setBusy] = useState<number | null>(null);

  const vehicleName = useMemo(() => {
    const map = new Map<number, string>();
    for (const vehicle of vehicles ?? []) map.set(vehicle.id, pick(vehicle, "name", locale));
    return map;
  }, [vehicles, locale]);

  const rows = (data ?? []).filter((task) => filter === "all" || task.status === filter);

  const complete = async (task: MaintenanceTask) => {
    setBusy(task.id);
    try {
      await api.completeMaintenance(task.id);
      reload();
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<MaintenanceTask>[] = [
    {
      key: "task",
      header: t.maintenance.task,
      cell: (task) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{pick(task, "title", locale)}</p>
          <p className="truncate text-[11.5px] text-ink-muted">
            {vehicleName.get(task.vehicle_id) ?? `#${task.vehicle_id}`}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: t.vehicles.status,
      cell: (task) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            background: `var(--${STATUS_TONE[task.status]}-soft)`,
            color: task.status === "overdue" ? "var(--critical-text)" : "var(--ink)",
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: `var(--${STATUS_TONE[task.status]})` }}
          />
          {t.maintenance.statusLabel[task.status]}
        </span>
      ),
    },
    {
      key: "due",
      header: t.maintenance.due,
      numeric: true,
      hideBelow: "sm",
      cell: (task) => (task.due_date ? formatDate(task.due_date, locale) : "—"),
    },
    {
      key: "dueKm",
      header: t.maintenance.dueKm,
      numeric: true,
      hideBelow: "lg",
      cell: (task) => formatNumber(task.due_km, locale),
    },
    {
      key: "cost",
      header: t.maintenance.cost,
      numeric: true,
      hideBelow: "md",
      cell: (task) => `${formatToman(task.cost_toman, locale)} ${t.common.toman}`,
    },
    {
      key: "action",
      header: "",
      numeric: true,
      cell: (task) =>
        task.status === "done" ? (
          <CircleCheck className="ms-auto size-4 text-[var(--good)]" />
        ) : (
          <Button size="sm" variant="ghost" onClick={() => complete(task)} disabled={busy === task.id}>
            {t.maintenance.markDone}
          </Button>
        ),
    },
  ];

  return (
    <PageBody>
      <PageHeader title={t.maintenance.title} lead={t.maintenance.lead} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {forecast ? (
          <>
            <StatTile
              label={t.maintenance.summaryOverdue}
              value={formatNumber(forecast.overdue, locale)}
              icon={Wrench}
              accent="var(--critical)"
            />
            <StatTile
              label={t.maintenance.summaryDue}
              value={formatNumber(forecast.due, locale)}
              icon={Wrench}
              accent="var(--warning)"
            />
            <StatTile
              label={t.maintenance.summaryUpcoming}
              value={formatNumber(forecast.upcoming, locale)}
              icon={Wrench}
              accent="var(--good)"
            />
            <StatTile
              label={t.maintenance.summaryCost}
              value={formatToman(forecast.open_cost_toman, locale)}
              unit={t.common.toman}
              icon={Wrench}
              accent="var(--series-1)"
            />
          </>
        ) : (
          [0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-[124px]" />)
        )}
      </div>

      <div className="scroll-thin flex items-center gap-1.5 overflow-x-auto">
        {FILTERS.map((value) => (
          <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
            {value === "all" ? t.common.all : t.maintenance.statusLabel[value]}
          </Chip>
        ))}
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className={clsx("h-14")} />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            empty={<EmptyState icon={<Wrench className="size-5" />} title={t.common.none} />}
          />
        )}
      </Card>
    </PageBody>
  );
}
