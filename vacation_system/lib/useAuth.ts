"use client";

import { useEffect, useRef, useState } from "react";

const TOKEN_KEY = "vac_jwt";
const THEME_KEY = "vac_theme";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

function applyTheme(theme: string) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  sessionStorage.setItem(THEME_KEY, theme);
}

async function fetchRoles(): Promise<string[]> {
  const token = getToken();
  if (!token) return [];
  try {
    const res = await fetch("/api/vacation/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.roles) ? data.roles : [];
  } catch {
    return [];
  }
}

export function useAuth() {
  const [ready, setReady] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  useEffect(() => {
    // Restore cached theme immediately to avoid flash
    const cachedTheme = sessionStorage.getItem(THEME_KEY);
    if (cachedTheme) applyTheme(cachedTheme);

    // If token is already in sessionStorage (e.g. page refresh within iframe session)
    if (getToken()) {
      fetchRoles().then((r) => {
        setRoles(r);
        setReady(true);
      });
      return;
    }

    // Signal to parent that the iframe is ready to receive the token
    if (window.parent !== window) {
      window.parent.postMessage({ type: "VAC_READY" }, "*");
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SAC_AUTH" && typeof event.data.token === "string") {
        setToken(event.data.token);
        fetchRoles().then((r) => {
          setRoles(r);
          setReady(true);
        });
      }

      if (event.data?.type === "SAC_THEME" && typeof event.data.theme === "string") {
        applyTheme(event.data.theme);
      }
    };

    listenerRef.current = handler;
    window.addEventListener("message", handler);

    return () => {
      if (listenerRef.current) {
        window.removeEventListener("message", listenerRef.current);
      }
    };
  }, []);

  return { ready, roles };
}
