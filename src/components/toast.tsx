"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = React.createContext<{
  toast: (message: string, kind?: ToastKind) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-[#00df82]" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-[#00df82]" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counter = React.useRef(0);

  const toast = React.useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{ contain: "layout paint", transform: "translate3d(0, 0, 0)" }}
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ transform: "translate3d(0, 0, 0)", willChange: "transform, opacity" }}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-2xl border bg-white p-3.5 text-xs font-semibold shadow-xl transition-all duration-200 ease-out dark:bg-[#0b1322] dark:text-slate-100",
              t.kind === "success" && "border-[#00df82]/40 shadow-[#00df82]/5",
              t.kind === "error" && "border-red-500/30",
              t.kind === "info" && "border-[#00df82]/30"
            )}
          >
            {icons[t.kind]}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
