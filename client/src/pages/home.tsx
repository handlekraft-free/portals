import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Code2, GraduationCap, Users, HeartHandshake, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen font-body selection:bg-[#0EA5E9] selection:text-white">
      <Navbar />
      
      {/* 1. Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0B1D3A] text-white pt-20">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#0EA5E9] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] opacity-10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse" />
              Early-Stage 501(c)(3) Nonprofit Initiative
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display leading-[1.1] mb-8">
              Free Software for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] to-cyan-200">
                Those Who Serve
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
              We build bespoke software for nonprofits pro bono, while training the next generation of diverse engineering talent.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button 
                size="lg" 
                className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-[#0B1D3A] text-lg font-bold rounded-full px-8 h-14 shadow-xl shadow-[#0EA5E9]/20 hover:-translate-y-1 transition-all"
                onClick={() => window.open('/proposal.pdf', '_blank')}
              >
                Read Our Proposal <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white text-lg font-medium rounded-full px-8 h-14 backdrop-blur-sm hover:-translate-y-1 transition-all"
                onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto border-t border-white/10 pt-12">
              <div className="text-center">
                <div className="text-4xl font-display text-[#0EA5E9] mb-1">$0</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Cost to Nonprofits</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#0EA5E9] mb-1">100%</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Open Source</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#0EA5E9] mb-1">2x</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Impact Multiplier</div>
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

      {/* 2. Mission Section */}
      <Section id="mission" background="cream">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <SectionHeader 
              title="The Tech Gap in Social Impact" 
              className="mb-8"
            />
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Thousands of mission-driven organizations rely on spreadsheets and paper to manage life-changing work. Commercial software is too expensive, and off-the-shelf tools rarely fit their unique needs.
              </p>
              <p>
                Meanwhile, talented junior developers struggle to find their first role in a tech industry that demands "senior-only" experience, creating a bottleneck for diverse talent entering the field.
              </p>
              <p className="font-semibold text-[#0B1D3A]">
                CodeForward bridges this gap by solving both problems simultaneously.
              </p>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0B1D3A] text-white p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden group"
          >
            {/* Decorative background circle */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#0EA5E9] rounded-full opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            
            <h3 className="text-2xl font-display mb-8 relative z-10">The CodeForward Cycle</h3>
            <ul className="space-y-6 relative z-10">
              {[
                "We identify nonprofits with critical software needs.",
                "Senior engineers scope and architect bespoke solutions.",
                "Junior fellows build the software under senior mentorship.",
                "Nonprofits get free tools; Fellows get career-launching experience."
              ].map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0EA5E9] text-[#0B1D3A] font-bold flex items-center justify-center text-sm">
                    {i + 1}
                  </div>
                  <p className="text-white/90 font-light">{step}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </Section>

      {/* 3. What We Do (Three Pillars) */}
      <Section id="what-we-do" background="white">
        <SectionHeader 
          title="Our Three Pillars" 
          subtitle="How we create sustainable impact for communities and careers."
          centered
        />
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Code2,
              title: "Pro Bono Engineering",
              desc: "We function as a high-end software consultancy, but our invoice is always $0. We build robust, secure, maintainable web applications tailored to specific operational needs."
            },
            {
              icon: GraduationCap,
              title: "Workforce Training",
              desc: "Our Fellowship provides pre-apprenticeship style training. Fellows work in a real agile environment, conduct code reviews, and ship production code."
            },
            {
              icon: HeartHandshake,
              title: "Sustainable Impact",
              desc: "By removing software costs, we help nonprofits direct more funding to their beneficiaries. By launching careers, we increase economic mobility for fellows."
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className="p-8 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B1D3A] to-[#0EA5E9]" />
              <div className="w-12 h-12 bg-[#0EA5E9]/10 rounded-xl flex items-center justify-center text-[#0EA5E9] mb-6 group-hover:bg-[#0EA5E9] group-hover:text-white transition-colors">
                <card.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#0B1D3A] mb-4">{card.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 4. Who We Serve */}
      <Section id="who-we-serve" background="navy">
        <SectionHeader 
          title="Who We Serve" 
          subtitle="Our focus is on small-to-medium nonprofits where custom software can be transformational."
          className="text-white"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            "Food Banks",
            "Legal Aid Clinics",
            "Housing Advocacy",
            "Education Nonprofits",
            "Environmental Groups",
            "Animal Shelters",
            "Community Health",
            "Arts Organizations"
          ].map((sector, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05, backgroundColor: "#0EA5E9", color: "#0B1D3A" }}
              className="bg-white/5 border border-white/10 p-6 rounded-xl flex items-center justify-center text-center h-32 cursor-default transition-colors"
            >
              <span className="font-display text-xl tracking-wide">{sector}</span>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 5. Training / Fellowship */}
      <Section id="training" background="cream">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <SectionHeader 
              title="The Engineering Fellowship" 
              subtitle="Bridging the gap between coding bootcamps and first engineering roles."
            />
            <div className="space-y-12">
              {[
                {
                  title: "Real Production Code",
                  desc: "No toy projects. Fellows write code that is deployed to real users solving real problems."
                },
                {
                  title: "Senior Mentorship",
                  desc: "Fellows are paired with industry veterans from top tech companies for code review and career guidance."
                },
                {
                  title: "Agile Workflow",
                  desc: "We simulate a professional product team environment with sprints, standups, and retro."
                },
                {
                  title: "Portfolio of Impact",
                  desc: "Graduates leave with a deployed, live case study demonstrating their ability to deliver value."
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="text-[#0EA5E9] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#0B1D3A] mb-2">{item.title}</h4>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 lg:sticky lg:top-32">
            <h3 className="text-2xl font-display text-[#0B1D3A] mb-6">Who We're Looking For</h3>
            <p className="text-muted-foreground mb-8">
              We focus on high-potential individuals from non-traditional backgrounds who have completed initial training but need that first break.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {[
                "Bootcamp Graduates",
                "Self-Taught Devs",
                "Career Switchers",
                "Veterans",
                "Returning Parents",
                "Underrepresented Groups"
              ].map((tag, i) => (
                <span 
                  key={i} 
                  className="px-4 py-2 bg-[#FAF7F2] text-[#0B1D3A] rounded-full text-sm font-medium border border-[#0B1D3A]/10 hover:bg-[#0B1D3A] hover:text-white transition-colors cursor-default"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Next Cohort</span>
                <span className="text-sm font-bold text-[#0B1D3A]">Fall 2025</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Status</span>
                <span className="text-sm font-bold text-[#0EA5E9]">Waitlist Open</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 6. Transparency / Downloads */}
      <Section background="white">
        <div className="bg-slate-50 rounded-3xl p-8 md:p-16 text-center border border-slate-200">
          <Code2 className="w-12 h-12 text-[#0B1D3A] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-display text-[#0B1D3A] mb-4">
            Radical Transparency
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            We believe in open source and open operations. Read our detailed founding proposal to understand our operating model, budget projections, and impact metrics.
          </p>
          <Button 
            className="bg-[#0B1D3A] hover:bg-[#0B1D3A]/90 text-white font-bold rounded-full px-8 py-6 h-auto"
            onClick={() => window.open('/proposal.pdf', '_blank')}
          >
            Download Full Proposal (PDF)
          </Button>
        </div>
      </Section>

      {/* 7. CTA / Get Involved */}
      <section id="get-involved" className="py-24 bg-gradient-to-br from-[#0B1D3A] to-[#1a3b6e] text-white relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0EA5E9] rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-display mb-8">
            Help Us Build the Future
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-12 font-light leading-relaxed">
            Whether you're a nonprofit needing tech, an engineer wanting to mentor, or a donor looking for high-leverage impact, we want to talk.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-[#0B1D3A] font-bold text-lg px-8 py-8 h-auto rounded-xl shadow-lg hover:shadow-[#0EA5E9]/30 transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:donate@codeforward.org"}
            >
              <HeartHandshake className="mr-2 w-6 h-6" />
              Make a Donation
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="bg-transparent border-white/30 hover:bg-white/10 text-white font-bold text-lg px-8 py-8 h-auto rounded-xl transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:hello@codeforward.org"}
            >
              <Mail className="mr-2 w-6 h-6" />
              Start a Conversation
            </Button>
          </div>

          <p className="mt-12 text-sm text-white/40">
            CodeForward is a registered 501(c)(3) nonprofit organization. All donations are tax-deductible.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
