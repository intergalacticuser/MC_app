import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
} from "@/components/ui/toast";
import { dismissCoach } from "@/lib/coachDismissals";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, coach_dismiss_key, coach_user_id, ...props }) {
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
