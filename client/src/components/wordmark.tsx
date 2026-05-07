import { cn } from "@/lib/utils";
import { BRAND } from "@shared/branding";

interface WordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  showTagline?: boolean;
  taglineClassName?: string;
}

const sizes = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
  hero: "text-4xl md:text-6xl",
};

const taglineSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
  hero: "text-base md:text-lg",
};

export function Wordmark({ className, size = "md", showTagline = false, taglineClassName }: WordmarkProps) {
  return (
    <div className="flex flex-col" data-testid="wordmark">
      <span className={cn("font-semibold tracking-tight leading-none", sizes[size], className)}>
        {BRAND.fullName}
      </span>
      {showTagline && BRAND.tagline && (
        <span className={cn("uppercase tracking-[0.18em] font-medium mt-1 opacity-70", taglineSizes[size], taglineClassName)}>
          {BRAND.tagline}
        </span>
      )}
    </div>
  );
}
