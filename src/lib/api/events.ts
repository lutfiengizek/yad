// Event altyapısı: gerçek Tauri `listen` sarmalayıcısı + mock için bellek-içi event bus.

import { listen } from "@tauri-apps/api/event";
import type { Unsubscribe } from "./contract";

// Gerçek: Tauri `listen` async UnlistenFn döner; senkron Unsubscribe'a sarıyoruz.
export function tauriListen<T>(
  event: string,
  cb: (payload: T) => void,
): Unsubscribe {
  let unlisten: (() => void) | null = null;
  let cancelled = false;
  void listen<T>(event, (e) => cb(e.payload as T)).then((fn) => {
    if (cancelled) fn();
    else unlisten = fn;
  });
  return () => {
    cancelled = true;
    unlisten?.();
  };
}

// Mock: basit bellek-içi yayın.
export class MockEventBus {
  private listeners = new Map<string, Set<(payload: unknown) => void>>();

  on<T>(event: string, cb: (payload: T) => void): Unsubscribe {
    const set = this.listeners.get(event) ?? new Set();
    set.add(cb as (payload: unknown) => void);
    this.listeners.set(event, set);
    return () => {
      set.delete(cb as (payload: unknown) => void);
    };
  }

  emit<T>(event: string, payload: T): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }
}
