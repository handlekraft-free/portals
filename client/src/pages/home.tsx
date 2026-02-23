import { useEffect } from "react";
import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Code2, GraduationCap, Users, HeartHandshake, ArrowDown, Mail, Building2, UserPlus, Home as HomeIcon, Heart, Handshake, UtensilsCrossed, Baby, Shield, Landmark, Building, Zap } from "lucide-react";
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
  useEffect(() => { document.title = "handlekraft.ai — The Power to Act"; }, []);
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
              Free software for community organizations. Real careers for aspiring problem solvers. Agency for everyone.
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
                <div className="text-4xl font-display text-[#D4A843] mb-1">2x</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Impact: Software + Careers</div>
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
                Thousands of community organizations — shelters, clinics, food banks — and underfunded local agencies rely on spreadsheets and paper to manage work that changes lives. The software they need is out of reach. The people who could build it are out of opportunities.
              </p>
              <p>
                We believe the most powerful thing you can give someone is the ability to act. For organizations, that means custom tools that actually fit their work. For aspiring builders, it means real projects, real mentorship, and a real path forward. AI-powered tools mean motivated people can own and deliver real products faster than ever — you don't need a CS degree to solve real problems.
              </p>
              <p className="font-semibold text-[#1A1F2B]">
                handlekraft.ai brings these two worlds together — giving organizations the tools to act, and giving people the skills to build them.
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
                "A community organization tells us what they need — a website, a scheduling tool, a better way to track clients.",
                "We pair them with aspiring product builders who own the solution end to end — using AI-powered tools with senior guidance every step of the way.",
                "The organization gets a custom tool that fits their work. The fellow gets real experience and a portfolio of products they're proud of.",
                "Graduates pay it forward — mentoring the next cohort, strengthening the cycle."
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
          title="Three ways we deliver agency." 
          subtitle="Every product we build serves two purposes: giving an organization the power to act, and launching a career."
          centered
        />
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Code2,
              title: "Free Software & Websites",
              desc: "Custom-built websites, intake systems, scheduling tools, donor platforms, dashboards, and workflow automation — designed around each organization's real needs, delivered at zero cost."
            },
            {
              icon: GraduationCap,
              title: "Product-Focused Training",
              desc: "A supportive fellowship where aspiring product builders learn by solving real problems for real people. AI agents handle the deep tech — fellows focus on owning the product and delivering value."
            },
            {
              icon: HeartHandshake,
              title: "A Growing Community",
              desc: "As fellows grow, they mentor the next group. Each graduating class strengthens our ability to help more organizations and welcome more learners. Everyone lifts everyone."
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
          subtitle="From first contact to finished product — here's the journey."
          centered
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0D7377] via-[#D4A843] to-[#0D7377] md:-translate-x-px" />
          {[
            {
              step: "1",
              title: "Organization Reaches Out",
              desc: "A community organization tells us what they need — a website, a scheduling tool, a client tracker, or something else entirely.",
              icon: Mail,
            },
            {
              step: "2",
              title: "We Scope the Project",
              desc: "Our team works with the organization to understand their workflow, define the product, and set clear goals — no jargon, no guesswork.",
              icon: Code2,
            },
            {
              step: "3",
              title: "A Fellow Owns It",
              desc: "We pair the project with a fellow who takes ownership end-to-end. AI agents handle the heavy coding while the fellow drives product decisions.",
              icon: UserPlus,
            },
            {
              step: "4",
              title: "Product Delivered",
              desc: "The organization gets a custom tool built around their real needs — free of charge. The fellow gets a portfolio piece and real-world experience.",
              icon: CheckCircle2,
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex items-start gap-6 mb-12 ${
                i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              <div className="hidden md:block md:w-1/2" />
              <div className="relative z-10 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#0D7377] text-white font-bold flex items-center justify-center text-lg shadow-lg border-4 border-[#F5F3EF]">
                  {item.step}
                </div>
              </div>
              <div className="md:w-1/2 bg-white rounded-2xl p-6 shadow-lg border border-slate-100" data-testid={`card-how-it-works-${i}`}>
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="w-5 h-5 text-[#D4A843]" />
                  <h3 className="text-lg font-bold text-[#1A1F2B]" data-testid={`text-how-step-${i}`}>{item.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
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
              Request Free Help <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </Section>

      <Section id="training" background="cream">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <SectionHeader 
              title="Learn by helping. Grow by doing." 
              subtitle="No degree required. No tuition. Just a willingness to show up, learn, and build something meaningful."
            />
            <div className="space-y-12">
              {[
                {
                  title: "Foundations",
                  desc: "2-4 weeks learning how software products work — databases, interfaces, logic, and workflows — with AI tools doing the heavy lifting while you focus on solving problems."
                },
                {
                  title: "Real Products, Real People",
                  desc: "You'll own products built for real organizations from day one. AI agents handle the deep tech. You focus on the problem, the product, and the outcome."
                },
                {
                  title: "Grow & Give Back",
                  desc: "As you advance, you'll take on bigger products and start mentoring newer fellows. Teaching is the best way to deepen what you know."
                },
                {
                  title: "Launch Your Career",
                  desc: "Graduate with a portfolio of products you owned end to end, real professional references, and the ability to leverage AI tools to build and ship anything."
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
              No college degree required. No bootcamp tuition. We're not looking for people who already know how to code — we're looking for people who want to solve problems and own the outcome. If you have a high school diploma or GED and the drive to act, you're exactly who we want.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                "GED Holders",
                "Career Changers",
                "Veterans",
                "Single Parents",
                "Self-Taught Learners",
                "Underemployed Workers",
                "Community College Students",
                "Non-Degree Candidates",
                "Second Chance Seekers"
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
            <p className="text-xs text-muted-foreground text-center mt-3">Only a HS diploma or GED required. All backgrounds welcome.</p>
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
            handlekraft.ai is just getting started. Our proposal covers everything — our mission, how we operate, how we fund the work, and where we're headed. We'd love your thoughts and your support.
          </p>
          <Button 
            className="bg-[#1A1F2B] hover:bg-[#1A1F2B]/90 text-white font-bold rounded-full px-8 py-6 h-auto"
            onClick={() => window.open('/proposal.pdf', '_blank')}
            data-testid="button-download-proposal"
          >
            Download Our Proposal (PDF) <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">This is a living document. We welcome questions, ideas, and conversations.</p>
        </div>
      </Section>

      <Section id="faq" background="cream">
        <SectionHeader
          title="Frequently asked questions."
          subtitle="Everything you need to know about handlekraft.ai and how we work."
          centered
        />
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: "Is this really free for organizations?",
                a: "Yes, 100%. We're a 501(c)(3) nonprofit funded by donations. Organizations never pay a dime for the software we build. That's the whole point — we exist to give community organizations the tools they need without adding to their costs."
              },
              {
                q: "What kind of software do you build?",
                a: "Websites, client intake systems, scheduling tools, donor management platforms, dashboards, workflow automation — whatever the organization actually needs. Every project is scoped around their real work, not a template."
              },
              {
                q: "Do I need coding experience to apply for the fellowship?",
                a: "Not at all. We're looking for problem solvers, not programmers. If you have a high school diploma or GED and the motivation to learn, that's enough. AI tools handle the deep technical work — fellows focus on understanding the problem and owning the product."
              },
              {
                q: "How long is the fellowship?",
                a: "The fellowship is self-paced but typically runs 3-6 months. You'll start with foundations, move into real projects quickly, and graduate when you've built a portfolio you're proud of."
              },
              {
                q: "How is this different from a coding bootcamp?",
                a: "Bootcamps teach you to code. We teach you to solve problems and deliver products. Our fellows leverage AI agents for the technical heavy lifting and focus on product thinking, communication, and ownership. And unlike bootcamps, there's no tuition."
              },
              {
                q: "How can I support handlekraft.ai?",
                a: "We're looking for founding sponsors, board members, and volunteers. You can also spread the word or connect us with organizations that could use our help. Reach out via the Get Involved section below."
              },
              {
                q: "Who founded handlekraft.ai?",
                a: "handlekraft.ai was founded by a father-son team who believe that motivated people — armed with the right tools and mentorship — can solve real problems for real communities. We're building something good, together."
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
            Whether you want to sponsor our work, volunteer your skills, apply for the fellowship, or connect us with an organization that needs help — there's a place for you at handlekraft.ai.
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
            handlekraft.ai is a 501(c)(3) nonprofit initiative. All donations are tax-deductible.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
