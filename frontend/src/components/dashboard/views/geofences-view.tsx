"use client";

import { Building2, MapPinned, Plus, ShieldBan, Trash2, Wrench } from "lucide-react";
import { useState } from "react";

import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { MapPanel } from "@/components/map/map-panel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatNumber, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { Geofence } from "@/lib/types";

const KIND_ICON = {
  depot: Building2,
  customer: MapPinned,
  restricted: ShieldBan,
  service: Wrench,
} as const;

const KIND_COLOR: Record<Geofence["kind"], string> = {
  depot: "var(--series-1)",
  customer: "var(--series-3)",
  restricted: "var(--critical)",
  service: "var(--series-4)",
};

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[13.5px] " +
  "text-ink transition-colors focus:border-[var(--brand)] focus:outline-none";

export function GeofencesView() {
  const { t, locale } = useLocale();
  const { data, loading, reload } = useApi(() => api.geofences(), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name_fa: "",
    kind: "customer" as Geofence["kind"],
    radius_m: 500,
    lat: 35.6892,
    lng: 51.389,
  });
  const [busy, setBusy] = useState(false);

  const focus = data?.find((fence) => fence.id === selected) ?? null;

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createGeofence({
        name: form.name_fa,
        name_fa: form.name_fa,
        kind: form.kind,
        lat: form.lat,
        lng: form.lng,
        radius_m: form.radius_m,
      });
      setAdding(false);
      setForm((current) => ({ ...current, name_fa: "" }));
      reload();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (fence: Geofence) => {
    setBusy(true);
    try {
      await api.deleteGeofence(fence.id);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageBody>
      <PageHeader
        title={t.geofences.title}
        lead={t.geofences.lead}
        actions={
          <Button size="sm" onClick={() => setAdding((value) => !value)}>
            <Plus className="size-4" />
            {t.geofences.addTitle}
          </Button>
        }
      />

      {adding && (
        <Card>
          <CardHeader title={t.geofences.addTitle} lead={t.geofences.mapHint} />
          <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block lg:col-span-2">
              <span className="mb-1.5 block text-[12px] text-ink-secondary">{t.geofences.name}</span>
              <input
                required
                value={form.name_fa}
                onChange={(event) => setForm({ ...form, name_fa: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-ink-secondary">{t.geofences.kind}</span>
              <select
                value={form.kind}
                onChange={(event) =>
                  setForm({ ...form, kind: event.target.value as Geofence["kind"] })
                }
                className={inputClass}
              >
                {(Object.keys(KIND_COLOR) as Geofence["kind"][]).map((kind) => (
                  <option key={kind} value={kind}>
                    {t.geofences.kindLabel[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-ink-secondary">{t.geofences.radius}</span>
              <input
                type="number"
                min={100}
                step={50}
                value={form.radius_m}
                onChange={(event) => setForm({ ...form, radius_m: Number(event.target.value) })}
                className={`${inputClass} tnum`}
                style={{ direction: "ltr" }}
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={busy}>
                {t.common.save}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-2.5">
          {loading && [0, 1, 2].map((index) => <Skeleton key={index} className="h-[92px]" />)}
          {(data ?? []).map((fence) => {
            const Icon = KIND_ICON[fence.kind];
            return (
              <button
                key={fence.id}
                type="button"
                onClick={() => setSelected(fence.id)}
                className={clsx(
                  "card flex w-full items-start gap-3.5 p-4 text-start transition-colors",
                  selected === fence.id && "border-[var(--brand)]",
                )}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${KIND_COLOR[fence.kind]}1f`, color: KIND_COLOR[fence.kind] }}
                >
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {pick(fence, "name", locale)}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">
                    {t.geofences.kindLabel[fence.kind]} · {formatNumber(fence.radius_m, locale)}{" "}
                    {locale === "fa" ? "متر" : "m"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {fence.alert_on_enter && (
                      <span className="rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-[10.5px] text-ink-muted">
                        {t.geofences.onEnter}
                      </span>
                    )}
                    {fence.alert_on_exit && (
                      <span className="rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-[10.5px] text-ink-muted">
                        {t.geofences.onExit}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(fence);
                  }}
                  onKeyDown={(event) => event.key === "Enter" && remove(fence)}
                  className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-[var(--critical-soft)] hover:text-[var(--critical-text)]"
                  aria-label={t.common.delete}
                >
                  <Trash2 className="size-4" />
                </span>
              </button>
            );
          })}
        </div>

        <Card padded={false} className="flex overflow-hidden">
          <div className="h-[420px] w-full lg:h-auto lg:min-h-[520px]">
            <MapPanel
              vehicles={[]}
              geofences={data ?? []}
              fitToVehicles={false}
              center={focus ? [focus.lat, focus.lng] : [35.6892, 51.389]}
              flyTo={focus ? [focus.lat, focus.lng] : null}
              zoom={11}
            />
          </div>
        </Card>
      </div>
    </PageBody>
  );
}
