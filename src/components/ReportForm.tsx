"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Shield, Loader2, Wallet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { getCurrentAddress } from "@/lib/wallet";
import { generateReportHash } from "@/lib/canonicalize";
import { registerReportOnChain } from "@/lib/contract";
import { BrowserProvider } from "ethers";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function ReportForm({ onSuccess }: { onSuccess?: () => void }) {
  const [reportType, setReportType] = useState<"phishing_url" | "scam_wallet">("phishing_url");
  const [targetValue, setTargetValue] = useState("");
  const [description, setDescription] = useState("");
  const [anchorOnChain, setAnchorOnChain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  // Check wallet connection
  const checkWallet = async () => {
    try {
      const address = await getCurrentAddress();
      setWalletAddress(address);
      return address;
    } catch {
      setWalletAddress(null);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetValue || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate wallet connection
    const address = await checkWallet();
    if (!address) {
      toast.error("Please connect your MetaMask wallet first");
      return;
    }

    try {
      setIsSubmitting(true);

      // Generate report hash
      const reportHash = generateReportHash({
        reportType,
        targetValue,
        description,
        reporterAddress: address,
      });

      let txHash: string | null = null;
      let contractId: number | null = null;

      // Anchor on-chain if requested
      if (anchorOnChain) {
        try {
          if (!window.ethereum) {
            throw new Error("MetaMask not found");
          }
          const provider = new BrowserProvider(window.ethereum);
          txHash = await registerReportOnChain(provider, reportHash);
          toast.success("Report hash anchored on blockchain!");
        } catch (error: any) {
          console.error("Failed to anchor on-chain:", error);
          toast.error(`On-chain anchoring failed: ${error.message}. Saving report off-chain only.`);
        }
      }

      // Save to database
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.user ? { "Authorization": `Bearer ${localStorage.getItem("bearer_token")}` } : {})
        },
        body: JSON.stringify({
          reportType,
          targetValue,
          description,
          reporterAddress: address,
          anchorOnChain: !!txHash,
          onChainTxHash: txHash,
          contractId,
          reportHash,
          userId: session?.user?.id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create report`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create report");
      }

      toast.success("✅ Report submitted successfully!");

      // Reset form
      setTargetValue("");
      setDescription("");
      setAnchorOnChain(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a Report</CardTitle>
        <CardDescription>
          Report phishing URLs or scam wallet addresses to protect the community
          {session?.user && (
            <span className="block mt-1 text-primary">
              Reporting as {session.user.email}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={reportType} onValueChange={(value: "phishing_url" | "scam_wallet") => setReportType(value)}>
              <SelectTrigger id="reportType">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phishing_url">Phishing URL</SelectItem>
                <SelectItem value="scam_wallet">Scam Wallet Address</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetValue">
              {reportType === "phishing_url" ? "Phishing URL" : "Wallet Address"}
            </Label>
            <Input
              id="targetValue"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={
                reportType === "phishing_url"
                  ? "https://example-phishing-site.com"
                  : "0x1234567890abcdef..."
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scam or phishing attempt..."
              rows={4}
              required
            />
          </div>

          <div className="flex items-center justify-between space-x-2 p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3 flex-1">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="anchorOnChain" className="cursor-pointer">
                  Anchor on Blockchain
                </Label>
                <p className="text-sm text-muted-foreground">
                  Register this report hash on-chain for immutable verification
                </p>
              </div>
            </div>
            <Switch
              id="anchorOnChain"
              checked={anchorOnChain}
              onCheckedChange={setAnchorOnChain}
            />
          </div>

          {anchorOnChain && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will create a blockchain transaction and require gas fees. The report data
                will be stored off-chain, but its hash will be anchored on-chain for verification.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Make sure your MetaMask wallet is connected before submitting
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}