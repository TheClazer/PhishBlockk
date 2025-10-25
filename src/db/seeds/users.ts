import { db } from '@/db';
import { users } from '@/db/schema';

async function main() {
    const sampleUsers = [
        {
            email: 'alice.chen@protonmail.com',
            name: 'Alice Chen',
            walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            email: 'bob.martinez@blockchain.io',
            name: null,
            walletAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            email: 'diana.patel@gmail.com',
            name: 'Diana Patel',
            walletAddress: '0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            email: 'erik@outlook.com',
            name: null,
            walletAddress: '0x1c8aFF950685c2eD4Bc3174f3472287b56D9517b',
            createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            email: 'sophia.williams@blockchain.io',
            name: 'Sophia Williams',
            walletAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});