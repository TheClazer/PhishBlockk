'use client';

import { useEffect, useState } from 'react';
import { ProposalCard } from './ProposalCard';
import { Button } from '@/components/ui/button';

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  report: { id: number; targetValue: string };
  proposer: { walletAddress: string };
  proposalVotes: any[];
}

export default function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/dao/proposals');
      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Proposals</h2>
        <Button>Create Proposal</Button>
      </div>
      <div className="grid gap-4">
        {proposals.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} onVote={fetchProposals} />
        ))}
      </div>
    </div>
  );
}
