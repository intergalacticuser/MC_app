import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
} from "@/components/ui/toast";
import { dismissCoach } from "@/lib/coachDismissals";

function setSessionStorageKey(key, value = "1") {
  const k = String(key || "").trim();
  if (!k) return;
  try {
    sessionStorage.setItem(k, String(value ?? "1"));
  } catch {
    // ignore
  }
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        coach_dismiss_key,
        coach_user_id,
        dismiss_storage_key,
        dismiss_storage_value,
        ...props
      }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose
              onClick={() => {
                if (coach_user_id && coach_dismiss_key) {
                  dismissCoach(coach_user_id, coach_dismiss_key);
                }
                if (dismiss_storage_key) {
                  setSessionStorageKey(dismiss_storage_key, dismiss_storage_value ?? "1");
                }
                dismiss(id);
              }}
              aria-label="Close"
            />
          </Toast>
        );
      })}
    </ToastProvider>
  );
} 
