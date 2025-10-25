"use client";

import { WalletConnect } from "@/components/WalletConnect";
import { ReportForm } from "@/components/ReportForm";
import { StakingReportForm } from "@/components/StakingReportForm";
import { ValidatorDashboard } from "@/components/ValidatorDashboard";
import { ReportsList } from "@/components/ReportsList";
import { StatsCards } from "@/components/StatsCards";
import { Shield, Coins, Users } from "lucide-react";
import { Toaster } from "sonner";
import { useState } from "react";
import { UserMenu } from "@/components/UserMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReportSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PhishGuard</h1>
                <p className="text-xs text-muted-foreground">Decentralized Scam Reporting</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WalletConnect />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Stake-Based Scam Protection
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Submit phishing reports with economic incentives. Stake ETH to submit reports,
              earn rewards for valid submissions, and help protect the community.
            </p>
          </div>

          {/* Stats */}
          <StatsCards key={refreshKey} />

          {/* Main Tabs */}
          <Tabs defaultValue="submit" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="submit" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Submit Report
              </TabsTrigger>
              <TabsTrigger value="validate" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Validate Reports
              </TabsTrigger>
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Browse Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submit" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <StakingReportForm onReportSubmitted={handleReportSuccess} />
                </div>
                <div>
                  <ReportForm onSuccess={handleReportSuccess} />
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Free Report Submission</h3>
                    <p className="text-sm text-muted-foreground">
                      Submit reports without staking. These reports are stored locally and don't earn rewards.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="validate">
              <ValidatorDashboard />
            </TabsContent>

            <TabsContent value="browse">
              <ReportsList key={refreshKey} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Built with Next.js, Hardhat, Prisma, and Supabase</p>
        </div>
      </footer>
    </div>
  );
}