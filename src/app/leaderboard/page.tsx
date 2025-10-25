import { Metadata } from 'next';
import LeaderboardTable from '@/components/LeaderboardTable';

export const metadata: Metadata = {
  title: 'Leaderboard | PhishBlock',
  description: 'Top reporters and validators in PhishBlock',
};

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
      <LeaderboardTable />
    </div>
  );
}
