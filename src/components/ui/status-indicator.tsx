import * as React from "react"
import { CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: 'completed' | 'in-progress';
  label?: string;
  className?: string;
}

function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  if (status === 'completed') {
    return (
      <span className={cn("text-sm text-success flex items-center gap-1", className)}>
        <CheckCircle className="h-3.5 w-3.5" /> {label ?? "Concluído"}
      </span>
    )
  }

  return (
    <span className={cn("text-sm text-muted-foreground flex items-center gap-1", className)}>
      <Clock className="h-3.5 w-3.5" /> {label ?? "Em andamento"}
    </span>
  )
}

export { StatusIndicator }
