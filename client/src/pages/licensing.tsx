import { useEffect } from "react";
import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Gift, ShieldCheck, Globe2, Lock, Scale } from "lucide-react";
import { BRAND } from "@shared/branding";

export default function Licensing() {
  useEffect(() => {
    document.title = `Licensing Policy | ${BRAND.fullName}`;
  }, []);

  return (
    <div className="min-h-screen font-body bg-[#F5F3EF]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-32">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back
          </Button>
        </Link>

        <h1
          className="text-4xl md:text-5xl font-display text-[#1A1F2B] mb-4"
          data-testid="text-licensing-heading"
        >
          How we handle licensing.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-10">
          We work with each partner to find the right approach for their project — including how the work is licensed and shared. This page explains, in plain language, how we actually make those decisions.
        </p>

        <div className="space-y-6 mb-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex gap-4" data-testid="card-commitment-free">
            <Gift className="w-6 h-6 text-[#0D7377] shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-display text-[#1A1F2B] mb-1">Always free to community organizations</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our technology services are always free to the community organizations we work with. We never charge for the tools themselves, only for optional implementation help.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex gap-4" data-testid="card-commitment-ownership">
            <ShieldCheck className="w-6 h-6 text-[#0D7377] shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-display text-[#1A1F2B] mb-1">You own what we build with you</h2>
              <p className="text-muted-foreground leading-relaxed">
                The tools we build belong to you. You keep full rights to use, modify, and host the software we deliver — with or without us, forever. If we ever shut down, your tool keeps running.
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-display text-[#1A1F2B] mb-4">Our default: open source</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          By default, the tools we build are released publicly under a permissive open-source license (typically MIT or Apache 2.0). That&rsquo;s how a shelter in a city we&rsquo;ve never visited can benefit from work funded by a donor across the country, and it&rsquo;s why our fellows graduate with portfolios anyone can verify.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          Reusable tools — the Board Portal, Longship Factory, the donor/volunteer CRM on our roadmap — are open-sourced as they stabilize, and every partner who uses them has the same rights to the code as everyone else.
        </p>

        <h2 className="text-2xl md:text-3xl font-display text-[#1A1F2B] mb-4">When something stays private to a partner</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Some work shouldn&rsquo;t be public, and we don&rsquo;t pretend otherwise. We&rsquo;ll keep something private to you when:
        </p>
        <ul className="space-y-3 text-muted-foreground leading-relaxed mb-4 list-none pl-0">
          <li className="flex gap-3" data-testid="text-private-reason-data">
            <Lock className="w-5 h-5 text-[#D4A843] shrink-0 mt-1" />
            <span>It contains client, donor, or program-participant data, or anything that could compromise the privacy or safety of the people you serve.</span>
          </li>
          <li className="flex gap-3" data-testid="text-private-reason-bespoke">
            <Lock className="w-5 h-5 text-[#D4A843] shrink-0 mt-1" />
            <span>It&rsquo;s a deeply bespoke configuration, integration, or workflow that&rsquo;s only meaningful inside your organization.</span>
          </li>
          <li className="flex gap-3" data-testid="text-private-reason-sensitive">
            <Lock className="w-5 h-5 text-[#D4A843] shrink-0 mt-1" />
            <span>You operate in a context where publishing the work could put your team, your partners, or the people you serve at risk.</span>
          </li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mb-10">
          In those cases the underlying open-source tool stays public, and your private layer — your data, your custom screens, your integrations — stays yours.
        </p>

        <h2 className="text-2xl md:text-3xl font-display text-[#1A1F2B] mb-4">When something gets released publicly</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Anything we build that&rsquo;s reusable beyond a single partner — a generally useful feature, a new module, a new tool category — gets released publicly under an open-source license once it&rsquo;s stable enough to be helpful to others. We talk this through with you before we publish, and nothing identifying your organization, your data, or your people goes out without your explicit sign-off.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          The simple rule: if it can help another community organization, we want to share it. If it&rsquo;s yours alone, it stays yours.
        </p>

        <h2 className="text-2xl md:text-3xl font-display text-[#1A1F2B] mb-4">How we decide, together</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Every engagement starts with a short conversation about licensing. We&rsquo;ll tell you:
        </p>
        <ul className="space-y-3 text-muted-foreground leading-relaxed mb-4 list-none pl-0">
          <li className="flex gap-3">
            <Scale className="w-5 h-5 text-[#0D7377] shrink-0 mt-1" />
            <span>Which underlying tools we&rsquo;ll be using, and the open-source license they carry.</span>
          </li>
          <li className="flex gap-3">
            <Scale className="w-5 h-5 text-[#0D7377] shrink-0 mt-1" />
            <span>What we expect to release publicly, and what will stay private to your organization.</span>
          </li>
          <li className="flex gap-3">
            <Scale className="w-5 h-5 text-[#0D7377] shrink-0 mt-1" />
            <span>What rights you keep at the end of the engagement (always: full ownership of your deployment and data).</span>
          </li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mb-10">
          That gets written into a one-page agreement before we start, in language that&rsquo;s readable without a lawyer. If anything changes mid-project, we revisit it together.
        </p>

        <div className="bg-[#1A1F2B] text-white rounded-2xl p-8" data-testid="card-licensing-summary">
          <Globe2 className="w-8 h-8 text-[#D4A843] mb-4" />
          <h2 className="text-2xl font-display mb-3">The short version</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            Free to use. Yours to keep. Open by default, private when it needs to be, and never a surprise.
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            Have questions about how this would work for your organization?{" "}
            <Link href="/apply/client" className="text-[#D4A843] underline hover:text-[#D4A843]/80" data-testid="link-apply-client">
              Start a conversation with us
            </Link>
            .
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
