"use client";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  className?: string;
  label?: string;
}

export default function PrintButton({
  className = "rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700",
  label = "Print",
}: PrintButtonProps) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <span className="flex items-center gap-2">
        <Printer className="h-4 w-4" />
        {label}
      </span>
    </button>
  );
}
