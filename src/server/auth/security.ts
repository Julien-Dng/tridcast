import {createHash,randomBytes,randomInt,timingSafeEqual} from "node:crypto";

export const OTP_TTL_MS=10*60_000, OTP_MAX_ATTEMPTS=5, OTP_SEND_WINDOW_MS=15*60_000, OTP_SEND_LIMIT=3;
export const normalizeEmail=(email:string)=>email.trim().toLowerCase();
export const hashSecret=(value:string)=>createHash("sha256").update(value).digest("hex");
export const createOtp=()=>randomInt(0,1_000_000).toString().padStart(6,"0");
export const createToken=()=>randomBytes(32).toString("base64url");
export function safeHashEqual(value:string,hash:string){const actual=Buffer.from(hashSecret(value));const expected=Buffer.from(hash);return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export function validateOtp(record:{codeHash:string;attempts:number;expiresAt:Date;consumedAt:Date|null},code:string,now=new Date()){
 if(record.consumedAt)throw new Error("Ce code a déjà été utilisé.");
 if(record.expiresAt<=now)throw new Error("Ce code a expiré. Demandez-en un nouveau.");
 if(record.attempts>=OTP_MAX_ATTEMPTS)throw new Error("Trop de tentatives. Demandez un nouveau code.");
 if(!/^\d{6}$/.test(code)||!safeHashEqual(code,record.codeHash))throw new Error("Le code est incorrect.");
}
export function verifiedIdentityEmail(input:{email?:string|null;emailVerified?:boolean}){return input.email&&input.emailVerified?normalizeEmail(input.email):null}

