"use client";

import { Building2, MapPinned, Plus, ShieldBan, Trash2, Wrench } from "lucide-react";
import { useState } from "react";

import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { Notice, tint, useActionError, useCanWrite, ViewOnlyBadge, type Message } from "@/components/dashboard/views/shared";
import { MapPanel } from "@/components/map/map-panel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty";
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
  const { data, error, loading, reload } = useApi(() => api.geofences(), []);
  const canWrite = useCanWrite();
  const actionError = useActionError();
  const [notice, setNotice] = useState<Message | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Geofence | null>(null);
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
    setNotice(null);
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
    } catch (cause) {
      setNotice({ tone: "error", text: actionError(cause) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (fence: Geofence) => {
    setBusy(true);
    setNotice(null);
    try {
      await api.deleteGeofence(fence.id);
      if (selected === fence.id) setSelected(null);
      reload();
    } catch (cause) {
      setNotice({ tone: "error", text: actionError(cause) });
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  return (
    <PageBody>
      <PageHeader
        title={t.geofences.title}
        lead={t.geofences.lead}
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setAdding((value) => !value)} aria-expanded={adding}>
              <Plus className="size-4" />
              {t.geofences.addTitle}
            </Button>
          ) : (
            <ViewOnlyBadge />
          )
        }
      />

      <Notice message={notice} />

      {adding && canWrite && (
        <Card>
          <CardHeader title={t.geofences.addTitle} lead={t.geofences.mapHint} />
          <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block lg:col-span-2">
              <span className="mb-1.5 block text-[12px] text-ink-secondary">{t.geofences.name}</span>
              <input
                required
                maxLength={120}
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
                min={50}
                max={50000}
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
          {loading && !data && [0, 1, 2].map((index) => <Skeleton key={index} className="h-[92px]" />)}
          {!data && error && <ErrorState compact onRetry={reload} />}
          {data && data.length === 0 && (
            <Card>
              <EmptyState icon={<MapPinned className="size-5" />} title={t.geofences.title} lead={canWrite ? t.geofences.mapHint : undefined} />
            </Card>
          )}
          {(data ?? []).map((fence) => {
            const Icon = KIND_ICON[fence.kind];
            return (
              <div
                key={fence.id}
                className={clsx(
                  "card flex w-full items-start gap-1 p-2 transition-colors",
                  selected === fence.id && "border-[var(--brand)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelected(fence.id)}
                  aria-pressed={selected === fence.id}
                  className="flex min-h-11 min-w-0 flex-1 items-start gap-3.5 rounded-xl p-2 text-start"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: tint(KIND_COLOR[fence.kind], 14), color: KIND_COLOR[fence.kind] }}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="block min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {pick(fence, "name", locale)}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-muted">
                      {t.geofences.kindLabel[fence.kind]} · {formatNumber(fence.radius_m, locale)}{" "}
                      {locale === "fa" ? "متر" : "m"}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
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
                    </span>
                  </span>
                </button>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(fence)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-[var(--critical-soft)] hover:text-[var(--critical-text)]"
                    aria-label={`${t.common.delete}: ${pick(fence, "name", locale)}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.geofences.deleteTitle}
        lead={pendingDelete ? pick(pendingDelete, "name", locale) : undefined}
        confirmLabel={t.common.delete}
        busy={busy}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </PageBody>
  );
}
