import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/images/logo.png";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Our Promise", href: "#mission" },
    { name: "What We Do", href: "#what-we-do" },
    { name: "Who We Help", href: "#who-we-serve" },
    { name: "Fellowship", href: "#training" },
  ];

  const handleNavClick = (href: string) => {
    setIsMobileOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled ? "glass-nav py-3" : "bg-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src={logoImg} alt="The Buddy Promise logo" className="w-10 h-10 rounded-lg shadow-lg" />
            <span className="text-white font-display text-2xl tracking-wide" data-testid="text-brand-name">
              The Buddy Promise
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="text-white/80 hover:text-[#14B8A6] text-sm font-medium transition-colors"
                data-testid={`link-nav-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.name}
              </a>
            ))}
            <Button 
              className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-[#0B1D3A] font-bold rounded-full px-6 hover:shadow-lg hover:shadow-[#14B8A6]/20 transition-all"
              onClick={() => handleNavClick("#get-involved")}
              data-testid="button-get-involved"
            >
              Get Involved
            </Button>
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#0B1D3A] pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className="text-2xl font-display text-white border-b border-white/10 pb-4 flex justify-between items-center"
                >
                  {link.name}
                  <ChevronRight className="w-5 h-5 text-[#14B8A6]" />
                </a>
              ))}
              <Button 
                className="bg-[#14B8A6] text-[#0B1D3A] w-full py-6 text-lg font-bold mt-4"
                onClick={() => handleNavClick("#get-involved")}
              >
                Get Involved
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
