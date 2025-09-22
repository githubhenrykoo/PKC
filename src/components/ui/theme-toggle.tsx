import * as React from "react";
import { Button } from "@/components/ui/button";
import { SunIcon, MoonIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "fixed top-6 right-6 h-10 w-10 rounded-full bg-card/80 shadow-md",
        "hover:bg-card hover:shadow-lg transition-all duration-200",
        className
      )}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-primary transition-all" />
      ) : (
        <MoonIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-primary transition-all" />
      )}
    </Button>
  );
}
