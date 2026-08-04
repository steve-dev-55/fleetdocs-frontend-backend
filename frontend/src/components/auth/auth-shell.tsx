import { Link } from "react-router-dom";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-4 sm:px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-foreground"
        >
          <div className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
            F
          </div>
          <span className="text-lg font-semibold">FleetDocs</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {children}
          </div>
          {footer && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
