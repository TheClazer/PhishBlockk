"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
import { connectWallet, getCurrentAddress, formatAddress, onAccountsChanged, clearPendingRequests } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";

export function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already connected
    const checkConnection = async () => {
      try {
        const currentAddress = await getCurrentAddress();
        setAddress(currentAddress);
        setConnectionError(null);
      } catch (error) {
        setAddress(null);
        setConnectionError(null);
      }
    };

    checkConnection();

    // Listen for account changes
    onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setAddress(null);
        setConnectionError(null);
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected",
        });
      } else {
        setAddress(accounts[0]);
        setConnectionError(null);
        toast({
          title: "Account Changed",
          description: `Switched to ${formatAddress(accounts[0])}`,
        });
      }
    });
  }, [toast]);

  const handleConnect = async () => {
    if (isConnecting) return; // Prevent multiple simultaneous attempts
    
    try {
      setIsConnecting(true);
      setConnectionError(null);
      const { address: connectedAddress } = await connectWallet();
      setAddress(connectedAddress);
      toast({
        title: "Wallet Connected",
        description: `Connected to ${formatAddress(connectedAddress)}`,
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect wallet";
      setConnectionError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully",
    });
  };

  const handleResetConnection = async () => {
    setAddress(null);
    setIsConnecting(false);
    setConnectionError(null);
    
    try {
      await clearPendingRequests();
      
      // Force refresh the page to clear all states
      window.location.reload();
    } catch (error) {
      // Even if clearing fails, refresh the page
      window.location.reload();
    }
  };

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-mono">{formatAddress(address)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
      {connectionError && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetConnection}
            className="text-xs"
          >
            Reset Connection
          </Button>
        </div>
      )}
    </div>
  );
}
