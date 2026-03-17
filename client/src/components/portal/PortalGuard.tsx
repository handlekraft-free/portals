import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

interface PortalGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function PortalGuard({ allowedRoles, children }: PortalGuardProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else if (!allowedRoles.includes(user.role)) {
        // Redirect to their proper portal
        if (user.role === "client") setLocation("/portal/client/dashboard");
        else if (user.role === "student") setLocation("/portal/student/dashboard");
        else setLocation("/portal/employee/dashboard");
      }
    }
  }, [user, loading, allowedRoles, setLocation]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
      <div className="w-8 h-8 border-2 border-[#0D7377] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user || !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
}
