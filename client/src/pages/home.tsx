import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Code2, GraduationCap, Users, HeartHandshake, ArrowDown, Mail, Building2, UserPlus } from "lucide-react";
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
              We build bespoke software and websites — at no cost — for nonprofits, local agencies, and community organizations. And we train the next generation of developers to do it.
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
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Cost to Organizations</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#0EA5E9] mb-1">100%</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Donation Funded</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#0EA5E9] mb-1">2x</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Impact: Software + Jobs</div>
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
              title="Technology shouldn't be a luxury. Neither should opportunity." 
              className="mb-8"
            />
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Thousands of community organizations — shelters, clinics, food banks — and underfunded state and local government agencies rely on spreadsheets and paper to manage life-changing work. Commercial software is too expensive, and off-the-shelf tools rarely fit their unique needs.
              </p>
              <p>
                At the same time, talented people from underserved communities are locked out of tech careers by an industry that demands years of experience for entry-level roles. The timing has never been better: AI-assisted development tools are making it possible for motivated learners to build real software faster than ever before.
              </p>
              <p className="font-semibold text-[#0B1D3A]">
                CodeForward bridges both gaps at once — delivering free custom software to the organizations and agencies that need it most, while training the next generation of developers to build it.
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
                "Community organizations and local agencies apply for free custom software.",
                "Trainees build solutions using AI-assisted tools under expert supervision.",
                "Organizations get powerful tools; trainees get real portfolio projects.",
                "Graduates enter the workforce and mentor the next cohort."
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
              desc: "Custom-built intake systems, scheduling tools, donor management platforms, websites, dashboards, and workflow automation — tailored to each organization's needs and delivered at no cost."
            },
            {
              icon: GraduationCap,
              title: "Workforce Training",
              desc: "A 2-4 week foundational program followed by supervised work on real client projects. Trainees use AI-assisted tools to build functional software from day one, creating a fast on-ramp to tech careers."
            },
            {
              icon: HeartHandshake,
              title: "The Virtuous Cycle",
              desc: "As trainees advance, they take on more complex projects and mentor new cohorts. The organization's capacity grows while creating a sustainable pipeline of skilled, employed developers."
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
          title="Built for the organizations that build our communities." 
          subtitle="If you're a nonprofit, community service organization, or local government agency running on shoestring technology, we want to hear from you."
          className="text-white"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { emoji: "🏠", name: "Shelters", desc: "Homeless shelters and transitional housing programs" },
            { emoji: "🏥", name: "Clinics", desc: "Free and sliding-scale community health clinics" },
            { emoji: "🤝", name: "Social Services", desc: "Case management and social service agencies" },
            { emoji: "🍳", name: "Food Banks", desc: "Food banks, pantries, and community kitchens" },
            { emoji: "👩‍👩‍👧", name: "Youth Programs", desc: "Mentorship and after-school programs" },
            { emoji: "🎖️", name: "Veteran Services", desc: "Veteran service and transition organizations" },
            { emoji: "🏛️", name: "Local Government", desc: "Underserved state and local agencies serving the public" },
            { emoji: "🏙️", name: "Community Orgs", desc: "Neighborhood and community development groups" },
          ].map((sector, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05, backgroundColor: "#0EA5E9", color: "#0B1D3A" }}
              className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center text-center h-36 cursor-default transition-colors"
            >
              <span className="text-3xl mb-2">{sector.emoji}</span>
              <span className="font-display text-lg tracking-wide mb-1">{sector.name}</span>
              <span className="text-xs text-white/50 leading-tight">{sector.desc}</span>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 5. Training / Fellowship */}
      <Section id="training" background="cream">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <SectionHeader 
              title="Learn by building things that matter." 
              subtitle="No CS degree required. No bootcamp tuition. Just problem-solving instincts and the drive to learn."
            />
            <div className="space-y-12">
              {[
                {
                  title: "Foundations",
                  desc: "2-4 weeks of core concepts: databases, forms, logic, version control. Taught through AI-assisted tools."
                },
                {
                  title: "Real Projects",
                  desc: "Build software for real organizations immediately. Portfolio from day one. Senior review before anything goes live."
                },
                {
                  title: "Advance & Mentor",
                  desc: "Top performers graduate into reviewer and team lead roles. Mentor the next cohort."
                },
                {
                  title: "Launch Your Career",
                  desc: "Graduate with a real-world portfolio, verifiable experience, and modern AI-assisted development skills."
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
            <p className="text-muted-foreground mb-4">
              No college degree required. No bootcamp tuition. If you have a high school diploma or GED, problem-solving instincts, and the drive to learn — you're exactly who we're looking for. Non-traditional candidates are our priority.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                "GED Holders",
                "Career Changers",
                "Veterans",
                "Formerly Incarcerated",
                "Single Parents",
                "Self-Taught Learners",
                "Underemployed Workers",
                "Community College Students",
                "Non-Degree Candidates",
                "Second Chance Seekers"
              ].map((tag, i) => (
                <span 
                  key={i} 
                  className="px-4 py-2 bg-[#FAF7F2] text-[#0B1D3A] rounded-full text-sm font-medium border border-[#0B1D3A]/10 hover:bg-[#0B1D3A] hover:text-white transition-colors cursor-default"
                >
                  {tag}
                </span>
              ))}
            </div>

            <Button 
              className="w-full bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-[#0B1D3A] font-bold rounded-full h-14 text-lg shadow-lg shadow-[#0EA5E9]/20"
              onClick={() => window.location.href = "mailto:apply@codeforward.org?subject=Engineering%20Fellowship%20Application"}
            >
              <UserPlus className="mr-2 w-5 h-5" />
              Apply for the Fellowship <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">Only a HS diploma or GED required. All backgrounds welcome.</p>
          </div>
        </div>
      </Section>

      {/* 6. Transparency / Downloads */}
      <Section background="white">
        <div className="bg-slate-50 rounded-3xl p-8 md:p-16 text-center border border-slate-200">
          <Code2 className="w-12 h-12 text-[#0B1D3A] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-display text-[#0B1D3A] mb-4">
            Read the full proposal.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            CodeForward is in its founding stage. We've put together a detailed organizational proposal covering our mission, operating model, funding strategy, workforce development program, and implementation timeline. We'd love your feedback — and your support.
          </p>
          <Button 
            className="bg-[#0B1D3A] hover:bg-[#0B1D3A]/90 text-white font-bold rounded-full px-8 py-6 h-auto"
            onClick={() => window.open('/proposal.pdf', '_blank')}
          >
            Download Full Proposal (PDF) <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">This is a living document. We welcome questions, critiques, and conversations.</p>
        </div>
      </Section>

      {/* 7. CTA / Get Involved */}
      <section id="get-involved" className="py-24 bg-gradient-to-br from-[#0B1D3A] to-[#1a3b6e] text-white relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0EA5E9] rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-display mb-8">
            Help us write the code for a better community.
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-6 font-light leading-relaxed">
            Whether you want to donate, volunteer your development skills, apply for training, or refer a nonprofit or local agency that needs help — there's a place for you at CodeForward.
          </p>

          <p className="text-lg text-white/60 mb-12 font-light">
            We're actively seeking founding corporate sponsors and board members to help shape CodeForward from the ground up. This is your chance to be part of something from day one.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button 
              size="lg" 
              className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-[#0B1D3A] font-bold text-lg px-8 py-8 h-auto rounded-xl shadow-lg hover:shadow-[#0EA5E9]/30 transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:donate@codeforward.org?subject=Founding%20Sponsor%20Inquiry"}
            >
              <HeartHandshake className="mr-2 w-6 h-6" />
              Become a Founding Sponsor
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="bg-transparent border-white/30 hover:bg-white/10 text-white font-bold text-lg px-8 py-8 h-auto rounded-xl transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:hello@codeforward.org?subject=Board%20Member%20Interest"}
            >
              <Building2 className="mr-2 w-6 h-6" />
              Join Our Board
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
            CodeForward is a 501(c)(3) nonprofit initiative. All donations are tax-deductible.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
