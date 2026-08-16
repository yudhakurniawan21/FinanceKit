"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  // Hanya izinkan callbackUrl internal (cegah open redirect ke situs luar).
  const callback = (() => {
    const raw = searchParams.get("callbackUrl") || "/dashboard";
    return raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
      ? raw
      : "/dashboard";
  })();

  // Jika sudah terautentikasi, lanjutkan ke halaman yang dituju.
  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(callback);
    }
  }, [isPending, session, router, callback]);

  if (isPending) return null;
  if (session?.user) return null;

  async function handleGoogleSignIn() {
    await signIn.social({
      provider: "google",
      callbackURL: callback,
    });
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-muted p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-display-xs font-display">
            FinansialKit
          </CardTitle>
          <CardDescription>
            Masuk dengan Google untuk melanjutkan ke aplikasi pencatatan
            keuangan pintar Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignIn}
          >
            <GoogleLogo />
            <span>Masuk dengan Google</span>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

// Ikon "G" berwarna Google (tanpa SVG eksternal yang rapuh).
function GoogleLogo() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-gradient-to-br from-[#EA4335] via-[#FBBC01] to-[#4285F4] text-[10px] font-bold text-white">
      G
    </span>
  );
}