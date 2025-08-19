import * as React from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface HeroCardProps {
  title: string;
  description?: string;
  imageSrc: string;
  imageAlt: string;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function HeroCard({
  title,
  description,
  imageSrc,
  imageAlt,
  className,
  contentClassName,
  children,
  footer
}: HeroCardProps) {
  return (
    <Card className={cn(
      "w-full max-w-lg bg-card shadow-xl overflow-hidden",
      "transition-all duration-300 hover:shadow-2xl",
      className
    )}>
      <AspectRatio ratio={16/9}>
        <img
          src={imageSrc}
          alt={imageAlt}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
      
      {footer && (
        <CardFooter className="flex justify-center p-6">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
