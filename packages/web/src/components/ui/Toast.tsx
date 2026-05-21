import { useToastStore } from '../../stores/toastStore';

const TYPE_STYLES = {
  success: { bg: '#4A9C68', icon: '✓' },
  error:   { bg: '#A33030', icon: '✕' },
  info:    { bg: '#1B2A4A', icon: 'ℹ' },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(toast => {
        const style = TYPE_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-medium"
            style={{ backgroundColor: style.bg, minWidth: '200px', maxWidth: '320px' }}
          >
            <span className="text-base leading-none">{style.icon}</span>
            <span className="flex-1 text-center">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="opacity-70 hover:opacity-100 text-base leading-none"
              aria-label="סגור"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
