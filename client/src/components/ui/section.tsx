import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: "white" | "cream" | "navy";
}

export function Section({ children, className, id, background = "white", ...props }: SectionProps) {
  const bgStyles = {
    white: "bg-white",
    cream: "bg-[#FAF7F2]",
    navy: "bg-[#0B1D3A] text-white",
  };

  return (
    <section
      id={id}
      className={cn(
        "py-20 md:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden",
        bgStyles[background],
        className
      )}
      {...props}
    >
      <div className="max-w-7xl mx-auto relative z-10">
        {children}
      </div>
    </section>
  );
}

export function SectionHeader({ title, subtitle, className, centered = false }: { title: string; subtitle?: string; className?: string; centered?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={cn("mb-16", centered && "text-center mx-auto max-w-3xl", className)}
    >
      <h2 className="text-3xl md:text-5xl font-normal tracking-tight mb-6 text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg md:text-xl text-muted-foreground/90 font-light leading-relaxed text-balance">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
