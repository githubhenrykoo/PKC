import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  text: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  redirectUrl?: string;
  redirectDelay?: number;
}

declare const anime: any;

export function ActionButton({ 
  text, 
  onClick, 
  className,
  disabled = false,
  redirectUrl,
  redirectDelay = 300
}: ActionButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [buttonText, setButtonText] = React.useState(text);
  
  // Animation functions
  const handleButtonClick = (e: React.MouseEvent) => {
    if (disabled) return;
    
    // Create ripple effect
    if (typeof document !== 'undefined' && buttonRef.current) {
      const button = buttonRef.current;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.className = 'absolute rounded-full bg-white/50 pointer-events-none';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      button.appendChild(ripple);
      
      // Use anime.js if available, otherwise use CSS
      if (typeof anime !== 'undefined') {
        anime({
          targets: ripple,
          width: 400,
          height: 400,
          opacity: [0.5, 0],
          left: x - 200,
          top: y - 200,
          easing: 'easeOutQuad',
          duration: 800,
          complete: () => ripple.remove()
        });
      } else {
        // CSS-only fallback
        ripple.style.width = '400px';
        ripple.style.height = '400px';
        ripple.style.left = `${x - 200}px`;
        ripple.style.top = `${y - 200}px`;
        ripple.style.opacity = '0';
        ripple.style.transition = 'all 800ms ease-out';
        
        setTimeout(() => ripple.remove(), 800);
      }
    }
    
    // Add pressed state with CSS
    if (buttonRef.current) {
      buttonRef.current.classList.add('scale-[0.98] opacity-90');
      setTimeout(() => {
        if (buttonRef.current) {
          buttonRef.current.classList.remove('scale-[0.98] opacity-90');
        }
      }, 200);
    }
    
    // Change button text to "Pushed!"
    setButtonText('Pushed!');
    
    // Call the onClick handler if provided
    if (onClick) onClick(e);
    
    // Redirect if URL provided
    if (redirectUrl) {
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, redirectDelay);
    }
  };
  
  // Hover animation effect
  const handleMouseEnter = () => {
    if (disabled || typeof anime === 'undefined') return;
    
    if (buttonRef.current) {
      anime({
        targets: buttonRef.current,
        translateY: -5,
        scale: 1.02,
        boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3), 0 4px 6px -2px rgba(79, 70, 229, 0.2)',
        duration: 300,
        easing: 'easeOutQuad'
      });
    }
  };
  
  const handleMouseLeave = () => {
    if (disabled || typeof anime === 'undefined') return;
    
    if (buttonRef.current) {
      anime({
        targets: buttonRef.current,
        translateY: 0,
        scale: 1,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        duration: 300,
        easing: 'easeOutQuad'
      });
    }
  };

  return (
    <Button
      ref={buttonRef}
      variant="default"
      size="lg"
      onClick={handleButtonClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden text-xl font-bold py-6 px-8 min-w-[280px]",
        "shadow-lg transition-all duration-300",
        disabled && "opacity-70 cursor-not-allowed transform-none",
        className
      )}
    >
      <span className="relative z-10 block w-full text-center">{buttonText}</span>
      <span 
        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/30 opacity-0 
        group-hover:opacity-100 transition-opacity duration-300"
      />
    </Button>
  );
}
