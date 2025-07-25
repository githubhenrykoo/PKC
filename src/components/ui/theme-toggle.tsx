import * as React from "react";
import { Button } from "@/components/ui/button";
import { SunIcon, MoonIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Initialize theme from localStorage or system preference on component mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || 
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle("dark-theme", isDark);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.classList.toggle("dark-theme", newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

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
