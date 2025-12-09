import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
}

interface WorkflowStepsProps {
  steps: Step[];
  className?: string;
}

export function WorkflowSteps({ steps, className }: WorkflowStepsProps) {
  return (
    <nav className={cn("flex items-center justify-center", className)}>
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 transition-colors",
                  step.status === "completed" && "bg-primary border-primary text-primary-foreground",
                  step.status === "current" && "border-primary text-primary",
                  step.status === "upcoming" && "border-muted text-muted-foreground"
                )}
                data-testid={`step-indicator-${step.id}`}
              >
                {step.status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium hidden sm:inline",
                  step.status === "current" && "text-foreground",
                  step.status !== "current" && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-0.5 w-8 sm:w-12",
                  step.status === "completed" ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
