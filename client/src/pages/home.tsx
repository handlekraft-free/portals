import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Code2, GraduationCap, Users, HeartHandshake, ArrowDown, Mail, Building2, UserPlus, Home as HomeIcon, Heart, Handshake, UtensilsCrossed, Baby, Shield, Landmark, Building } from "lucide-react";
import { motion } from "framer-motion";
import logoImg from "@/assets/images/logo.png";

export default function Home() {
  return (
    <div className="min-h-screen font-body selection:bg-[#14B8A6] selection:text-white">
      <Navbar />
      
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0B1D3A] text-white pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#14B8A6] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-amber-400 rounded-full mix-blend-screen filter blur-[100px] opacity-10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center mb-8">
              <img src={logoImg} alt="The Buddy Promise" className="w-20 h-20 rounded-2xl shadow-2xl" data-testid="img-hero-logo" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-8 backdrop-blur-sm" data-testid="text-badge">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
              Early-Stage 501(c)(3) Nonprofit Initiative
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display leading-[1.1] mb-8" data-testid="text-hero-heading">
              A Promise to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-emerald-200">
                Build Together
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 font-light leading-relaxed" data-testid="text-hero-subtitle">
              We pair aspiring product builders with community organizations that need help — creating free software and websites side by side, like buddies do.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button 
                size="lg" 
                className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-[#0B1D3A] text-lg font-bold rounded-full px-8 h-14 shadow-xl shadow-[#14B8A6]/20 hover:-translate-y-1 transition-all"
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
                <div className="text-4xl font-display text-[#14B8A6] mb-1" data-testid="text-stat-cost">$0</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Cost to Organizations</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#14B8A6] mb-1">100%</div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-medium">Donation Funded</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display text-[#14B8A6] mb-1">2x</div>
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
              title="Everyone deserves a buddy in their corner." 
              className="mb-8"
            />
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Thousands of community organizations — shelters, clinics, food banks — and underfunded local agencies rely on spreadsheets and paper to manage work that changes lives. The software they need is out of reach. The people who could build it are out of opportunities.
              </p>
              <p>
                We believe the best way to learn is by helping someone. And the best way to get help is from someone who genuinely cares. AI-powered tools mean motivated people can own and deliver real products faster than ever — you don't need a CS degree to solve real problems.
              </p>
              <p className="font-semibold text-[#0B1D3A]">
                The Buddy Promise brings these two worlds together — pairing people who want to solve problems with organizations that need a hand.
              </p>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0B1D3A] text-white p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#14B8A6] rounded-full opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            
            <h3 className="text-2xl font-display mb-8 relative z-10">How The Buddy Promise Works</h3>
            <ul className="space-y-6 relative z-10">
              {[
                "A community organization tells us what they need — a website, a scheduling tool, a better way to track clients.",
                "We pair them with aspiring product builders who own the solution end to end — using AI-powered tools with senior guidance every step of the way.",
                "The organization gets a custom tool that fits their work. The fellow gets real experience and a portfolio of products they're proud of.",
                "Graduates pay it forward — mentoring the next group of buddies."
              ].map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#14B8A6] text-[#0B1D3A] font-bold flex items-center justify-center text-sm">
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
          title="Three ways we keep our promise." 
          subtitle="Every product we build serves two purposes: helping an organization and launching a career."
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
              title: "A Growing Family",
              desc: "As fellows grow, they mentor the next group. Each graduating class strengthens our ability to help more organizations and welcome more learners. Everyone lifts everyone."
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className="p-8 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B1D3A] to-[#14B8A6]" />
              <div className="w-12 h-12 bg-[#14B8A6]/10 rounded-xl flex items-center justify-center text-[#14B8A6] mb-6 group-hover:bg-[#14B8A6] group-hover:text-white transition-colors">
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

      <Section id="who-we-serve" background="navy">
        <SectionHeader 
          title="Built for the people who build our communities." 
          subtitle="If your organization runs on shoestring technology and a whole lot of heart, we'd love to help."
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
              whileHover={{ scale: 1.05, backgroundColor: "#14B8A6", color: "#0B1D3A" }}
              className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center text-center h-36 cursor-default transition-colors"
              data-testid={`card-sector-${sector.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <sector.icon className="w-8 h-8 mb-3 text-[#14B8A6]" />
              <span className="font-display text-lg tracking-wide mb-1">{sector.name}</span>
              <span className="text-xs text-white/50 leading-tight">{sector.desc}</span>
            </motion.div>
          ))}
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
                    <CheckCircle2 className="text-[#14B8A6] w-6 h-6" />
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
              No college degree required. No bootcamp tuition. We're not looking for people who already know how to code — we're looking for people who want to solve problems and own the outcome. If you have a high school diploma or GED and the heart to help, you're exactly who we want as a buddy.
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
                  data-testid={`tag-candidate-${i}`}
                >
                  {tag}
                </span>
              ))}
            </div>

            <Button 
              className="w-full bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-[#0B1D3A] font-bold rounded-full h-14 text-lg shadow-lg shadow-[#14B8A6]/20"
              onClick={() => window.location.href = "mailto:apply@thebuddypromise.org?subject=Fellowship%20Application"}
              data-testid="button-apply-fellowship"
            >
              <UserPlus className="mr-2 w-5 h-5" />
              Apply for the Fellowship <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">Only a HS diploma or GED required. All backgrounds welcome.</p>
          </div>
        </div>
      </Section>

      <Section background="white">
        <div className="bg-slate-50 rounded-3xl p-8 md:p-16 text-center border border-slate-200">
          <Code2 className="w-12 h-12 text-[#0B1D3A] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-display text-[#0B1D3A] mb-4" data-testid="text-proposal-heading">
            Read the full story.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            The Buddy Promise is just getting started. Our proposal covers everything — our mission, how we operate, how we fund the work, and where we're headed. We'd love your thoughts and your support.
          </p>
          <Button 
            className="bg-[#0B1D3A] hover:bg-[#0B1D3A]/90 text-white font-bold rounded-full px-8 py-6 h-auto"
            onClick={() => window.open('/proposal.pdf', '_blank')}
            data-testid="button-download-proposal"
          >
            Download Our Proposal (PDF) <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">This is a living document. We welcome questions, ideas, and conversations.</p>
        </div>
      </Section>

      <section id="get-involved" className="py-24 bg-gradient-to-br from-[#0B1D3A] to-[#1a3b6e] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#14B8A6] rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-display mb-8" data-testid="text-cta-heading">
            Be part of something good.
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-6 font-light leading-relaxed">
            Whether you want to sponsor our work, volunteer your skills, apply for the fellowship, or connect us with an organization that needs help — there's a place for you in The Buddy Promise.
          </p>

          <p className="text-lg text-white/60 mb-12 font-light">
            We're looking for founding sponsors and board members who want to help shape this from the ground up. Come build something meaningful with us.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button 
              size="lg" 
              className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-[#0B1D3A] font-bold text-lg px-8 py-8 h-auto rounded-xl shadow-lg hover:shadow-[#14B8A6]/30 transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:donate@thebuddypromise.org?subject=Founding%20Sponsor%20Inquiry"}
              data-testid="button-founding-sponsor"
            >
              <HeartHandshake className="mr-2 w-6 h-6" />
              Become a Founding Sponsor
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="bg-transparent border-white/30 hover:bg-white/10 text-white font-bold text-lg px-8 py-8 h-auto rounded-xl transition-all w-full sm:w-auto"
              onClick={() => window.location.href = "mailto:hello@thebuddypromise.org?subject=Board%20Member%20Interest"}
              data-testid="button-join-board"
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
              onClick={() => window.location.href = "mailto:hello@thebuddypromise.org"}
              data-testid="button-conversation"
            >
              <Mail className="mr-2 w-6 h-6" />
              Start a Conversation
            </Button>
          </div>

          <p className="mt-12 text-sm text-white/40">
            The Buddy Promise is a 501(c)(3) nonprofit initiative. All donations are tax-deductible.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
