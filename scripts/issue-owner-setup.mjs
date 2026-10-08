// Creates a private link locally; never prints a bearer token or sends an email.
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const owner=await db.from('admin_owner').select('id').eq('id',1).maybeSingle();
if(owner.error) throw new Error('Owner account lookup failed');
if(owner.data) throw new Error('Owner account already exists. Setup links cannot reset or replace it.');
const token=randomBytes(32).toString('hex');
const expires=new Date(Date.now()+48*60*60*1000).toISOString();
const {error}=await db.from('admin_owner_setup').upsert({id:1,token_hash:createHash('sha256').update(token).digest('hex'),expires_at:expires,used_at:null});
if(error) throw new Error('Setup link could not be issued');
await mkdir('output/handoff',{recursive:true,mode:0o700});await chmod('output/handoff',0o700);
await writeFile('output/handoff/owner-setup.md',`# Private BOOM owner setup\n\nFor boomcleaninfo@gmail.com only. Share this file privately with the owner.\n\n[Create your owner account](https://boomcleaning.site/admin/setup?token=${token})\n\nExpires: ${new Date(expires).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})} (Abuja time). Works once.\n\nChoose a password of at least 12 characters. After setup, sign in at https://boomcleaning.site/admin/login using boomcleaninfo@gmail.com and your new password. Save it in your password manager.\n\nThis replaces the shared admin password and signs out previous sessions. Do not publish this link or include it in the general handoff guide.\n`,{mode:0o600});await chmod('output/handoff/owner-setup.md',0o600);
console.log('Private owner setup saved to output/handoff/owner-setup.md. Expires in 48 hours. No email sent.');
