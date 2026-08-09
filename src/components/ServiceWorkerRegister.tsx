"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA install is a nice-to-have; ignore registration failures
      });
    }
  }, []);
  return null;
}
