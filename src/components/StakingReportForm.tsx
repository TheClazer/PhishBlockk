"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StakeRegistryContract, ContractConstants, getStatusText, getStatusColor } from "@/lib/stake-contract";
import { connectWallet, getCurrentAddress, formatAddress } from "@/lib/wallet";
import { ethers } from "ethers";

interface StakingReportFormProps {
  onReportSubmitted?: (reportId: number) => void;
}

export function StakingReportForm({ onReportSubmitted }: StakingReportFormProps) {
  const [reportType, setReportType] = useState<string>("phishing_url");
  const [targetValue, setTargetValue] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [contractConstants, setContractConstants] = useState<ContractConstants | null>(null);
  const [stakeContract, setStakeContract] = useState<StakeRegistryContract | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeContract();
    checkWalletConnection();
  }, []);

  const initializeContract = async () => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_REGISTRY_ADDRESS;
      if (!contractAddress) {
        console.warn("Stake registry contract address not configured");
        return;
      }

      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new StakeRegistryContract(contractAddress, provider);
        
        const constants = await contract.getConstants();
        setContractConstants(constants);
        setStakeContract(contract);
      }
    } catch (error) {
      console.error("Failed to initialize contract:", error);
    }
  };

  const checkWalletConnection = async () => {
    try {
      const address = await getCurrentAddress();
      setWalletAddress(address);
    } catch (error) {
      setWalletAddress(null);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      const { address } = await connectWallet();
      setWalletAddress(address);
      
      if (stakeContract) {
        await stakeContract.connectSigner();
      }
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${formatAddress(address)}`,
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const generateReportHash = (reportType: string, targetValue: string, description: string, reporter: string): string => {
    const data = JSON.stringify({
      reportType,
      targetValue: targetValue.toLowerCase(),
      description,
      reporter: reporter.toLowerCase(),
      timestamp: Math.floor(Date.now() / 1000)
    });
    
    // Simple hash generation (in production, use a proper cryptographic hash)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `0x${Math.abs(hash).toString(16).padStart(8, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress || !stakeContract || !contractConstants) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!targetValue || !description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const reportHash = generateReportHash(reportType, targetValue, description, walletAddress);
      
      // Submit report with stake
      const tx = await stakeContract.submitReportWithStake(
        reportType,
        targetValue,
        description,
        reportHash,
        contractConstants.reportStake
      );
      
      toast({
        title: "Transaction Submitted",
        description: "Your report has been submitted with stake. Waiting for confirmation...",
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Get the report ID from the event
      const event = receipt.logs.find(log => {
        try {
          const parsed = stakeContract.contract.interface.parseLog(log);
          return parsed?.name === "ReportSubmitted";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = stakeContract.contract.interface.parseLog(event);
        const reportId = Number(parsed?.args[0]);
        
        toast({
          title: "Report Submitted Successfully",
          description: `Report #${reportId} submitted with ${contractConstants.reportStake} ETH stake`,
        });
        
        // Reset form
        setTargetValue("");
        setDescription("");
        
        // Notify parent component
        if (onReportSubmitted) {
          onReportSubmitted(reportId);
        }
      }
      
    } catch (error: any) {
      console.error("Failed to submit report:", error);
      
      let errorMessage = "Failed to submit report";
      if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient ETH balance for stake";
      } else if (error.message.includes("User rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contractConstants) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stake-Based Report Submission</CardTitle>
          <CardDescription>Submit phishing reports with economic incentives</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Stake registry contract not configured. Please deploy the contract first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Stake-Based Report Submission
        </CardTitle>
        <CardDescription>
          Submit phishing reports with economic incentives. Stake {contractConstants.reportStake} ETH to submit a report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Connection */}
        {!walletAddress ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to submit stake-based reports
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleConnectWallet} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Wallet"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Wallet Connected</span>
              </div>
              <Badge variant="secondary">{formatAddress(walletAddress)}</Badge>
            </div>
            
            {/* Staking Information */}
            <Alert>
              <Coins className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Stake Required:</strong> {contractConstants.reportStake} ETH (~$30)</p>
                  <p><strong>Reward for Valid Reports:</strong> {contractConstants.reporterReward} ETH (~$15)</p>
                  <p><strong>Risk:</strong> Lose stake if report is deemed fake by community</p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Report Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
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
                  type={reportType === "phishing_url" ? "url" : "text"}
                  placeholder={reportType === "phishing_url" ? "https://example-phishing-site.com" : "0x..."}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the scam or phishing attempt..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || !targetValue || !description}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  <>
                    <Coins className="mr-2 h-4 w-4" />
                    Submit Report with {contractConstants.reportStake} ETH Stake
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

