"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ThumbsUp, 
  ThumbsDown, 
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { formatAddress, getCurrentAddress } from "@/lib/wallet";
import { getReportFromChain, getUserVoteFromChain, voteOnChain } from "@/lib/contract";
import { BrowserProvider } from "ethers";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Report {
  id: number;
  reportType: string;
  targetValue: string;
  description: string;
  reportHash: string;
  isAnchoredOnChain: boolean;
  onChainTxHash: string | null;
  createdAt: string;
  reporter: {
    walletAddress: string;
  };
}

interface VoteCounts {
  validVotes: number;
  invalidVotes: number;
  totalVotes: number;
}

interface Verification {
  reportId: number;
  storedHash: string;
  computedHash: string;
  hashMatches: boolean;
  isAnchoredOnChain: boolean;
  onChainTxHash: string | null;
  reportData: {
    reportType: string;
    targetValue: string;
    description: string;
    reporterAddress: string;
  };
}

interface OnChainData {
  reporter: string;
  timestamp: bigint;
  voteScore: bigint;
  exists: boolean;
}

interface UserVote {
  hasVoted: boolean;
  isUpvote: boolean;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [onChainData, setOnChainData] = useState<OnChainData | null>(null);
  const [userVote, setUserVote] = useState<UserVote | null>(null);
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({ validVotes: 0, invalidVotes: 0, totalVotes: 0 });
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  useEffect(() => {
    loadReportData();
    loadCurrentAddress();
    loadVoteCounts();
  }, [params.id]);

  const loadCurrentAddress = async () => {
    const address = await getCurrentAddress();
    setCurrentAddress(address);
  };

  const loadVoteCounts = async () => {
    try {
      const response = await fetch(`/api/reports/${params.id}/vote`);
      if (response.ok) {
        const data = await response.json();
        setVoteCounts(data.data);
      }
    } catch (error) {
      console.error("Failed to load vote counts:", error);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch report details
      const reportResponse = await fetch(`/api/reports/${params.id}`);
      const reportData = await reportResponse.json();

      if (!reportResponse.ok) {
        throw new Error(reportData.error || "Failed to fetch report");
      }

      // Handle both direct data and wrapped data formats
      setReport(reportData.data || reportData);

      // Fetch verification data
      const verifyResponse = await fetch(`/api/reports/${params.id}/verify`);
      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok) {
        setVerification(verifyData.data || verifyData);

        // If anchored on-chain, fetch on-chain data
        if ((verifyData.data || verifyData).isAnchoredOnChain) {
          try {
            const provider = new BrowserProvider(window.ethereum!);
            const storedHash = (verifyData.data || verifyData).storedHash;
            const chainData = await getReportFromChain(provider, storedHash);
            setOnChainData(chainData);

            // Get user's vote if wallet connected
            const address = await getCurrentAddress();
            if (address) {
              const vote = await getUserVoteFromChain(provider, storedHash, address);
              setUserVote(vote);
            }
          } catch (err) {
            console.error("Failed to fetch on-chain data:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error loading report:", err);
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (isUpvote: boolean) => {
    if (!verification) return;

    try {
      setVotingLoading(true);

      const address = await getCurrentAddress();
      if (!address) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your wallet to vote",
          variant: "destructive",
        });
        return;
      }

      const provider = new BrowserProvider(window.ethereum!);
      await voteOnChain(provider, verification.storedHash, isUpvote);

      toast({
        title: "Vote Recorded",
        description: `Your ${isUpvote ? "upvote" : "downvote"} has been recorded on-chain`,
      });

      // Reload on-chain data
      setTimeout(() => {
        loadReportData();
      }, 2000);
    } catch (err) {
      console.error("Voting error:", err);
      toast({
        title: "Voting Failed",
        description: err instanceof Error ? err.message : "Failed to record vote",
        variant: "destructive",
      });
    } finally {
      setVotingLoading(false);
    }
  };

  const handleLocalVote = async (isValid: boolean) => {
    try {
      setVotingLoading(true);

      const address = await getCurrentAddress();
      if (!address) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your wallet to vote",
          variant: "destructive",
        });
        return;
      }

