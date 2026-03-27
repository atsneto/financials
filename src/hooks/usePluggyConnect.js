import { useEffect, useCallback, useRef } from "react";

const PLUGGY_SDK_URL =
  "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";

// Aguarda o global window.PluggyConnect ficar disponível após o script carregar
function waitForPluggyGlobal(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (window.PluggyConnect) { resolve(true); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.PluggyConnect) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error("timeout"));
      }
    }, 100);
  });
}

// Carrega o script do SDK e aguarda o global estar disponível
let sdkLoadPromise = null;
function loadPluggySDK() {
  if (window.PluggyConnect) return Promise.resolve(true);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    // Se o script já existe no DOM, só aguardar o global
    if (document.getElementById("pluggy-sdk")) {
      waitForPluggyGlobal().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "pluggy-sdk";
    script.src = PLUGGY_SDK_URL;
    script.async = true;
    script.onload = () => {
      // Script carregou, mas o global pode demorar a ser registrado
      waitForPluggyGlobal().then(resolve).catch(reject);
    };
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error("Falha ao carregar script do SDK"));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * Hook para carregar e usar o Pluggy Connect Widget.
 * Carrega o SDK via CDN e expõe `open()` para iniciar o widget.
 */
export function usePluggyConnect({ connectToken, onSuccess, onError, onClose }) {
  const callbacksRef = useRef({ onSuccess, onError, onClose });
  callbacksRef.current = { onSuccess, onError, onClose };

  // Pré-carregar SDK ao montar o componente
  useEffect(() => {
    loadPluggySDK().catch(() => {});
  }, []);

  const open = useCallback(async (tokenOverride) => {
    const token = tokenOverride || connectToken;
    if (!token) return;

    // Aguardar SDK ficar pronto
    try {
      await loadPluggySDK();
    } catch {
      callbacksRef.current.onError?.({
        message: "Não foi possível carregar o widget do Pluggy. Verifique sua conexão e tente novamente.",
      });
      return;
    }

    const pluggy = new window.PluggyConnect({
      connectToken: token,
      onSuccess: (data) => {
        console.log("Pluggy onSuccess:", JSON.stringify(data));
        callbacksRef.current.onSuccess?.(data);
      },
      onError: (err) => {
        console.error("Pluggy onError:", err);
        callbacksRef.current.onError?.(err);
      },
      onClose: () => callbacksRef.current.onClose?.(),
    });
    pluggy.init();
  }, [connectToken]);

  return { open };
}
