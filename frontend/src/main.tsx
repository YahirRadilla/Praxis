import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/global.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-center"
            richColors={false}
            toastOptions={{
              classNames: {
                toast: "!bg-paper-raised !border !border-rule !rounded-xl !shadow-sm",
                title: "!text-ink !text-[13.5px] !font-semibold !font-body",
                description: "!text-ink-soft !text-[12.5px] !font-body",
                actionButton: "!bg-ink !text-paper !rounded-full",
                cancelButton: "!bg-transparent !text-ink-soft",
                closeButton: "!bg-paper-raised !border-rule !text-ink-soft",
                error: "!border-red-200",
                success: "!border-surface-accent",
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
