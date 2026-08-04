

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends React.ComponentProps<"input"> {
  onStrengthChange?: (score: number) => void;
}

function computeStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export function PasswordInput({
  className,
  onChange,
  onStrengthChange,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
        onChange={(e) => {
          onChange?.(e);
          onStrengthChange?.(computeStrength(e.target.value));
        }}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
        tabIndex={-1}
        aria-label={show ? "Masquer" : "Afficher"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function PasswordStrength({ score }: { score: number }) {
  const labels = ["", "Faible", "Moyen", "Bon", "Fort"];
  const colors = [
    "bg-muted",
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-green-500",
  ];
  if (score === 0) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= score ? colors[score] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Mot de passe {labels[score].toLowerCase()}
      </p>
    </div>
  );
}
