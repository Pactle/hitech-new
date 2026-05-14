"use client";

import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  Gauge,
  Home,
  PackageOpen,
  Settings,
  Truck,
  UploadCloud,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Overview", icon: Home },
  { label: "Inquiries", icon: PackageOpen },
  { label: "Quotations", icon: FileSpreadsheet, active: true },
  { label: "Raw Materials", icon: Boxes },
  { label: "Nesting Engine", icon: Gauge },
  { label: "Freight", icon: Truck },
  { label: "Customers", icon: Users },
  { label: "Uploads", icon: UploadCloud },
  { label: "Settings", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-white lg:block">
      <div className="flex h-16 items-center border-b px-5">
        <div>
          <p className="text-lg font-bold text-ink">Pactle</p>
          <p className="text-xs text-steel">Automating quote-to-cash</p>
        </div>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {items.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-steel hover:bg-secondary hover:text-ink",
              item.active && "bg-accent text-primary"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="absolute bottom-0 hidden w-64 border-r border-t bg-white p-4 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            H
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Hi-Tech</p>
            <p className="text-xs text-steel">sales@hitechpolyplast.in</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
