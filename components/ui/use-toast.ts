"use client"

import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success" | "warning" | "info"
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

export const toast = {
  default: (props: ToastProps) => sonnerToast(props.title, {
    description: props.description,
    duration: props.duration || 4000,
    action: props.action,
  }),

  success: (title: string, description?: string) => sonnerToast.success(title, {
    description,
    duration: 3000,
  }),

  error: (title: string, description?: string) => sonnerToast.error(title, {
    description,
    duration: 5000,
  }),

  warning: (title: string, description?: string) => sonnerToast.warning(title, {
    description,
    duration: 4000,
  }),

  info: (title: string, description?: string) => sonnerToast.info(title, {
    description,
    duration: 3000,
  }),

  itemAdded: (itemName: string) => sonnerToast.success("Élément ajouté", {
    description: `${itemName} a été ajouté à l'inventaire`,
    duration: 3000,
  }),

  lowStock: (itemName: string, current: number, minimum: number) => sonnerToast.warning("Stock bas", {
    description: `${itemName}: ${current}/${minimum} unités restantes`,
    duration: 5000,
    action: {
      label: "Commander",
      onClick: () => console.log("Commander clicked")
    }
  }),

  maintenanceDue: (deviceName: string, daysLeft: number) => sonnerToast.warning("Maintenance prévue", {
    description: `${deviceName}: maintenance dans ${daysLeft} jours`,
    duration: 5000,
  }),
}
