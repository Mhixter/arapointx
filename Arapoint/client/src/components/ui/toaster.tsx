import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"

const variantIcon: Record<string, React.ReactNode> = {
  default: (
    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#0B5FFF1A" }}>
      <Info className="w-4 h-4" style={{ color: "#0B5FFF" }} />
    </div>
  ),
  destructive: (
    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EF44441A" }}>
      <XCircle className="w-4 h-4" style={{ color: "#EF4444" }} />
    </div>
  ),
  success: (
    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#12B76A1A" }}>
      <CheckCircle2 className="w-4 h-4" style={{ color: "#12B76A" }} />
    </div>
  ),
  warning: (
    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F59E0B1A" }}>
      <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
    </div>
  ),
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={5000}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = variantIcon[(variant as string) ?? "default"] ?? variantIcon.default
        return (
          <Toast key={id} variant={variant} {...props}>
            {icon}
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
