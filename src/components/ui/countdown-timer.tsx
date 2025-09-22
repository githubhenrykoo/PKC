import * as React from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
  className?: string;
  numberClassName?: string;
  textClassName?: string;
}

export function CountdownTimer({ 
  seconds = 10, 
  onComplete, 
  className,
  numberClassName,
  textClassName
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState(seconds);
  const [isFadingOut, setIsFadingOut] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Start the countdown
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Clear interval when we reach zero
          if (timerRef.current) clearInterval(timerRef.current);
          
          // Trigger fade out animation
          setIsFadingOut(true);
          
          // Call the onComplete callback after animation
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onComplete]);

  // Animation classes based on state
  const animationClass = isFadingOut 
    ? "opacity-0 translate-y-3 transition-all duration-500" 
    : "";

  return (
    <div className={cn(
      "flex items-center justify-center gap-2 text-muted-foreground text-lg transition-all",
      animationClass,
      className
    )}>
      <span className={cn("text-base font-medium", textClassName)}>
        or I will push myself in{" "}
        <span className={cn(
          "font-bold text-primary inline-block min-w-6 text-center",
          numberClassName
        )}>
          {timeLeft}
        </span>{" "}
        seconds
      </span>
    </div>
  );
}
