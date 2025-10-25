'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  report: { id: number; targetValue: string };
  proposer: { walletAddress: string };
  proposalVotes: any[];
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote: () => void;
}

export function ProposalCard({ proposal, onVote }: ProposalCardProps) {
  const handleVote = async (choice: string) => {
    // TODO: Implement voting logic with wallet
    console.log(`Voting ${choice} on proposal ${proposal.id}`);
    onVote();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {proposal.title}
          <Badge variant={proposal.status === 'Active' ? 'default' : 'secondary'}>
            {proposal.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-600">{proposal.description}</p>
          <div className="text-sm text-gray-500">
            <p>Report: {proposal.report.targetValue}</p>
            <p>Proposer: {proposal.proposer.walletAddress}</p>
          </div>
          {proposal.status === 'Active' && (
            <div className="flex space-x-2">
              <Button onClick={() => handleVote('For')}>Vote For</Button>
              <Button onClick={() => handleVote('Against')} variant="outline">Vote Against</Button>
              <Button onClick={() => handleVote('Abstain')} variant="outline">Abstain</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
