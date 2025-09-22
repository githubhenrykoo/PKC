import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/MVPCard/card.tsx";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ActionButton } from "@/components/ui/action-button";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import { showStatusMessage } from "@/components/ui/status-message";

interface PanelProps {
  imageSrc: string;
  imageAlt: string;
  redirectUrl?: string;
}

export function Panel({ 
  imageSrc, 
  imageAlt,
  redirectUrl = "/welcome"
}: PanelProps) {
  // State for button text
  const [buttonText, setButtonText] = useState("Push to Start");
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Handle countdown completion
  const handleCountdownComplete = () => {
    setIsRedirecting(true);
    showStatusMessage({ message: "Redirecting to Page...", type: "info" });
    
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 500);
  };
  
  // Handle button click
  const handleButtonClick = () => {
    setButtonText("Pushed!");
    setIsRedirecting(true);
    showStatusMessage({ message: "Action completed successfully!", type: "success" });
    
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 300);
  };

  return (
    <Card className="w-full max-w-lg overflow-hidden bg-card shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="relative bg-gradient-to-r from-indigo-50 to-indigo-100 p-8 text-center">
        <AspectRatio ratio={16/9} className="mx-auto max-w-[300px]">
          <div className="relative rounded-xl overflow-hidden shadow-xl group">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
              width="300"
              height="300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-indigo-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </AspectRatio>
      </div>
      
      <div className="p-8 flex flex-col items-center gap-6">
        <div className="w-full flex flex-col items-center gap-6">
          <ActionButton 
            text={buttonText} 
            onClick={handleButtonClick}
            disabled={isRedirecting}
            redirectUrl={redirectUrl}
          />
          
          {!isRedirecting && (
            <CountdownTimer 
              seconds={10} 
              onComplete={handleCountdownComplete} 
            />
          )}
        </div>
      </div>
    </Card>
  );
}
