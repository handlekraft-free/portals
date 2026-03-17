import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
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
    { name: "Our Mission", href: "#mission" },
    { name: "What We Do", href: "#what-we-do" },
    { name: "Who We Serve", href: "#who-we-serve" },
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
            <img src={logoImg} alt="handlekraft.ai logo" className="w-12 h-12 rounded-lg shadow-lg" />
            <Wordmark size="md" className="text-white" data-testid="text-brand-name" />
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
                className="text-white/80 hover:text-[#D4A843] text-sm font-medium transition-colors"
                data-testid={`link-nav-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.name}
              </a>
            ))}
            <Link href="/login">
              <Button
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 hover:border-white/70 rounded-full px-5 text-sm font-medium transition-all"
                data-testid="button-portal-login"
              >
                Login
              </Button>
            </Link>
            <Button 
              className="bg-[#D4A843] hover:bg-[#D4A843]/90 text-[#1A1F2B] font-bold rounded-full px-6 hover:shadow-lg hover:shadow-[#D4A843]/20 transition-all"
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
            className="fixed inset-0 z-40 bg-[#1A1F2B] pt-24 px-6 md:hidden"
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
                  <ChevronRight className="w-5 h-5 text-[#D4A843]" />
                </a>
              ))}
              <Button 
                className="bg-[#D4A843] text-[#1A1F2B] w-full py-6 text-lg font-bold mt-4"
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
