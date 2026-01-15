"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {Folder, Plus, Users, AppWindow, MessageCircle, ChevronDown, Loader2} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";

interface SidebarNavigationProps {
    isCollapsed?: boolean;
    onCreateNew?: () => void;
    creating?: boolean;
}

const SidebarNavigation = ({isCollapsed, onCreateNew, creating = false}: SidebarNavigationProps) => {
    const { user, isLoaded } = useUser();

    const userButtonContainerRef = useRef<HTMLDivElement>(null);
    const handleHeaderClick = () => {
        const button = userButtonContainerRef.current?.querySelector('button');
        if (button) {
            button.click();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#09090b]">
            {/* User / Workspace Header */}
            <div className="p-3 mb-2">
                {!isCollapsed ? (
                    <button 
                        onClick={handleHeaderClick}
                        className="flex items-center gap-3 w-full text-left hover:bg-white/5 p-2 rounded-xl transition-all duration-200 group"
                    >
                        {/* Wrapper ref for the hidden button click target */}
                        <div className="shrink-0 relative pointer-events-none" ref={userButtonContainerRef}>
                            <UserButton 
                                afterSignOutUrl="/sign-in"
                                appearance={{
                                    elements: {
                                        avatarBox: "w-8 h-8 ring-2 ring-white/10 group-hover:ring-[#dfff4f]/50 transition-all shadow-inner pointer-events-auto"
                                    }
                                }}
                            />
                        </div>
                        
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-semibold text-sm text-white truncate leading-none mb-0.5 group-hover:text-[#F7FFA8] transition-colors">
                                {!isLoaded ? (
                                    <span className="animate-pulse bg-white/10 h-3 w-20 block rounded" />
                                ) : (
                                    user?.firstName?.toUpperCase() || "USER"
                                )}
                            </span>
                            <span className="text-[10px] text-white/40 truncate">Workspace</span>
                        </div>
                        
                        <ChevronDown size={12} className="text-white/30 ml-auto group-hover:text-white/60 transition-colors" />
                    </button>
                ) : (
                    <div className="flex justify-center py-2">
                        {/* Collapsed State: Just the User Button */}
                        <UserButton 
                            afterSignOutUrl="/sign-in"
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8 shadow-inner"
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Create New File Button */}
            {!isCollapsed && (
                <div className="px-4 mb-6">
                    <button
                        onClick={onCreateNew}
                        disabled={creating}
                        className="cursor-pointer w-full flex items-center justify-center gap-2 bg-[#F7FFA8] text-black px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#edf3bc] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(223,255,79,0.15)]"
                    >
                        {creating ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Plus size={18} strokeWidth={3} />
                        )}
                        <span>Create New File</span>
                    </button>
                </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 flex flex-col gap-1 px-3">
                {!isCollapsed ? (
                    <>
                        <div className="px-3 py-2 mb-1 mt-2">
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Menu</span>
                        </div>
                        
                        <Link href="/workflows" className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm border border-white/5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Folder size={18} className="text-[#dfff4f]" />
                                My Files
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/20 text-white/50 hover:text-white transition-colors">
                                <Plus size={12} />
                            </div>
                        </Link>

                        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white text-sm transition-all duration-200">
                            <Users size={18} />
                            Shared with me
                        </Link>
                        
                        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white text-sm transition-all duration-200">
                            <AppWindow size={18} />
                            Apps
                        </Link>
                    </>
                ) : (
                    <div className="flex flex-col gap-4 items-center mt-4">
                        <Link href="/workflows" className="p-2.5 rounded-xl bg-white/10 text-[#dfff4f] border border-white/5">
                            <Folder size={20} />
                        </Link>
                        <Link href="#" className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                            <Users size={20} />
                        </Link>
                        <Link href="#" className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                            <AppWindow size={20} />
                        </Link>
                    </div>
                )}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 mt-auto border-t border-white/5">
                {!isCollapsed ? (
                    <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/40 hover:bg-white/5 hover:text-white text-xs font-medium transition-colors">
                        <MessageCircle size={16} />
                        Join Discord Community
                    </Link>
                ) : (
                    <Link href="#" className="flex justify-center p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                        <MessageCircle size={20} />
                    </Link>
                )}
            </div>
        </div>
    );
};

export default SidebarNavigation;