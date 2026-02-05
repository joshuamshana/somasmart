type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(items);
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

function push(type: ToastType, title: string, description?: string) {
  const id = `toast_${crypto.randomUUID()}`;
  items = [...items, { id, type, title, description }];
  emit();
  window.setTimeout(() => dismiss(id), 3500);
}

export function dismiss(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description),
  info: (title: string, description?: string) => push("info", title, description)
};
