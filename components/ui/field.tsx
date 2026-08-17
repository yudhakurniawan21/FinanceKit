import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export { Field };
