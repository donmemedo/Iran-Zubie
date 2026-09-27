import { Hero } from "@/components/landing/hero";
import { Pricing, LeadForm } from "@/components/landing/pricing";
import {
  Faq,
  Features,
  HowItWorks,
  SecondaryGrid,
  StatsBand,
  TrustBand,
} from "@/components/landing/sections";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="noise relative">
        <Hero />
        <TrustBand />
        <StatsBand />
        <Features />
        <SecondaryGrid />
        <HowItWorks />
        <Pricing />
        <Faq />
        <LeadForm />
      </main>
      <SiteFooter />
    </>
  );
}
