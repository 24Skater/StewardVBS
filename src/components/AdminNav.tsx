"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/teachers", label: "Teachers" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/integrations/google-forms", label: "Google Forms" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <nav className="border-b border-[var(--st-border)]">
      <div className="flex space-x-8">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                isActive
                  ? "border-[var(--st-primary)] text-[var(--st-primary)]"
                  : "border-transparent text-[var(--st-muted)] hover:border-[var(--st-border)] hover:text-[var(--st-fg)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
