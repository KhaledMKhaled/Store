import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  FileText, 
  Clock, 
  CheckCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

type ShipmentStatus = "CREATED" | "IMPORTING_DETAILS_DONE" | "CUSTOMS_IN_PROGRESS" | "CUSTOMS_RECEIVED";

interface StatusBadgeProps {
  status: ShipmentStatus;
  className?: string;
}

const statusConfig: Record<ShipmentStatus, { label: string; icon: typeof Package; className: string }> = {
  CREATED: {
    label: "تم الإنشاء",
    icon: Package,
    className: "bg-muted text-muted-foreground",
  },
  IMPORTING_DETAILS_DONE: {
    label: "اكتمل الاستيراد",
    icon: FileText,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  CUSTOMS_IN_PROGRESS: {
    label: "الجمارك قيد التنفيذ",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  CUSTOMS_RECEIVED: {
    label: "تم استلام الجمارك",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 px-2.5 py-0.5 text-xs font-medium border-0",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
