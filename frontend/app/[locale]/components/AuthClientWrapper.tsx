"use client";

import { useEffect } from "react";
import { useUserStore } from "@/app/stores/userStore";

interface AuthClientWrapperProps {
  children: React.ReactNode;
}

export default function AuthClientWrapper({ children }: AuthClientWrapperProps) {
  const initializeUser = useUserStore((state) => state.initializeUser);
  const isLoading = useUserStore((state) => state.isLoading);



  useEffect(() => {

    initializeUser();
  }, [initializeUser]);

  // Temporarily removed conditional rendering based on isLoading to ensure all logs appear
  // if (isLoading) {
  //   return null; // Or a loading indicator
  // }

  return <>{children}</>;
} 