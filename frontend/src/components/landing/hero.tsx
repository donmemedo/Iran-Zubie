"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Gauge, Play, Radio, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Aurora } from "@/components/landing/aurora";
import { MapPanel } from "@/components/map/map-panel";
import { ButtonLink } from "@/components/ui/button";
import { formatDecimal, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";
import type { TelemetryVehicle, Vehicle } from "@/lib/types";

/** The hero map shows a small simulated fleet, so the landing page is alive without any account. */
const DEMO_BOUNDS = { latMin: 35.58, latMax: 35.82, lngMin: 51.2, lngMax: 51.58 };

/** Deterministic, so server and client render the same first frame (no hydration mismatch). */
function seedDemoFleet(): Record<number, TelemetryVehicle> {
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const fleet: Record<number, TelemetryVehicle> = {};
  for (let id = 1; id <= 14; id += 1) {
    const roll = next();
    fleet[id] = {
      id,
      lat: DEMO_BOUNDS.latMin + next() * (DEMO_BOUNDS.latMax - DEMO_BOUNDS.latMin),
      lng: DEMO_BOUNDS.lngMin + next() * (DEMO_BOUNDS.lngMax - DEMO_BOUNDS.lngMin),
      heading: next() * 360,
      speed_kmh: roll < 0.7 ? 28 + next() * 50 : 0,
      status: roll < 0.7 ? "moving" : roll < 0.85 ? "idle" : "parked",
      fuel_percent: 40 + next() * 55,
      odometer_km: 20000 + next() * 90000,
      engine_rpm: 0,
      coolant_c: 88,
      battery_volt: 12.6,
      health_score: 80 + next() * 18,
      last_seen: null,
    };
  }
  return fleet;
}

/**
 * The landing page is public, so it must never open the private telemetry socket.
 * It animates a few illustrative vehicles locally instead.
 */
function useDemoFleet(paused: boolean | null) {
  const [fleet, setFleet] = useState(seedDemoFleet);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setFleet((current) => {
        const nextFleet: Record<number, TelemetryVehicle> = {};
        for (const item of Object.values(current)) {
          if (item.status !== "moving") {
            nextFleet[item.id] = item;
            continue;
          }
          const heading = (item.heading + (Math.random() - 0.5) * 28 + 360) % 360;
          const speed = Math.max(12, Math.min(110, item.speed_kmh + (Math.random() - 0.5) * 12));
          const km = speed * (2 / 3600) * 26;
          const rad = (heading * Math.PI) / 180;
          let lat = item.lat + (km / 111) * Math.cos(rad);
          let lng = item.lng + (km / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad);
          let turned = heading;
          if (lat < DEMO_BOUNDS.latMin || lat > DEMO_BOUNDS.latMax || lng < DEMO_BOUNDS.lngMin || lng > DEMO_BOUNDS.lngMax) {
            lat = Math.min(Math.max(lat, DEMO_BOUNDS.latMin), DEMO_BOUNDS.latMax);
            lng = Math.min(Math.max(lng, DEMO_BOUNDS.lngMin), DEMO_BOUNDS.lngMax);
            turned = (heading + 180) % 360;
          }
          nextFleet[item.id] = { ...item, lat, lng, heading: turned, speed_kmh: speed };
        }
        return nextFleet;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [paused]);
  return fleet;
}

export function Hero() {
  const { t, locale, href } = useLocale();
  const reduceMotion = useReducedMotion();
  const live = useDemoFleet(reduceMotion);
  const connected = true;

  const vehicles = useMemo<Vehicle[]>(
    () =>
      Object.values(live).map((item) => ({
        id: item.id,
        plate: `ZBK-${2200 + item.id}`,
        plate_en: `ZBK-${2200 + item.id}`,
        name: `Vehicle ${item.id}`,
        name_fa: `خودرو ${item.id}`,
        make: "",
        model: "",
        model_fa: "",
        year: 0,
        vin: "",
        device_id: "",
        vehicle_type: "van",
        status: item.status,
        lat: item.lat,
        lng: item.lng,
        heading: item.heading,
        speed_kmh: item.speed_kmh,
        odometer_km: item.odometer_km,
        fuel_percent: item.fuel_percent,
        battery_volt: item.battery_volt,
        coolant_c: item.coolant_c,
        engine_rpm: item.engine_rpm,
        health_score: item.health_score,
        last_seen: item.last_seen ?? new Date().toISOString(),
        driver: null,
      })),
    [live],
  );

  const moving = vehicles.filter((vehicle) => vehicle.status === "moving").length;
  const avgSpeed =
    moving > 0
      ? vehicles.filter((v) => v.status === "moving").reduce((sum, v) => sum + v.speed_kmh, 0) / moving
      : 0;

  const Arrow = locale === "fa" ? ArrowLeft : ArrowRight;
  const fade = reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40">
      <Aurora />
      <div className="grid-texture pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div>
            <motion.div
              {...fade}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-[12.5px] text-ink-secondary shadow-[var(--shadow-sm)]"
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-60 animate-[pulse-ring_2.2s_cubic-bezier(0.25,1,0.5,1)_infinite]" />
                <span className="relative size-2 rounded-full bg-[var(--accent)]" />
              </span>
              {t.landing.badge}
            </motion.div>

            <motion.h1
              {...fade}
              transition={{ duration: 0.55, delay: 0.06 }}
              className="mt-6 text-[clamp(2.3rem,6vw,4.15rem)] font-bold leading-[1.12] tracking-tight text-ink"
            >
              {t.landing.heroTitleA}
              <br />
              <span className="brand-gradient-text">{t.landing.heroTitleB}</span>
            </motion.h1>

            <motion.p
              {...fade}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-6 max-w-xl text-[16px] leading-[1.85] text-ink-secondary"
            >
              {t.landing.heroLead}
            </motion.p>

            <motion.div
              {...fade}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <ButtonLink href="#contact" size="lg" className="group">
                {t.landing.heroCtaPrimary}
                <Arrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </ButtonLink>
              <ButtonLink href={href("/login")} size="lg" variant="secondary">
                <Play className="size-4" />
                {t.landing.heroCtaSecondary}
              </ButtonLink>
            </motion.div>

            <motion.p
              {...fade}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-5 flex items-center gap-2 text-[13px] text-ink-muted"
            >
              <ShieldCheck className="size-4 text-[var(--accent)]" />
              {t.landing.heroNote}
            </motion.p>
          </div>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 28 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{t.landing.liveMapTitle}</p>
                  <p className="truncate text-[11px] text-ink-muted">{t.landing.liveMapSubtitle}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--good-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--good-text)]">
                  <Radio className="size-3" />
                  {connected ? t.common.live : t.dash.reconnecting}
                </span>
              </div>

              <div className="h-[320px] w-full sm:h-[380px]">
                <MapPanel vehicles={vehicles} interactive={false} fitToVehicles zoom={10} />
              </div>

              <div className="grid grid-cols-3 divide-x divide-[var(--line)] border-t border-[var(--line)] rtl:divide-x-reverse">
                {[
                  { label: t.dash.status.moving, value: formatNumber(moving, locale), icon: Radio },
                  {
                    label: t.common.kmh,
                    value: formatDecimal(avgSpeed, locale, 0),
                    icon: Gauge,
                  },
                  {
                    label: t.common.vehicles,
                    value: formatNumber(vehicles.length, locale),
                    icon: ShieldCheck,
                  },
                ].map((tile) => (
                  <div key={tile.label} className="px-4 py-3.5">
                    <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                      <tile.icon className="size-3" />
                      {tile.label}
                    </p>
                    <p className="tnum mt-1 text-[20px] font-semibold leading-none text-ink">{tile.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="absolute -bottom-6 -z-10 h-24 w-[88%] rounded-full blur-3xl ltr:left-[6%] rtl:right-[6%]"
              style={{ background: "var(--aurora-1)" }}
              aria-hidden="true"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
