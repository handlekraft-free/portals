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
  useEffect(() => { document.title = "handləkraft.ai — The Power to Act"; }, []);
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

            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-4 font-light leading-relaxed" data-testid="text-hero-subtitle">
              <span className="italic text-white/50">Handl&#x259;kraft</span> is Norwegian for <span className="text-[#D4A843] font-medium">the power to act on your own behalf</span>. We give that power to the people and organizations who need it most.
            </p>

            <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 font-light">
              Technology services and training for community organizations. Real careers for non-traditional learners. Accessibility for everyone.
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
                <div className="text-4xl font-display text-[#D4A843] mb-1" data-testid="text-stat-cost">$0</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Cost to Organizations</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#D4A843] mb-1">100%</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Donation Funded</div>
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
              title="Agency changes everything." 
              className="mb-8"
            />
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Thousands of community organizations — shelters, clinics, food banks, mutual aid groups — run critical operations on a patchwork of spreadsheets, email threads, and institutional memory. They don't need more software. They need help choosing the right tools, configuring them well, and building the confidence to run them independently.
              </p>
              <p>
                At the same time, capable people are locked out of technology careers — not for lack of ability, but for lack of access. Non-traditional learners, neurodivergent thinkers, veterans, caregivers, people in recovery. Our fellowship trains them on real client engagements using AI-native tools, with small cohorts and close mentorship.
              </p>
              <p className="font-semibold text-[#1A1F2B]">
                handləkraft multiplies the power to act — for organizations underserved by technology, for learners underserved by traditional pathways, and for end users whom technology too often forgets.
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
            <h3 className="text-2xl font-display mb-4 relative z-10">Handle + Kraft</h3>
            <p className="text-white/60 text-sm mb-8 relative z-10 italic">Norwegian: to act + power = the power to act</p>
            <ul className="space-y-6 relative z-10">
              {[
                "A community organization reaches out. We start with a free conversation to understand what they actually do, what hurts, and what would genuinely help.",
                "We recommend honestly — often that means configuring an existing tool, not building something new. If you don't need us, we'll say so.",
                "We configure what's needed, train the team to run it, and document everything. Our exit is part of the engagement from day one.",
                "Fellows work real engagements as part of their training. They graduate with a portfolio of real work — and organizations gain capability that lasts."
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
          title="Three integrated streams." 
          subtitle="We don't just build — we assess, train, transfer capability, and design with accessibility as the default."
          centered
        />
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Users,
              title: "Technology Services for Nonprofits",
              desc: "Discovery and assessment, tool selection, hands-on configuration, staff training, and capability transfer. Custom builds only when existing tools genuinely fall short — and we'll tell you honestly which it is."
            },
            {
              icon: GraduationCap,
              title: "Fellowship & Career Pathways",
              desc: "Small, attentive cohorts of non-traditional learners work on real client engagements. AI is the co-worker; fellows own the product decisions, the communication, and the outcome."
            },
            {
              icon: HeartHandshake,
              title: "Accessibility by Default",
              desc: "Every engagement includes an accessibility component. Every fellow learns WCAG fundamentals, trauma-informed design, and plain-language principles. The people our clients serve deserve better than afterthought design."
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
              title: "Fellows Work the Engagement",
              desc: "Our fellows are part of real engagements as part of their training. They work alongside our staff, see how real organizations use what they help configure, and own real outcomes.",
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
              subtitle="Small cohorts. Real client engagements. No tuition. Accessibility woven into everything."
            />
            <div className="space-y-12">
              {[
                {
                  title: "Foundations",
                  desc: "Learn how technology serves organizations — tools, configuration, workflows, and documentation — with AI tools handling the heavy lifting while you focus on understanding the problem."
                },
                {
                  title: "Real Clients, Real Stakes",
                  desc: "Fellows work on actual client engagements from the start. You'll configure systems real nonprofits depend on, write documentation real staff will read, and own real outcomes."
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
            Read the full story.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Our strategic plan lays out the complete picture — our purpose, our operating principles, how we serve organizations and learners, our commitment to accessibility-first design, and where we're headed over the next five years. We welcome your thoughts, questions, and support.
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
                q: "Is this really free for organizations?",
                a: "Yes. We're a 501(c)(3) nonprofit funded by donations. Organizations never pay for our services — assessment, configuration, training, or anything else we provide. That's the whole point."
              },
              {
                q: "What services do you provide?",
                a: "Discovery and honest assessment, tool selection and configuration, staff training and capability transfer, accessibility audits, light customization, and — when genuinely needed — custom software. Most organizations benefit more from getting existing tools configured well than from building something new. We'll tell you honestly which you need."
              },
              {
                q: "Do I need coding experience to apply for the fellowship?",
                a: "No. We're looking for people who want to solve problems and own outcomes — not people who already know how to code. If you have a high school diploma or GED and the drive to learn, that's enough. AI tools handle the deep technical work; fellows focus on understanding the problem, directing the work, and transferring capability to real organizations."
              },
              {
                q: "Who can apply for the fellowship?",
                a: "Anyone who's been locked out of traditional technology pathways. Veterans (including those with OTH discharges), neurodivergent learners, formerly incarcerated individuals, single parents and caregivers, people in recovery, people with disabilities or chronic illness, GED holders, career changers. Our pedagogy is designed for the full range of human learners, not a narrow archetype."
              },
              {
                q: "How is this different from a coding bootcamp?",
                a: "Bootcamps train you to code. We train you to configure, advise, and deliver outcomes for real organizations — using AI tools to handle technical complexity while you own the product thinking, communication, and results. Small cohorts, real client engagements, close mentorship, no tuition, and accessibility woven into everything."
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
