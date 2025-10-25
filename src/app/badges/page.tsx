import { Metadata } from 'next';
import BadgeDisplay from '@/components/BadgeDisplay';

export const metadata: Metadata = {
  title: 'My Badges | PhishBlock',
  description: 'View and manage your reputation badges',
};

export default function BadgesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Reputation Badges</h1>
      <BadgeDisplay />
    </div>
  );
}
