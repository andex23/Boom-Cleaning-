import { z } from "zod";
const publicEnvironment = z.object({ NEXT_PUBLIC_SUPABASE_URL: z.url(), NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1) });
const serverEnvironment = publicEnvironment.extend({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) });
export type PublicEnvironment = z.infer<typeof publicEnvironment>;
export function getPublicEnv(): PublicEnvironment { return publicEnvironment.parse({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }); }
export function getServerEnv() { return serverEnvironment.parse({ ...getPublicEnv(), SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY }); }