      // Submit vote to API
      const response = await fetch(`/api/reports/${params.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voterAddress: address,
          isValid: isValid
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record vote");
      }

      const data = await response.json();

      toast({
        title: "Vote Recorded",
        description: `Your vote has been recorded: ${isValid ? "Valid (Not Phishing)" : "Invalid (Phishing)"}`,
      });

      // Update vote counts
      setVoteCounts(data.data);

      // Reload data to check if user has already voted
      await loadReportData();

    } catch (err) {
      console.error("Local voting error:", err);
      toast({
        title: "Voting Failed",
        description: err instanceof Error ? err.message : "Failed to record vote",
        variant: "destructive",
      });
    } finally {
      setVotingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !report || !verification) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Report not found"}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const voteScore = onChainData ? Number(onChainData.voteScore) : 0;
  const voteScorePositive = voteScore >= 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={report.reportType === "phishing_url" ? "destructive" : "secondary"}>
                        {report.reportType === "phishing_url" ? (
                          <>
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            Phishing URL
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Scam Wallet
                          </>
                        )}
                      </Badge>
                      {report.isAnchoredOnChain && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          On-Chain Verified
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl">Report Details</CardTitle>
                    <CardDescription>Submitted on {formatDate(report.createdAt)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Target</h3>
                  <p className="font-mono text-sm break-all bg-muted p-3 rounded-lg">
                    {report.targetValue}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="text-sm">{report.description}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Reporter</h3>
                  <p className="font-mono text-sm">{formatAddress(report.reporter.walletAddress)}</p>
                </div>

                {report.onChainTxHash && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        Transaction Hash
                      </h3>
                      <a
                        href={`https://etherscan.io/tx/${report.onChainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 font-mono"
                      >
                        {formatAddress(report.onChainTxHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle>Hash Verification</CardTitle>
                <CardDescription>
                  Cryptographic verification of report integrity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  {verification.hashMatches ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium mb-1">
                      {verification.hashMatches
                        ? "Hash Verified Successfully"
                        : "Hash Verification Failed"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {verification.hashMatches
                        ? "The computed hash matches the stored hash. Report data has not been tampered with."
                        : "The computed hash does not match. Report data may have been modified."}
                    </p>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Stored Hash</p>
                    <p className="font-mono text-xs break-all">{verification.storedHash}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Computed Hash</p>
                    <p className="font-mono text-xs break-all">{verification.computedHash}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Voting Card */}
            <Card>
              <CardHeader>
                <CardTitle>Community Validation</CardTitle>
                <CardDescription>
                  Users have voted on whether this is a valid threat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Vote Counts Display */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Valid</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {voteCounts.validVotes}
                    </div>
                    <div className="text-xs text-green-600/70">
                      Not Phishing
                    </div>
                  </div>

                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">Invalid</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {voteCounts.invalidVotes}
                    </div>
                    <div className="text-xs text-red-600/70">
                      Phishing/Scam
                    </div>
                  </div>
                </div>

                {/* Total Votes */}
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">
                    {voteCounts.totalVotes}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Community Votes
                  </div>
                </div>

                {/* Voting Buttons */}
                {currentAddress ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-center">
                      Cast your vote on this report
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleLocalVote(true)}
                        disabled={votingLoading}
                        variant="outline"
                        className="gap-2 border-green-200 hover:bg-green-50 hover:border-green-300"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Valid
                      </Button>
                      <Button
                        onClick={() => handleLocalVote(false)}
                        disabled={votingLoading}
                        variant="outline"
                        className="gap-2 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                        Phishing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Connect your wallet to vote on this report
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* On-Chain Voting Card (if applicable) */}
            {report.isAnchoredOnChain && onChainData && (
              <Card>
                <CardHeader>
                  <CardTitle>On-Chain Votes</CardTitle>
                  <CardDescription>
                    Blockchain-based voting validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {voteScorePositive ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`text-4xl font-bold ${voteScorePositive ? 'text-green-600' : 'text-red-600'}`}>
                        {voteScore > 0 ? '+' : ''}{voteScore}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Net Vote Score</p>
                  </div>

                  {currentAddress ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center mb-3">
                        {userVote?.hasVoted
                          ? `You ${userVote.isUpvote ? "upvoted" : "downvoted"} this report`
                          : "Cast your on-chain vote"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleVote(true)}
                          disabled={votingLoading}
                          variant={userVote?.hasVoted && userVote.isUpvote ? "default" : "outline"}
                          className="gap-2"
                        >
                          {votingLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-4 w-4" />
                          )}
                          Upvote
                        </Button>
                        <Button
                          onClick={() => handleVote(false)}
                          disabled={votingLoading}
                          variant={userVote?.hasVoted && !userVote.isUpvote ? "default" : "outline"}
                          className="gap-2"
                        >
                          {votingLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsDown className="h-4 w-4" />
                          )}
                          Downvote
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Connect your wallet to vote on-chain
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* On-Chain Status */}
            {report.isAnchoredOnChain && onChainData ? (
              <Card>
                <CardHeader>
                  <CardTitle>On-Chain Status</CardTitle>
                  <CardDescription>
                    Verified on blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Anchored on-chain</span>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reporter:</span>
                      <span className="font-mono">{formatAddress(onChainData.reporter)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span>{new Date(Number(onChainData.timestamp) * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exists:</span>
                      <span>{onChainData.exists ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>On-Chain Status</CardTitle>
                  <CardDescription>
                    Not anchored on blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This report exists only in the off-chain database. It has not been anchored
                      on the blockchain for immutable verification.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    View All Reports
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
