import { useEffect, useRef } from "react";
import { useVerifyAccountWithGoogle } from "../hooks/useProfile";

// Google Identity Services ships no official npm types package for just this
// one integration point (`initialize`/`renderButton`), so this declares the
// minimal shape of the `window.google` global the script in index.html adds.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string; locale?: string },
          ) => void;
        };
      };
    };
  }
}

function GoogleVerifyButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const verifyAccount = useVerifyAccountWithGoogle();

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => {
        verifyAccount.mutate(response.credential);
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "Verificar con Google",
      locale: "es",
    });
    // Google reads `client_id` and the callback once per render; the
    // mutation object itself is stable enough across renders not to need
    // re-initializing on every one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={buttonRef} />;
}

export default GoogleVerifyButton;
