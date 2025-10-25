"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Clock, Users, TrendingUp, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StakeRegistryContract, ReportData, ValidatorData, ContractConstants, getStatusText, getStatusColor, formatTimestamp, getTimeRemaining, isVotingOpen } from "@/lib/stake-contract";
import { connectWallet, getCurrentAddress, formatAddress } from "@/lib/wallet";
import { ethers } from "ethers";

export function ValidatorDashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [validatorData, setValidatorData] = useState<ValidatorData | null>(null);
  const [pendingReports, setPendingReports] = useState<ReportData[]>([]);
  const [contractConstants, setContractConstants] = useState<ContractConstants | null>(null);
  const [stakeContract, setStakeContract] = useState<StakeRegistryContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState<number | null>(null);
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
      
      if (address && stakeContract) {
        await loadValidatorData(address);
        await loadPendingReports();
      }
    } catch (error) {
      setWalletAddress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadValidatorData = async (address: string) => {
    if (!stakeContract) return;
    
    try {
      const validator = await stakeContract.getValidator(address);
      setValidatorData(validator);
    } catch (error) {
      console.error("Failed to load validator data:", error);
    }
  };

  const loadPendingReports = async () => {
    if (!stakeContract) return;
    
    try {
      const totalReports = await stakeContract.getTotalReports();
      const reports: ReportData[] = [];
      
      // Load recent reports (last 20)
      for (let i = Math.max(1, totalReports - 19); i <= totalReports; i++) {
        try {
          const report = await stakeContract.getReport(i);
          if (report.status === 0) { // Pending status
            reports.push(report);
          }
        } catch (error) {
          // Report might not exist
        }
      }
      
      setPendingReports(reports.reverse());
    } catch (error) {
      console.error("Failed to load pending reports:", error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
      
      if (stakeContract) {
        await stakeContract.connectSigner();
        await loadValidatorData(address);
        await loadPendingReports();
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
    }
  };

  const handleRegisterValidator = async () => {
    if (!stakeContract || !walletAddress) return;
    
    try {
      const tx = await stakeContract.registerValidator();
      await tx.wait();
      
      toast({
        title: "Validator Registered",
        description: "You are now registered as a validator",
      });
      
      await loadValidatorData(walletAddress);
    } catch (error: any) {
      console.error("Failed to register as validator:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register as validator",
        variant: "destructive",
      });
    }
  };

  const handleVote = async (reportId: number, isValid: boolean) => {
    if (!stakeContract || !contractConstants) return;
    
    try {
      setIsVoting(reportId);
      
      const tx = await stakeContract.voteOnReport(
        reportId,
        isValid,
        contractConstants.votingStake
      );
      
      await tx.wait();
      
      toast({
        title: "Vote Submitted",
        description: `Voted ${isValid ? "Valid" : "Invalid"} on report #${reportId}`,
      });
      
      await loadPendingReports();
    } catch (error: any) {
      console.error("Failed to vote:", error);
      
      let errorMessage = "Failed to submit vote";
      if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient ETH balance for voting stake";
      } else if (error.message.includes("User rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Vote Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsVoting(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!contractConstants) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validator Dashboard</CardTitle>
          <CardDescription>Manage reports and vote on submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Stake registry contract not configured. Please deploy the contract first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!walletAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validator Dashboard</CardTitle>
          <CardDescription>Manage reports and vote on submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Connect your wallet to access the validator dashboard
            </AlertDescription>
          </Alert>
          <Button onClick={handleConnectWallet} className="w-full">
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!validatorData?.isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validator Dashboard</CardTitle>
          <CardDescription>Manage reports and vote on submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You are not registered as a validator. Register to start voting on reports.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <p><strong>Voting Stake Required:</strong> {contractConstants.votingStake} ETH (~$15)</p>
            <p><strong>Validator Reward:</strong> {contractConstants.validatorReward} ETH (~$3) per correct vote</p>
          </div>
          <Button onClick={handleRegisterValidator} className="w-full">
            Register as Validator
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validator Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Validator Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{validatorData.reputation}</div>
              <div className="text-sm text-muted-foreground">Reputation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{validatorData.totalValidations}</div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{validatorData.correctValidations}</div>
              <div className="text-sm text-muted-foreground">Correct Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {validatorData.totalValidations > 0 
                  ? Math.round((validatorData.correctValidations / validatorData.totalValidations) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Reports ({pendingReports.length})
          </CardTitle>
          <CardDescription>
            Vote on reports requiring validation. Stake {contractConstants.votingStake} ETH per vote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReports.length === 0 ? (
            <Alert>
              <AlertDescription>
                No pending reports at the moment. Check back later for new submissions.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingReports.map((report) => (
                <Card key={report.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{report.id}</Badge>
                          <Badge variant="secondary">{report.reportType}</Badge>
                          <Badge variant="outline" className="text-yellow-600">
                            {getTimeRemaining(report.votingDeadline)} left
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium">{report.targetValue}</p>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Reporter: {formatAddress(report.reporter)}</span>
                          <span>Stake: {report.stakeAmount} ETH</span>
                          <span>Votes: {report.validVotes} Valid, {report.invalidVotes} Invalid</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(report.id, true)}
                          disabled={isVoting === report.id || !isVotingOpen(report.votingDeadline)}
                          className="text-green-600 hover:text-green-700"
                        >
                          {isVoting === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Valid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(report.id, false)}
                          disabled={isVoting === report.id || !isVotingOpen(report.votingDeadline)}
                          className="text-red-600 hover:text-red-700"
                        >
                          {isVoting === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Invalid
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

