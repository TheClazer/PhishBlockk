"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { connectWallet, getCurrentAddress } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

function LoginContent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const registered = searchParams.get("registered");

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const address = await getCurrentAddress();
      if (address) {
        router.push("/");
      }
    } catch (error) {
      // Wallet not connected
    }
  };

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      const { address } = await connectWallet();

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

      router.push("/");
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">PhishGuard</h1>
              <p className="text-xs text-muted-foreground">Decentralized Scam Reporting</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Connect your wallet to access PhishGuard and start reporting scams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {registered === "true" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Account created successfully! Please connect your wallet to continue.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full gap-2"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  New to PhishGuard?{" "}
                  <Link href="/register" className="text-primary hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
