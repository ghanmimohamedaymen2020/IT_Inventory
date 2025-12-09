"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import * as Icons from "lucide-react"

interface SubItem {
  name: string
  href: string
  icon: string
}

interface NavItemProps {
  name: string
  href?: string
  icon: string
  subItems?: SubItem[]
}

export function NavItem({ name, href, icon: iconName, subItems }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const Icon = (Icons as any)[iconName]

  if (!subItems) {
    const isActive = pathname === href
    return (
      <Link
        href={href!}
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {Icon && <Icon className="w-5 h-5 mr-3" />}
        {name}
      </Link>
    )
  }

  const isAnySubItemActive = subItems.some(item => pathname.startsWith(item.href))

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
          isAnySubItemActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <div className="flex items-center">
          {Icon && <Icon className="w-5 h-5 mr-3" />}
          {name}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform",
            isOpen ? "transform rotate-180" : ""
          )}
        />
      </button>
      
      {isOpen && (
        <div className="mt-1 ml-6 space-y-1">
          {subItems.map((subItem) => {
            const isActive = pathname.startsWith(subItem.href)
            const SubIcon = (Icons as any)[subItem.icon]
            return (
              <Link
                key={subItem.name}
                href={subItem.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                {SubIcon && <SubIcon className="w-4 h-4 mr-3" />}
                {subItem.name}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
