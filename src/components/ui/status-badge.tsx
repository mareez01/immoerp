import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        new: "bg-info/10 text-info border border-info/20",
        pending: "bg-warning/10 text-warning border border-warning/20",
        in_progress: "bg-purple-100 text-purple-700 border border-purple-200",
        completed: "bg-success/10 text-success border border-success/20",
        cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
        active: "bg-success/10 text-success border border-success/20",
        inactive: "bg-muted text-muted-foreground border border-border",
        unsubscribed: "bg-destructive/10 text-destructive border border-destructive/20",
        paid: "bg-success/10 text-success border border-success/20",
        overdue: "bg-destructive/10 text-destructive border border-destructive/20",
        pending_approval: "bg-amber-100 text-amber-700 border border-amber-200",
        draft: "bg-muted text-muted-foreground border border-border",
        sent: "bg-info/10 text-info border border-info/20",
        scheduled: "bg-info/10 text-info border border-info/20",
        confirmed: "bg-success/10 text-success border border-success/20",
        rescheduled: "bg-warning/10 text-warning border border-warning/20",
        low: "bg-muted text-muted-foreground border border-border",
        medium: "bg-info/10 text-info border border-info/20",
        high: "bg-warning/10 text-warning border border-warning/20",
        critical: "bg-destructive/10 text-destructive border border-destructive/20",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean;
}

export function StatusBadge({
  className,
  variant,
  size,
  dot = true,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant, size, className }))} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "new" && "bg-info",
            variant === "pending" && "bg-warning",
            variant === "in_progress" && "bg-purple-500",
            variant === "completed" && "bg-success",
            variant === "cancelled" && "bg-destructive",
            variant === "active" && "bg-success",
            variant === "inactive" && "bg-muted-foreground",
            variant === "unsubscribed" && "bg-destructive",
            variant === "paid" && "bg-success",
            variant === "overdue" && "bg-destructive",
            variant === "draft" && "bg-muted-foreground",
            variant === "sent" && "bg-info",
            variant === "scheduled" && "bg-info",
            variant === "confirmed" && "bg-success",
            variant === "rescheduled" && "bg-warning",
            variant === "low" && "bg-muted-foreground",
            variant === "medium" && "bg-info",
            variant === "high" && "bg-warning",
            variant === "critical" && "bg-destructive",
            !variant && "bg-secondary-foreground"
          )}
        />
      )}
      {children}
    </span>
  );
}

export function formatStatus(status?: string | null): string {
  if (!status) return 'N/A';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
