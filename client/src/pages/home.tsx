import { useEffect } from "react";
import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Code2, GraduationCap, Users, HeartHandshake, ArrowDown, Mail, Building2, UserPlus, Home as HomeIcon, Heart, Handshake, UtensilsCrossed, Baby, Shield, Landmark, Building, Zap, LifeBuoy } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Wordmark } from "@/components/wordmark";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import logoImg from "@/assets/images/logo.png";
import vikingProud from "@/assets/images/viking-proud.png";
import vikingCoding from "@/assets/images/viking-coding.png";
import vikingShield from "@/assets/images/viking-shield.png";
import vikingTriumph from "@/assets/images/viking-triumph.png";

export default function Home() {
  useEffect(() => { document.title = "handləkraft.ai — Free Open-Source AI Tools for Community Organizations"; }, []);
  return (
    <div className="min-h-screen font-body selection:bg-[#0D7377] selection:text-white">
      <Navbar />
      
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#1A1F2B] text-white pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#0D7377] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#D4A843] rounded-full mix-blend-screen filter blur-[100px] opacity-10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center mb-8">
              <img src={logoImg} alt="handlekraft.ai" className="w-36 h-36 rounded-3xl shadow-2xl" data-testid="img-hero-logo" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-8 backdrop-blur-sm" data-testid="text-badge">
              <span className="w-2 h-2 rounded-full bg-[#D4A843] animate-pulse" />
              Early-Stage 501(c)(3) Nonprofit Initiative
            </div>
            
            <div className="flex justify-center mb-6" data-testid="text-hero-heading">
              <Wordmark size="hero" className="text-white" showTagline taglineClassName="text-[#D4A843] text-center" />
            </div>

            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-4 font-light leading-relaxed" data-testid="text-hero-subtitle">
              We build <span className="text-[#D4A843] font-medium">free, open-source AI tools</span> for community organizations — and train <span className="text-[#D4A843] font-medium">non-traditional product builders</span> to put them to work for the causes they care about.
            </p>

            <p className="text-base md:text-lg text-white/55 max-w-2xl mx-auto mb-10 font-light">
              <span className="italic text-white/50">Handl&#x259;kraft</span> is Norwegian for <span className="text-white/70">the power to act</span>. Our tools are free for any organization to use forever. We sustain the work through paid implementation services for those who want professional help deploying them.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button 
                size="lg" 
                className="bg-[#D4A843] hover:bg-[#D4A843]/90 text-[#1A1F2B] text-lg font-bold rounded-full px-8 h-14 shadow-xl shadow-[#D4A843]/20 hover:-translate-y-1 transition-all"
                onClick={() => window.open('/proposal.pdf', '_blank')}
                data-testid="button-read-proposal"
              >
                Read Our Proposal <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white text-lg font-medium rounded-full px-8 h-14 backdrop-blur-sm hover:-translate-y-1 transition-all"
                onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-see-how"
              >
                See How It Works
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto border-t border-white/10 pt-12">
              <div className="text-center">
                <div className="text-4xl font-display text-[#D4A843] mb-1" data-testid="text-stat-cost">Free</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Forever, For Anyone</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#D4A843] mb-1" data-testid="text-stat-license">Yours</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">The Tools Belong to You</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#D4A843] mb-1">30h</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Workweek — By Design</div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30"
        >
          <ArrowDown />
        </motion.div>
      </section>

      <Section id="mission" background="cream">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <SectionHeader 
              title="Free tools. Real builders. Sustained work." 
              className="mb-8"
            />
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Thousands of community organizations — shelters, clinics, food banks, mutual aid groups, small foundations — run critical operations on patchwork spreadsheets and institutional memory. The software they need exists; what they lack is access to tools designed for their reality and people who can help them deploy those tools well.
              </p>
              <p>
                We build <span className="font-semibold text-[#1A1F2B]">free, open-source AI tools</span> for that reality — tools we use to run our own operations and that any organization can adopt without paying us a cent. When an organization wants professional help deploying or customizing one of our tools, we offer paid implementation services. That earned, mission-aligned revenue sustains the work.
              </p>
              <p>
                In parallel, we train <span className="font-semibold text-[#1A1F2B]">non-traditional product builders</span> — veterans, caregivers, neurodivergent thinkers, career changers, people locked out of conventional pathways — by having them contribute to those same public projects. They graduate with real portfolios, real references, and real users.
              </p>
              <p className="font-semibold text-[#1A1F2B]">
                Free tools serve the mission. Paid services sustain the organization. The fellowship produces both our trainees and the people who can deliver those services. Each piece reinforces the others.
              </p>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#1A1F2B] text-white p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#0D7377] rounded-full opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            
            <img 
              src={vikingProud} 
              alt="" 
              className="absolute top-4 right-4 w-[100px] h-[100px] z-20 opacity-90 pointer-events-none"
            />
            <h3 className="text-2xl font-display mb-4 relative z-10">Open Source + Services</h3>
            <p className="text-white/60 text-sm mb-8 relative z-10 italic">A recognized model used by Sahana, DHIS2, CiviCRM, Kobo Toolbox — mission-driven nonprofits sustained by services on freely available software.</p>
            <ul className="space-y-6 relative z-10">
              {[
                "We build tools we ourselves need to run handləkraft — board governance, neurodivergent-friendly task management, lightweight CRMs — and release them as free open-source projects under our stewardship.",
                "Any community organization we work with can use these tools without paying us anything, ever — and the tools we build belong to you. We work with each partner to find the right approach for their project, including how the work is licensed and shared.",
                "When an organization wants help deploying, customizing, integrating, training staff, or hosting one of our tools, we offer paid implementation services delivered by our team.",
                "Fellows learn by contributing to those same public open-source projects — never to client engagements, which our paid staff handle. They graduate with real, public open-source contributions on code anyone can read."
              ].map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4A843] text-[#1A1F2B] font-bold flex items-center justify-center text-sm">
                    {i + 1}
                  </div>
                  <p className="text-white/90 font-light">{step}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </Section>

      <Section id="what-we-do" background="white">
        <SectionHeader 
          title="Four streams. One mission." 
          subtitle="Public open-source tools, paid implementation services, a fellowship that produces both, and accessibility woven through everything."
          centered
        />
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Code2,
              title: "Open-Source Tools",
              desc: "We build free AI-powered tools for community organizations — board governance, ADHD-friendly task management, lightweight CRMs. Our technology services are always free to the community organizations we work with, and the tools we build belong to you."
            },
            {
              icon: HeartHandshake,
              title: "Implementation Services",
              desc: "When an organization wants professional help deploying, customizing, training staff, or hosting one of our tools, we sell those services at fair-market rates. Earned, mission-aligned income that sustains the rest of the work."
            },
            {
              icon: GraduationCap,
              title: "Fellowship Pathways",
              desc: "Small, attentive cohorts of non-traditional learners contribute to our public projects with real users. They graduate with a portfolio of public commits, professional references, and a path into our paid services team or the broader sector."
            },
            {
              icon: Users,
              title: "Accessibility by Default",
              desc: "Every tool ships with WCAG fundamentals, plain-language principles, and trauma-informed design baked in. Every fellow learns it. The people these tools serve deserve better than afterthought design."
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className="p-8 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1A1F2B] to-[#0D7377]" />
              <div className="w-12 h-12 bg-[#0D7377]/10 rounded-xl flex items-center justify-center text-[#0D7377] mb-6 group-hover:bg-[#0D7377] group-hover:text-white transition-colors">
                <card.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#1A1F2B] mb-4">{card.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="how-it-works" background="cream">
        <SectionHeader
          title="How it works."
          subtitle="From first conversation to lasting capability — here's the journey."
          centered
        />
        <div className="max-w-3xl mx-auto mb-12">
          <p className="text-lg text-muted-foreground leading-relaxed text-center" data-testid="text-how-it-works-intro">
            Our technology services are always free to the community organizations we work with. The tools we build belong to you. We work with each partner to find the right approach for their project — including how the work is licensed and shared.
          </p>
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-6 md:left-1/2 top-0 w-0.5 bg-gradient-to-b from-[#0D7377] via-[#D4A843] to-[#D4A843] md:-translate-x-px" style={{ height: 'calc(100% - 7rem)' }} />
          {[
            {
              step: "1",
              title: "Free Discovery Conversation",
              desc: "We start with a real conversation — no sales pitch. We listen to understand what your organization actually does, what's painful, and what would genuinely help.",
              icon: Mail,
            },
            {
              step: "2",
              title: "Honest Assessment",
              desc: "We recommend the right path — often that's configuring an existing tool, training your team, or a small customization. If you don't need us, we'll tell you.",
              icon: CheckCircle2,
            },
            {
              step: "3",
              title: "Configuration & Training",
              desc: "We set up the tools that fit, configure them around your real workflow, and teach your staff to run them. Our exit is planned from the start.",
              icon: Users,
            },
            {
              step: "4",
              title: "Fellows Build the Open-Source Tools",
              desc: "Client engagements are delivered by our paid staff. Fellows learn by contributing to the public, open-source projects those services are built on — shipping real features, writing real documentation, and graduating with a portfolio of public open-source contributions.",
              icon: UserPlus,
            },
            {
              step: "5",
              title: "Capability Transfer — You Own It",
              desc: "You leave with documented systems your team understands and controls. Our success is measured by what you can do without us six months later.",
              icon: LifeBuoy,
              terminal: true,
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex items-start gap-6 ${
                item.terminal ? "mb-0" : "mb-12"
              } ${
                i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              <div className="hidden md:block md:w-1/2" />
              <div className="relative z-10 flex-shrink-0">
                {item.terminal ? (
                  <div className="w-14 h-14 rounded-full bg-[#D4A843] text-white font-bold flex items-center justify-center text-lg shadow-lg border-4 border-[#F5F3EF] ring-4 ring-[#D4A843]/20">
                    {item.step}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#0D7377] text-white font-bold flex items-center justify-center text-lg shadow-lg border-4 border-[#F5F3EF]">
                    {item.step}
                  </div>
                )}
              </div>
              <div className={`md:w-1/2 rounded-2xl p-6 shadow-lg border ${
                item.terminal
                  ? "bg-gradient-to-br from-[#1A1F2B] to-[#2a3040] border-[#D4A843]/30 text-white"
                  : "bg-white border-slate-100"
              }`} data-testid={`card-how-it-works-${i}`}>
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className={`w-5 h-5 ${item.terminal ? "text-[#D4A843]" : "text-[#D4A843]"}`} />
                  <h3 className={`text-lg font-bold ${item.terminal ? "text-white" : "text-[#1A1F2B]"}`} data-testid={`text-how-step-${i}`}>{item.title}</h3>
                </div>
                <p className={`text-sm leading-relaxed ${item.terminal ? "text-slate-300" : "text-muted-foreground"}`}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="open-source" background="white">
        <SectionHeader
          title="The tools we're building."
          subtitle="Each one started as something we needed to run handləkraft. Each one is free, open source, and ready for any community organization to adopt."
          centered
        />

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {[
            {
              status: "In Production",
              statusColor: "bg-[#0D7377]",
              title: "Board Portal",
              tagline: "Governance for small, working boards.",
              desc: "Board meeting management, document libraries, action items, written consents, member directory, and a board-scoped chat with AI assistance. Built for nonprofits that need real governance hygiene without enterprise overhead.",
              audience: "Small nonprofit boards, working committees, advisory councils.",
            },
            {
              status: "Pilot — ADHD/Neurodivergent Task Manager",
              statusColor: "bg-[#D4A843]",
              title: "Longship Factory",
              tagline: "A gamified shared task board built for the brains that struggle with traditional ones.",
              desc: "A communal quest board with energy-aware planning, low-friction claim workflows, forgiving streaks (weekends and rest days don't punish you), and gentle gamification grounded in research on neurodivergent motivation. Designed first for ADHD — useful for anyone who finds standard project tools exhausting.",
              audience: "Mutual-aid groups, recovery communities, neurodivergent teams, families coordinating care.",
            },
          ].map((tool, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col"
              data-testid={`card-tool-${i}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-block w-2 h-2 rounded-full ${tool.statusColor}`} />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{tool.status}</span>
              </div>
              <h3 className="text-2xl font-display text-[#1A1F2B] mb-1" data-testid={`text-tool-name-${i}`}>{tool.title}</h3>
              <p className="text-[#0D7377] font-medium mb-4">{tool.tagline}</p>
              <p className="text-muted-foreground leading-relaxed mb-4 flex-1">{tool.desc}</p>
              <div className="border-t border-slate-100 pt-4 text-sm">
                <span className="font-semibold text-[#1A1F2B]">Built for: </span>
                <span className="text-muted-foreground">{tool.audience}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-12 bg-[#F5F3EF] rounded-2xl p-8 border border-slate-200 text-center">
          <p className="text-muted-foreground leading-relaxed mb-4">
            More tools are on the roadmap — a lightweight donor/volunteer CRM, an accessibility-audit assistant, and the small operational tools we're building for our own client engagements. Each is released publicly as it stabilizes.
          </p>
          <p className="text-sm text-slate-500">
            Our technology services are <span className="font-semibold text-[#1A1F2B]">always free</span> to the community organizations we work with, and the tools we build <span className="font-semibold text-[#1A1F2B]">belong to you</span>. We work with each partner to find the right approach for their project — including <Link href="/licensing" className="text-[#0D7377] underline hover:text-[#0D7377]/80" data-testid="link-licensing-footer-note">how the work is licensed and shared</Link>. We sell professional services around these tools — never the tools themselves.
          </p>
        </div>
      </Section>

      <Section id="who-we-serve" background="navy">
        <SectionHeader 
          title="Built for the people who build our communities." 
          subtitle="If your organization runs on shoestring technology and a whole lot of heart, we'd love to give you the power to act."
          className="text-white"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: HomeIcon, name: "Shelters", desc: "Homeless shelters and transitional housing programs" },
            { icon: Heart, name: "Clinics", desc: "Free and sliding-scale community health clinics" },
            { icon: Handshake, name: "Social Services", desc: "Case management and social service agencies" },
            { icon: UtensilsCrossed, name: "Food Banks", desc: "Food banks, pantries, and community kitchens" },
            { icon: Baby, name: "Youth Programs", desc: "Mentorship and after-school programs" },
            { icon: Shield, name: "Veteran Services", desc: "Veteran service and transition organizations" },
            { icon: Landmark, name: "Local Government", desc: "Underserved state and local agencies serving the public" },
            { icon: Building, name: "Community Orgs", desc: "Neighborhood and community development groups" },
          ].map((sector, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05, backgroundColor: "#0D7377" }}
              className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center text-center h-36 cursor-default transition-colors"
              data-testid={`card-sector-${sector.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <sector.icon className="w-8 h-8 mb-3 text-[#D4A843]" />
              <span className="font-display text-lg tracking-wide mb-1">{sector.name}</span>
              <span className="text-xs text-white/50 leading-tight">{sector.desc}</span>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12 relative">
          <motion.img 
            src={vikingShield} 
            alt="" 
            className="w-24 h-24 mx-auto mb-4 opacity-80"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />
          <Link href="/apply/client">
            <Button 
              size="lg"
              className="bg-[#D4A843] text-[#1A1F2B] font-bold text-lg rounded-full px-8 h-14"
              data-testid="button-get-started"
            >
              <Zap className="mr-2 w-5 h-5" />
              Start a Free Conversation <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </Section>

      <Section id="training" background="cream">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <SectionHeader 
              title="Learn by doing real work." 
              subtitle="Small cohorts. Real open-source contributions. No tuition. Accessibility woven into everything."
            />
            <div className="space-y-12">
              {[
                {
                  title: "Foundations",
                  desc: "Learn how technology serves organizations — tools, configuration, workflows, and documentation — with AI tools handling the heavy lifting while you focus on understanding the problem."
                },
                {
                  title: "Real Open-Source Work, Real Stakes",
                  desc: "Client engagements are run by our paid staff. Fellows contribute to the public open-source projects underneath — shipping features real organizations rely on, writing documentation real staff will read, and owning real outcomes on code anyone can see."
                },
                {
                  title: "Accessibility as Curriculum",
                  desc: "You'll graduate knowing WCAG fundamentals, plain-language principles, and trauma-informed design — woven into how you approach every project, not bolted on at the end."
                },
                {
                  title: "Launch Your Career",
                  desc: "Graduate with a portfolio of real work, professional references, and the skills to direct AI tools confidently. A community that doesn't disappear after you leave."
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="text-[#0D7377] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#1A1F2B] mb-2">{item.title}</h4>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 lg:sticky lg:top-32">
            <h3 className="text-2xl font-display text-[#1A1F2B] mb-6">Who We're Looking For</h3>
            <p className="text-muted-foreground mb-4">
              No college degree. No tuition. We run small, attentive cohorts designed for people whose paths into technology have been blocked — not for lack of ability, but for lack of access. Our pedagogy is built for the full range of human learners.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                "GED Holders",
                "Career Changers",
                "Veterans",
                "Single Parents & Caregivers",
                "Neurodivergent Learners",
                "Formerly Incarcerated",
                "People in Recovery",
                "Disability & Chronic Illness",
                "Self-Taught Learners",
                "Underemployed Workers",
                "Community College Students",
                "Non-Degree Candidates"
              ].map((tag, i) => (
                <span 
                  key={i} 
                  className="px-4 py-2 bg-[#F5F3EF] text-[#1A1F2B] rounded-full text-sm font-medium border border-[#1A1F2B]/10 hover:bg-[#1A1F2B] hover:text-white transition-colors cursor-default"
                  data-testid={`tag-candidate-${i}`}
                >
                  {tag}
                </span>
              ))}
            </div>

            <Link href="/apply/fellowship">
              <Button 
                className="w-full bg-[#0D7377] text-white font-bold rounded-full h-14 text-lg"
                data-testid="button-apply-fellowship"
              >
                <UserPlus className="mr-2 w-5 h-5" />
                Apply for the Fellowship <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground text-center mt-3">HS diploma or GED required. Accessibility accommodations available. All backgrounds welcome.</p>
            <motion.img 
              src={vikingCoding} 
              alt="" 
              className="w-36 h-36 mx-auto mt-6 opacity-70"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
          </div>
        </div>
      </Section>

      <Section background="white">
        <div className="bg-[#F5F3EF] rounded-3xl p-8 md:p-16 text-center border border-slate-200">
          <Code2 className="w-12 h-12 text-[#1A1F2B] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-display text-[#1A1F2B] mb-4" data-testid="text-proposal-heading">
            Read the full strategic proposal.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Our board proposal lays out the open-source-plus-services operating model in full — the four program elements, the four-phase rollout, governance and funding implications, financial projections, and the open questions we're still working through. We welcome your thoughts, questions, and support.
          </p>
          <Button 
            className="bg-[#1A1F2B] hover:bg-[#1A1F2B]/90 text-white font-bold rounded-full px-8 py-6 h-auto"
            onClick={() => window.open('/proposal.pdf', '_blank')}
            data-testid="button-download-proposal"
          >
            Download Our Proposal (PDF) <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">This is a living document — we expect it to evolve as we learn. That's by design.</p>
        </div>
      </Section>

      <Section id="faq" background="cream">
        <SectionHeader
          title="Frequently asked questions."
          subtitle="Everything you need to know about handləkraft.ai and how we work."
          centered
        />
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: "Wait — are your tools free, or do you charge?",
                a: "Our technology services are always free to the community organizations we work with, and the tools we build belong to you. We work with each partner to find the right approach for their project — including how the work is licensed and shared. What we charge for is professional implementation: hands-on help deploying a tool, customizing it for your workflow, training your staff, integrating it with your other systems, or hosting it for you. Organizations that want a partner pay fair-market rates for that service work — and that revenue is what sustains continued tool development.",
                linkHref: "/licensing",
                linkLabel: "Read our full licensing policy →",
                linkTestId: "link-licensing-faq"
              },
              {
                q: "Why open source? Couldn't you make more money keeping it proprietary?",
                a: "Maybe — but that's not the point. We're a nonprofit. Open source means a shelter in a city we'll never visit can still benefit from work funded by a donor in San Diego. It means our fellows graduate with public portfolios anyone can verify. It means if we ever shut down, the tools live on. And it puts us in good company: Sahana, DHIS2, CiviCRM, Kobo Toolbox — some of the most impactful nonprofit software in the world is built this way."
              },
              {
                q: "What does it cost an organization to just use the tools?",
                a: "Nothing from us, ever. You'll have ordinary infrastructure costs (a server or hosting account, maybe a domain) — typically $20–$100 a month for small organizations, or $0 if you have a tech-comfortable volunteer who can self-host. Everything we build is documented for self-deployment."
              },
              {
                q: "What does paid implementation cost?",
                a: "It depends on scope, but our rates are deliberately accessible to mission-driven organizations and significantly below commercial agencies. Discovery conversations are always free. We'll quote any engagement transparently before you commit, and we'll happily tell you when self-deployment is the right call."
              },
              {
                q: "Do I need coding experience to apply for the fellowship?",
                a: "No. We're looking for people who want to solve problems and own outcomes — not people who already know how to code. If you have a high school diploma or GED and the drive to learn, that's enough. AI tools handle the deep technical work; fellows focus on understanding the problem, directing the work, and shipping real contributions to our public open-source projects. Client engagements themselves are run by our paid staff — fellows graduate with a portfolio of public open-source work, ready to step into that paid track or anywhere else in the sector."
              },
              {
                q: "Who can apply for the fellowship?",
                a: "Anyone who's been locked out of traditional technology pathways. Veterans (including those with OTH discharges), neurodivergent learners, formerly incarcerated individuals, single parents and caregivers, people in recovery, people with disabilities or chronic illness, GED holders, career changers. Our pedagogy is designed for the full range of human learners, not a narrow archetype."
              },
              {
                q: "How is this different from a coding bootcamp?",
                a: "Bootcamps train you to code. We train you to be a product builder — to think clearly about problems, direct AI tools, and ship real, public software — while our paid staff handle client engagements. Fellows contribute to real public open-source projects with real users and graduate with public open-source contributions to their name. Small cohorts, close mentorship, no tuition, accessibility woven into everything."
              },
              {
                q: "Which tools have you built so far?",
                a: "Two are running today: a Board Portal for nonprofit governance (meetings, documents, action items, written consents, board chat with AI assistance) and Longship Factory, a gamified ADHD/neurodivergent-friendly task management tool with energy-aware planning and forgiving streaks. We use both internally to run handləkraft, and they're available for any organization to adopt. More tools — a donor/volunteer CRM, an accessibility-audit assistant — are on the roadmap and will be released publicly as they stabilize."
              },
              {
                q: "How can I support handləkraft.ai?",
                a: "We're looking for founding sponsors, board members, and volunteers. You can also spread the word or connect us with organizations that could use our help. Reach out via the Get Involved section below."
              },
              {
                q: "Who founded handləkraft.ai?",
                a: "handləkraft was founded by a father-son team launching September 2026. We believe that motivated people — armed with the right tools, close mentorship, and a commitment to accessibility — can multiply the power to act for communities that technology has underserved."
              },
            ].map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-white rounded-xl border border-slate-100 px-6 shadow-sm" data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left text-[#1A1F2B] font-semibold hover:no-underline" data-testid={`button-faq-toggle-${i}`}>
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.a}
                  {"linkHref" in item && item.linkHref && (
                    <div className="mt-3">
                      <Link
                        href={item.linkHref}
                        className="text-[#0D7377] font-medium underline hover:text-[#0D7377]/80"
                        data-testid={item.linkTestId}
                      >
                        {item.linkLabel}
                      </Link>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      <section id="get-involved" className="py-24 bg-gradient-to-br from-[#1A1F2B] to-[#2a3040] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0D7377] rounded-full mix-blend-screen filter blur-[150px] opacity-15 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#D4A843] rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.img 
            src={vikingTriumph} 
            alt="" 
            className="w-[120px] h-[120px] mx-auto mb-6 opacity-80"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          <h2 className="text-4xl md:text-6xl font-display mb-8" data-testid="text-cta-heading">
            Be part of something good.
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-6 font-light leading-relaxed">
            Whether you want to sponsor our work, volunteer your skills, apply for the fellowship, or connect us with an organization that needs help — there's a place for you at handləkraft.ai.
          </p>

          <p className="text-lg text-white/60 mb-12 font-light">
            We're looking for founding sponsors and board members who want to help shape this from the ground up. Come build something meaningful with us.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button 
              size="lg" 
              className="bg-[#D4A843] hover:bg-[#D4A843]/90 text-[#1A1F2B] font-bold text-lg px-8 py-8 h-auto rounded-xl shadow-lg hover:shadow-[#D4A843]/30 transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:robert@retired.email?subject=Founding%20Sponsor%20Inquiry"}
              data-testid="button-founding-sponsor"
            >
              <HeartHandshake className="mr-2 w-6 h-6" />
              Become a Founding Sponsor
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="bg-transparent border-white/30 hover:bg-white/10 text-white font-bold text-lg px-8 py-8 h-auto rounded-xl transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:robert@retired.email?subject=Board%20Member%20Interest"}
              data-testid="button-join-board"
            >
              <Building2 className="mr-2 w-6 h-6" />
              Join Our Board
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Link href="/apply/client">
              <Button 
                variant="outline"
                size="lg" 
                className="bg-transparent border-white/30 text-white font-bold text-lg px-8 py-8 h-auto rounded-xl w-full sm:w-auto"
                data-testid="button-cta-request-help"
              >
                <Zap className="mr-2 w-6 h-6" />
                Request Free Help
              </Button>
            </Link>
            <Link href="/apply/fellowship">
              <Button 
                variant="outline"
                size="lg" 
                className="bg-transparent border-white/30 text-white font-bold text-lg px-8 py-8 h-auto rounded-xl w-full sm:w-auto"
                data-testid="button-cta-apply-fellowship"
              >
                <UserPlus className="mr-2 w-6 h-6" />
                Apply for the Fellowship
              </Button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline"
              size="lg" 
              className="bg-transparent border-white/30 text-white font-bold text-lg px-8 py-8 h-auto rounded-xl w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:robert@retired.email"}
              data-testid="button-conversation"
            >
              <Mail className="mr-2 w-6 h-6" />
              Start a Conversation
            </Button>
          </div>

          <p className="mt-12 text-sm text-white/40">
            handləkraft.ai is a 501(c)(3) nonprofit initiative. All donations are tax-deductible.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
