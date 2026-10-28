import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import type { AccountType } from "../types/auth";
import type { ReactNode } from "react";

interface RequireAccountTypeProps {
  allowed: AccountType[];
  redirectTo: string;
  message: string;
  children: ReactNode;
}

function RequireAccountType({ allowed, redirectTo, message, children }: RequireAccountTypeProps) {
  const { user } = useAuth();
  const isAllowed = user ? allowed.includes(user.accountType) : false;

  useEffect(() => {
    if (!isAllowed) {
      toast.error(message);
    }
  }, [isAllowed, message]);

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}

export default RequireAccountType;
