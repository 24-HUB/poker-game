import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ObjectId } from 'mongodb';

const requireServer=createRequire(new URL('../../apps/server/package.json',import.meta.url));
const {z}=requireServer('zod');
const {hashPassword}=await import(pathToFileURL(requireServer.resolve('better-auth/crypto')).href);
export const confirmation='CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS';

// Private, one-time operator helper. Does not change the deployed app or its auth rules.
export async function provisionPair(client,db,accounts,options={}) {
  const fixture=/^poker_test_provision_[a-f0-9]{32}$/.test(db.databaseName);
  if(!fixture && (db.databaseName!=='poker_playtest' || options.sourceApproval!=='poker_g/Cluster0/poker_playtest/A+B')) throw new Error('TARGET_REJECTED');
  if(!Array.isArray(accounts)||accounts.length!==2||accounts[0].alias!=='A'||accounts[1].alias!=='B') throw new Error('PAIR_REQUIRED');
  for(const account of accounts){
    if(typeof account.email!=='string'||account.email!==account.email.trim().toLowerCase()||!z.email().safeParse(account.email).success) throw new Error('INVALID_LOGIN');
    if(typeof account.password!=='string'||account.password.length<16||account.password.length>128) throw new Error('PASSWORD_LENGTH');
  }
  if(accounts[0].email===accounts[1].email) throw new Error('DISTINCT_LOGINS_REQUIRED');
  if(options.apply && options.confirm!==confirmation) throw new Error('CONFIRMATION_REQUIRED');
  const emails=accounts.map(a=>a.email);
  const existing=await db.collection('user').countDocuments({email:{$in:emails}});
  if(existing) throw new Error('ACCOUNT_EXISTS');
  if(!options.apply) return {status:'planned',users:2,credentials:2,emailSends:0};
  const now=new Date();
  const prepared=[];
  for(const account of accounts){
    const id=new ObjectId();
    prepared.push({user:{_id:id,name:`Playtest ${account.alias}`,email:account.email,emailVerified:true,createdAt:now,updatedAt:now},
      credential:{_id:new ObjectId(),accountId:id.toHexString(),providerId:'credential',userId:id,password:await hashPassword(account.password),createdAt:now,updatedAt:now}});
  }
  const session=client.startSession();
  try {
    await session.withTransaction(async()=>{
      if(await db.collection('user').countDocuments({email:{$in:emails}},{session})) throw new Error('ACCOUNT_EXISTS');
      await db.collection('user').insertMany(prepared.map(x=>x.user),{session});
      await db.collection('account').insertMany(prepared.map(x=>x.credential),{session});
    },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:10000});
    return {status:'created',users:2,credentials:2,emailSends:0};
  } finally {await session.endSession();}
}
