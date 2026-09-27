"use client";

import { Check, Download, Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { clsx } from "@/lib/format";
import { switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { usePathname, useRouter } from "next/navigation";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-3 last:border-0">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className="truncate text-[13.5px] font-medium text-ink">{value}</span>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--line)] py-3.5 last:border-0">
      <span className="text-[13.5px] text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-[var(--brand)]" : "bg-[var(--line-strong)]",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all duration-200",
            checked ? "ltr:left-[22px] rtl:right-[22px]" : "ltr:left-0.5 rtl:right-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function SettingsView() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notifications, setNotifications] = useState({
    engine: true,
    geofence: true,
    speeding: true,
    maintenance: true,
    digest: false,
  });

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const themes: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: "light", label: t.common.themeLight, icon: Sun },
    { value: "dark", label: t.common.themeDark, icon: Moon },
    { value: "system", label: t.common.themeSystem, icon: Monitor },
  ];

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  return (
    <PageBody>
      <PageHeader title={t.settings.title} lead={t.settings.lead} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.settings.profile} />
          <div className="mt-3">
            <Row
              label={t.auth.fullName}
              value={(locale === "fa" ? user?.full_name_fa : user?.full_name) ?? "—"}
            />
            <Row label={t.auth.email} value={user?.email ?? "—"} />
            <Row label={t.drivers.phone} value={user?.phone || "—"} />
            <Row label={t.settings.role} value={user?.role ?? "—"} />
          </div>
        </Card>

        <Card>
          <CardHeader title={t.settings.organization} />
          <div className="mt-3">
            <Row
              label={t.auth.company}
              value={(locale === "fa" ? user?.organization.name_fa : user?.organization.name) ?? "—"}
            />
            <Row label={t.settings.plan} value={user?.organization.plan ?? "—"} />
            <Row
              label={t.settings.city}
              value={(locale === "fa" ? user?.organization.city_fa : user?.organization.city) ?? "—"}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t.settings.appearance} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {themes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={clsx(
                  "flex flex-col items-center gap-2 rounded-xl border p-3.5 transition-colors",
                  theme === option.value
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--line)] text-ink-secondary hover:border-[var(--line-strong)]",
                )}
              >
                <option.icon className="size-5" />
                <span className="text-[12px]">{option.label}</span>
              </button>
            ))}
          </div>

          <p className="mt-6 mb-2 text-[12.5px] font-medium text-ink-secondary">{t.common.language}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["fa", "en"] as Locale[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => router.push(switchLocalePath(pathname, value))}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-xl border py-3 text-[13px] transition-colors",
                  locale === value
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--line)] text-ink-secondary hover:border-[var(--line-strong)]",
                )}
              >
                {value === "fa" ? "فارسی" : "English"}
                {locale === value && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.settings.notifications} />
          <div className="mt-3">
            <Toggle
              label={t.settings.notifyEngine}
              checked={notifications.engine}
              onChange={(next) => setNotifications({ ...notifications, engine: next })}
            />
            <Toggle
              label={t.settings.notifyGeofence}
              checked={notifications.geofence}
              onChange={(next) => setNotifications({ ...notifications, geofence: next })}
            />
            <Toggle
              label={t.settings.notifySpeeding}
              checked={notifications.speeding}
              onChange={(next) => setNotifications({ ...notifications, speeding: next })}
            />
            <Toggle
              label={t.settings.notifyMaintenance}
              checked={notifications.maintenance}
              onChange={(next) => setNotifications({ ...notifications, maintenance: next })}
            />
            <Toggle
              label={t.settings.notifyDigest}
              checked={notifications.digest}
              onChange={(next) => setNotifications({ ...notifications, digest: next })}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Smartphone className="size-5" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">{t.settings.installTitle}</h3>
                <p className="mt-1 max-w-md text-[13px] leading-relaxed text-ink-muted">
                  {t.settings.installLead}
                </p>
              </div>
            </div>
            <Button onClick={install} disabled={installed || !installEvent}>
              <Download className="size-4" />
              {installed ? t.settings.installed : t.settings.install}
            </Button>
          </div>
        </Card>
      </div>
    </PageBody>
  );
}
