import { Link } from "wouter";
import { Mail, Github, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#08152b] text-white/60 py-16 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="flex items-center gap-2 mb-6 cursor-pointer">
            <div className="w-8 h-8 bg-[#0EA5E9] rounded-lg flex items-center justify-center text-[#0B1D3A] font-bold text-xl leading-none">
              C
            </div>
            <span className="text-white font-display text-2xl tracking-wide">
              CodeForward
            </span>
          </Link>
          <p className="max-w-md text-sm leading-relaxed mb-4">
            A 501(c)(3) nonprofit initiative. All donations are tax-deductible.
          </p>
          <p className="max-w-md text-sm leading-relaxed mb-8 text-white/40">
            Founded by a Service-Disabled Veteran-Owned Small Business entrepreneur.
          </p>
          <div className="flex gap-4">
            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#0EA5E9] hover:text-[#0B1D3A] transition-colors"><Twitter size={18} /></a>
            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#0EA5E9] hover:text-[#0B1D3A] transition-colors"><Github size={18} /></a>
            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#0EA5E9] hover:text-[#0B1D3A] transition-colors"><Linkedin size={18} /></a>
            <a href="mailto:hello@codeforward.org" className="p-2 bg-white/5 rounded-full hover:bg-[#0EA5E9] hover:text-[#0B1D3A] transition-colors"><Mail size={18} /></a>
          </div>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6">Organization</h4>
          <ul className="space-y-4 text-sm">
            <li><a href="#mission" className="hover:text-[#0EA5E9] transition-colors">Our Mission</a></li>
            <li><a href="#what-we-do" className="hover:text-[#0EA5E9] transition-colors">Services</a></li>
            <li><a href="#training" className="hover:text-[#0EA5E9] transition-colors">Training Program</a></li>
            <li><a href="/proposal.pdf" className="hover:text-[#0EA5E9] transition-colors">Transparency</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6">Contact</h4>
          <ul className="space-y-4 text-sm">
            <li><a href="mailto:hello@codeforward.org" className="hover:text-[#0EA5E9] transition-colors">hello@codeforward.org</a></li>
            <li>San Francisco, CA</li>
            <li className="pt-4 text-xs opacity-50">
              © {new Date().getFullYear()} CodeForward. All rights reserved.
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
