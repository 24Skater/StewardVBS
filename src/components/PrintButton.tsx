"use client";
import { Printer } from "lucide-react";
import { Button } from "@steward-apps/ui";

interface PrintButtonProps {
  className?: string;
  label?: string;
}

export default function PrintButton({
  className,
  label = "Print",
}: PrintButtonProps) {
  return (
    <Button variant="outline" onClick={() => window.print()} className={className}>
      <span className="flex items-center gap-2">
        <Printer className="h-4 w-4" />
        {label}
      </span>
    </Button>
  );
}
