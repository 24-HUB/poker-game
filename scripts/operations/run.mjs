import { MongoClient } from 'mongodb';
import { provisionPair } from './provision.mjs';

let client;
try {
  let text='';
  for await(const chunk of process.stdin){text+=chunk;if(text.length>16384)throw new Error('INPUT_TOO_LARGE');}
  const input=JSON.parse(text);text='';
  const target=new URL(input.uri);
  if(target.protocol!=='mongodb+srv:'||input.expectedHost!=='cluster0.lxb4kqs.mongodb.net'||target.hostname!==input.expectedHost||input.database!=='poker_playtest')throw new Error('TARGET_REJECTED');
  if(!target.username||!target.password)throw new Error('CREDENTIAL_REQUIRED');
  client=new MongoClient(input.uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000});
  await client.connect();
  const result=await provisionPair(client,client.db(input.database),input.accounts,{apply:input.apply===true,confirm:input.confirm,sourceApproval:'poker_g/Cluster0/poker_playtest/A+B'});
  process.stdout.write(JSON.stringify(result)+'\n');
} catch(error) {
  const allowed=new Set(['TARGET_REJECTED','CREDENTIAL_REQUIRED','INPUT_TOO_LARGE','PAIR_REQUIRED','INVALID_LOGIN','PASSWORD_LENGTH','DISTINCT_LOGINS_REQUIRED','CONFIRMATION_REQUIRED','ACCOUNT_EXISTS']);
  process.stderr.write(allowed.has(error?.message)?error.message+'\n':'FAILED_OR_UNCERTAIN: no success confirmed; inspect both aliases before retrying. Driver details suppressed.\n');
  process.exitCode=1;
} finally {await client?.close();}
