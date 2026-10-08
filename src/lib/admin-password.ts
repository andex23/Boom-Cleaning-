import { randomBytes,scrypt,timingSafeEqual } from "node:crypto";
const derive=(password:string,salt:string) => new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error ? reject(error) : resolve(key)));
export async function hashOwnerPassword(password:string) {
  const salt=randomBytes(16).toString("hex");
  const key=await derive(password,salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyOwnerPassword(password:string,hash:string) {
  if(!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) return false;
  const [,salt,value]=hash.split(":");
  const key=await derive(password,salt);
  return timingSafeEqual(key,Buffer.from(value,"hex"));
}
