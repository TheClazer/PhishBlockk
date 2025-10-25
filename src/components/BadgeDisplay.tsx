'use client';

import { useEffect, useState } from 'react';
import { BadgeCard } from './BadgeCard';
import { Button } from '@/components/ui/button';

interface Badge {
  id: string;
  tokenId: bigint | null;
  level: number;
  tier: string;
  metadataURI: string | null;
  mintedAt: Date | null;
  owner: { walletAddress: string };
}

export default function BadgeDisplay() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      // Assuming user ID is 1 for now; in real app, get from auth
      const response = await fetch('/api/badges/1');
      const data = await response.json();
      setBadges(data.badges || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async (badgeId: string) => {
    try {
      await fetch('/api/badges/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1, level: 1, metadataURI: 'https://example.com/metadata' }),
      });
      fetchBadges(); // Refresh
    } catch (error) {
      console.error('Error minting badge:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {badges.map((badge) => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          onMint={() => handleMint(badge.id)}
        />
      ))}
    </div>
  );
}
