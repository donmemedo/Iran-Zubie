"use client";

import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/lib/locale-context";

export function SiteFooter() {
  const { t, href, locale } = useLocale();
  const year = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    year: "numeric",
  }).format(new Date());

  const columns = [
    {
      title: t.landing.footerProduct,
      links: [
        { label: t.nav.features, href: "#features" },
        { label: t.nav.howItWorks, href: "#how" },
        { label: t.nav.pricing, href: "#pricing" },
        { label: t.nav.faq, href: "#faq" },
      ],
    },
    {
      title: t.landing.footerCompany,
      links: [
        { label: t.landing.footerAbout, href: "#" },
        { label: t.landing.footerCareers, href: "#" },
        { label: t.landing.footerBlog, href: "#" },
        { label: t.nav.contact, href: "#contact" },
      ],
    },
    {
      title: t.landing.footerLegal,
      links: [
        { label: t.landing.footerPrivacy, href: "#" },
        { label: t.landing.footerTerms, href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href={href("/")}>
              <Logo label={t.common.brand} />
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-[1.85] text-ink-muted">
              {t.landing.footerLead}
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[13px] font-semibold text-ink">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13.5px] text-ink-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-[12.5px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t.common.brand}. {t.landing.footerRights}
          </p>
          <p>{t.common.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
