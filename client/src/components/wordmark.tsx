import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  showTagline?: boolean;
  taglineClassName?: string;
}

const sizes = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
  hero: "text-5xl md:text-7xl",
};

const taglineSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
  hero: "text-lg md:text-xl",
};

export function Wordmark({ className, size = "md", showTagline = false, taglineClassName }: WordmarkProps) {
  return (
    <div className="flex flex-col" data-testid="wordmark">
      <span className={cn("font-display tracking-wide leading-none", sizes[size], className)}>
        handl&#x259;kraft
      </span>
      {showTagline && (
        <span className={cn("uppercase tracking-[0.25em] font-body font-medium mt-1", taglineSizes[size], taglineClassName)}>
          The Power to Act
        </span>
      )}
    </div>
  );
}
