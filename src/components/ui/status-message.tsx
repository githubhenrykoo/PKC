import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusMessageProps {
  message: string;
  type?: "success" | "info" | "warning" | "error";
  duration?: number;
}

export function showStatusMessage(props: StatusMessageProps) {
  const { message, type = "success", duration = 3000 } = props;
  
  toast[type](message, {
    duration,
  });
}

export function StatusMessageToaster() {
  return <Toaster richColors position="bottom-center" />;
}

export function StatusMessageAlert({ 
  message, 
  type = "success", 
  className 
}: StatusMessageProps & { className?: string }) {
  const Icon = type === "success" || type === "info" 
    ? CheckCircle 
    : AlertCircle;
  
  const variantClass = type === "success" 
    ? "bg-success text-success-foreground" 
    : type === "info" 
      ? "bg-info text-info-foreground"
      : "bg-destructive text-destructive-foreground";

  return (
    <Alert 
      variant="default"
      className={cn(
        "fixed bottom-8 left-1/2 transform -translate-x-1/2 w-auto max-w-md",
        "flex items-center gap-3 shadow-lg opacity-0 transition-all duration-300",
        "data-[state=open]:opacity-100 data-[state=open]:animate-in",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out",
        variantClass,
        className
      )}
    >
      <Icon className="h-5 w-5" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
