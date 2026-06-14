"use client";

import { useEffect, useRef, useState } from "react";

const TOKEN_KEY = "vac_jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function useAuth() {
  const [ready, setReady] = useState(false);
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  useEffect(() => {
    // If token is already in sessionStorage (e.g. page refresh within iframe session)
    if (getToken()) {
      setReady(true);
      return;
    }

    // Signal to parent that the iframe is ready to receive the token
    if (window.parent !== window) {
      window.parent.postMessage({ type: "VAC_READY" }, "*");
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SAC_AUTH" && typeof event.data.token === "string") {
        setToken(event.data.token);
        setReady(true);
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

  return { ready };
}
