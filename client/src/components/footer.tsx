import { Link } from "wouter";
import { Mail, Github, Linkedin, Twitter } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import logoImg from "@/assets/images/logo.png";

export function Footer() {
  return (
    <footer className="bg-[#08152b] text-white/60 py-16 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="flex items-center gap-3 mb-6 cursor-pointer">
            <img src={logoImg} alt="Handlekraft Digital logo" className="w-10 h-10 rounded-lg" />
            <Wordmark size="md" className="text-white" showTagline taglineClassName="text-[#14B8A6]/70" />
          </Link>
          <p className="max-w-md text-sm leading-relaxed mb-2">
            <span className="italic text-white/40">Handləkraft</span> — Norwegian for <span className="text-white/80">the power to act</span>.
          </p>
          <p className="max-w-md text-sm leading-relaxed mb-4">
            A 501(c)(3) nonprofit initiative. All donations are tax-deductible.
          </p>
          <p className="max-w-md text-sm leading-relaxed mb-8 text-white/40">
            Founded by a father-son team. Powered by agency, code, and community.
          </p>
          <div className="flex gap-4">
            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#14B8A6] hover:text-[#0B1D3A] transition-colors"><Twitter size={18} /></a>
            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#14B8A6] hover:text-[#0B1D3A] transition-colors"><Github size={18} /></a>
            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#14B8A6] hover:text-[#0B1D3A] transition-colors"><Linkedin size={18} /></a>
            <a href="mailto:hello@handlekraft.ai" className="p-2 bg-white/5 rounded-full hover:bg-[#14B8A6] hover:text-[#0B1D3A] transition-colors"><Mail size={18} /></a>
          </div>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6">Organization</h4>
          <ul className="space-y-4 text-sm">
            <li><a href="#mission" className="hover:text-[#14B8A6] transition-colors">Our Mission</a></li>
            <li><a href="#what-we-do" className="hover:text-[#14B8A6] transition-colors">What We Do</a></li>
            <li><a href="#training" className="hover:text-[#14B8A6] transition-colors">Fellowship</a></li>
            <li><a href="/proposal.pdf" className="hover:text-[#14B8A6] transition-colors">Our Proposal</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6">Contact</h4>
          <ul className="space-y-4 text-sm">
            <li><a href="mailto:hello@handlekraft.ai" className="hover:text-[#14B8A6] transition-colors">hello@handlekraft.ai</a></li>
            <li>San Francisco, CA</li>
            <li className="pt-4 text-xs opacity-50">
              &copy; {new Date().getFullYear()} Handlekraft Digital. All rights reserved.
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
