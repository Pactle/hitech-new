import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <Card className="min-h-[104px]">
      <CardContent className="flex h-full items-start justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-steel">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          {helper ? <p className="mt-1 text-xs text-steel">{helper}</p> : null}
        </div>
        <div className="rounded-md bg-accent p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
