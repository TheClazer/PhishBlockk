"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Search, ExternalLink, Shield, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatAddress } from "@/lib/wallet";
import Link from "next/link";
import { toast } from "sonner";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });

      if (reportTypeFilter !== "all") {
        params.append("reportType", reportTypeFilter);
      }

      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/reports?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch reports`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch reports");
      }

      // Validate data structure
      if (!data.data || !data.data.reports || !Array.isArray(data.data.reports)) {
        console.error("Invalid API response structure:", data);
        throw new Error("Invalid response format from server");
      }

      setReports(data.data.reports);
      setPagination(data.data.pagination);
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      const errorMessage = err.message || "Failed to load reports. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      setReports([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentPage, reportTypeFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchReports();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={() => fetchReports()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Community Reports</CardTitle>
          <CardDescription>
            Browse and verify reported phishing URLs and scam wallet addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="phishing_url">Phishing URLs</SelectItem>
                <SelectItem value="scam_wallet">Scam Wallets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reports List */}
          <div className="space-y-3">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports found. Be the first to submit one!
              </div>
            ) : (
              reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
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
                                On-Chain
                              </Badge>
                            )}
                          </div>
                          <p className="font-mono text-sm break-all mb-2">
                            {report.targetValue}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>Reporter: {formatAddress(report.reporter.walletAddress)}</span>
                          <span>{formatDate(report.createdAt)}</span>
                        </div>
                        <Link href={`/reports/${report.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            View Details
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}