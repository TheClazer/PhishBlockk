import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { NextRequest } from 'next/server';
import { headers } from "next/headers";

export const auth = betterAuth({
	emailAndPassword: {
		enabled: false
	},
	// Disable social providers since this is a wallet-based application
	socialProviders: {},
	plugins: [bearer()],
	// Disable credentials auth
	credentials: {
		enabled: false
	}
});

// Session validation helper
export async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user || null;
}
