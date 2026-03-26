import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetLayoutProps {
  title: string;
  description?: string;
  loading?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** When true, the content area becomes vertically scrollable. */
  scrollable?: boolean;
}

export function WidgetLayout({
  title,
  description,
  loading = false,
  actions,
  children,
  className,
  scrollable = true,
}: WidgetLayoutProps) {
  return (
    <Card
      className={cn("h-full flex flex-col transition-all hover:shadow-md", className)}
    >
      {/* HEADER */}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>

        {actions && (
          <div className="flex-shrink-0 ml-2">
            {actions}
          </div>
        )}
      </CardHeader>

      {/* CONTENT */}
      <CardContent
        className={cn(
          "flex-1 pt-0",
          scrollable && "overflow-y-auto scrollbar-thin"
        )}
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
