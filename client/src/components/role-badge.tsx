import { Badge } from "@/components/ui/badge";
import { Shield, Edit, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; className: string }> = {
  ADMIN: {
    label: "Admin",
    icon: Shield,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  OPERATOR: {
    label: "Operator",
    icon: Edit,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  VIEWER: {
    label: "Viewer",
    icon: Eye,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role];
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
