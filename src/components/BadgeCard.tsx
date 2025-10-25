'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Badge {
  id: string;
  tokenId: bigint | null;
  level: number;
  tier: string;
  metadataURI: string | null;
  mintedAt: Date | null;
  owner: { walletAddress: string };
}

interface BadgeCardProps {
  badge: Badge;
  onMint: () => void;
}

export function BadgeCard({ badge, onMint }: BadgeCardProps) {
  const isMinted = badge.tokenId !== null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {badge.tier} Badge
          <Badge variant={isMinted ? 'default' : 'secondary'}>
            {isMinted ? 'Minted' : 'Pending'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Level: {badge.level}</p>
            <p className="text-sm text-gray-600">Tier: {badge.tier}</p>
            {badge.mintedAt && (
              <p className="text-sm text-gray-600">Minted: {badge.mintedAt.toLocaleDateString()}</p>
            )}
          </div>
          {badge.metadataURI && (
            <img
              src={badge.metadataURI}
              alt={`${badge.tier} badge`}
              className="w-full h-32 object-cover rounded"
            />
          )}
          {!isMinted && (
            <Button onClick={onMint} className="w-full">
              Mint Badge
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
