import { describe,it,expect } from "vitest";
import { hashOwnerPassword,verifyOwnerPassword } from "../src/lib/admin-password";
describe("owner password storage",()=>{
 it("salts each password and rejects incorrect passwords",async()=>{
  const password="Owner's private test password";
  const first=await hashOwnerPassword(password),second=await hashOwnerPassword(password);
  expect(first).not.toContain(password);expect(first).not.toBe(second);
  expect(await verifyOwnerPassword(password,first)).toBe(true);
  expect(await verifyOwnerPassword("wrong password",first)).toBe(false);
 });
 it("rejects malformed hashes without deriving a key",async()=>{expect(await verifyOwnerPassword("password","scrypt:bad:bad")).toBe(false);});
});
