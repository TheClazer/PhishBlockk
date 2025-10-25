import { Metadata } from 'next';
import ProposalList from '@/components/ProposalList';

export const metadata: Metadata = {
  title: 'DAO Governance | PhishBlock',
  description: 'Participate in PhishBlock DAO proposals and voting',
};

export default function DAOPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">DAO Governance</h1>
      <ProposalList />
    </div>
  );
}
