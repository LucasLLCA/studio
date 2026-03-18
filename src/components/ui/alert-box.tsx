import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertBoxVariants = cva(
  "p-3 rounded-md border flex items-start gap-2",
  {
    variants: {
      variant: {
        info: "bg-info/10 border-info/30 [&>svg]:text-info",
        warning: "bg-warning/10 border-warning/30 [&>svg]:text-warning",
        error: "bg-destructive/10 border-destructive/30 [&>svg]:text-destructive",
        success: "bg-success/10 border-success/30 [&>svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

interface AlertBoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertBoxVariants> {
  icon?: React.ReactNode;
  title?: string;
}

function AlertBox({
  className,
  variant,
  icon,
  title,
  children,
  ...props
}: AlertBoxProps) {
  return (
    <div className={cn(alertBoxVariants({ variant }), className)} {...props}>
      {icon && (
        <span className="flex-shrink-0 mt-0.5 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
      )}
      <div className="flex-1">
        {title && (
          <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        )}
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

export { AlertBox, alertBoxVariants }
