"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { SidebarProps } from "@/lib/types";

interface SidebarComponentProps extends SidebarProps {
  className?: string;
}

const Sidebar = ({ children, defaultCollapsed = false, className }: SidebarComponentProps) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <aside
      className={cn(
        "bg-[#09090b] border-r border-white/10 transition-all duration-300 relative flex flex-col z-20",
        isCollapsed 
            ? "w-[60px] md:w-[70px]" 
            : "w-[85vw] md:w-[350px]",
        className 
      )}
    >
      {/* Control passed to children */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(
              child as React.ReactElement<{ isCollapsed?: boolean; setIsCollapsed?: (v: boolean) => void }>,
              { isCollapsed, setIsCollapsed }
            );
          }
          return child;
        })}
      </div>
    </aside>
  );
};

export default Sidebar;