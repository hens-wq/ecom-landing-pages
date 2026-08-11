"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { NavigationItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DialogOverlay } from "@/components/ui/dialog";
import { NavLinks, SidebarBrand } from "@/components/layout/AppSidebar";

export function MobileNav({ items }: { items: NavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="פתיחת תפריט">
          <Menu className="size-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-72 flex-col gap-6 border-l border-slate-200 bg-white px-4 py-6 shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
          <DialogPrimitive.Title className="sr-only">תפריט ניווט</DialogPrimitive.Title>
          <SidebarBrand />
          <div className="flex-1 overflow-y-auto">
            <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
