"use client";
import { useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/lib/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturesSection } from "@/components/home/features-section";
import { AnimatedGradientBackground } from '@/components/ui/animated-gradient-background';
import Domains from '@/components/home/domains'

function AuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(async ({ data, error }) => {
          if (error) {
            console.error("Exchange error:", error);
          }
          const { session } = data;
          if (session) {
            useAuthStore.getState().setUser(session.user);
            router.replace(window.location.pathname);
          }
        });
    } else {
      
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          useAuthStore.getState().setUser(session.user);
        }
      });
    }
  }, [router, searchParams]);

  return null;
}

function PageContent() {
  return (
    <div className="relative min-h-screen pb-20 overflow-x-hidden">
      {/* Animated gradient background with reduced opacity */}
      <div className="absolute inset-0 z-0" style={{ opacity: 0.9 }}>
        <AnimatedGradientBackground />
      </div>
      {/* Black overlay for readability */}
      <div className="absolute inset-0 z-10 bg-black/10 pointer-events-none" />
      <div className="relative z-20 flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center">
          <HeroSection />
        </div>
        <div className="pb-8 md:pb-12">
          <Domains />
        </div>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="container py-8 md:py-12">
      <div className="animate-pulse">
        <div className="h-32 bg-muted rounded mb-8"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthHandler />
      </Suspense>
      <PageContent />
    </>
  );
}