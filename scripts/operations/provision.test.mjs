import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { provisionPair } from './provision.mjs';

const require = createRequire(import.meta.url);
const { createPokerAuth } = require('../../apps/server/dist/modules/identity/auth.js');
const { TicketsRepository } = require('../../apps/server/dist/modules/tickets/tickets.repository.js');

test('rejects Windows PowerShell 5 before requesting any private provisioning inputs', { skip: process.platform !== 'win32' }, () => {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', fileURLToPath(new URL('./Provision-PlaytestAccounts.ps1', import.meta.url))], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ScriptRequiresUnmatchedPSVersion/);
  assert.doesNotMatch(result.stdout, /Approved target|Atlas URI|Playtest A/);
});

test('rejects unapproved source access and CLI target mismatches before writing or disclosing credentials', async () => {
  await assert.rejects(provisionPair({}, {databaseName:'poker_playtest'}, [], {}), /TARGET_REJECTED/);
  const result=spawnSync(process.execPath,[new URL('./run.mjs',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],{
    input:JSON.stringify({uri:'mongodb+srv://fixture:private-fixture-marker@wrong.example.invalid/',expectedHost:'cluster.example.mongodb.net',database:'poker_playtest'}),encoding:'utf8',timeout:10000,
  });
  assert.equal(result.status,1);
  assert.match(result.stderr,/TARGET_REJECTED/);
  assert.doesNotMatch(result.stderr,/private-fixture-marker/);
});

test('creates exactly two usable preverified credentials without email or existing-data changes', async () => {
  const client = await new MongoClient('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true').connect();
  const db = client.db(`poker_test_provision_${randomUUID().replaceAll('-', '')}`);
  const password = randomUUID() + randomUUID();
  const accounts = [{ alias: 'A', email: 'fixture-a@example.invalid', password }, { alias: 'B', email: 'fixture-b@example.invalid', password }];
  process.env.PUBLIC_ORIGIN='https://fixture.invalid';
  process.env.PROXY_SECRET='fixture-proxy-not-for-hosted-use';
  process.env.BETTER_AUTH_SECRET='fixture-better-auth-secret-over-thirty-two-characters';
  process.env.REGISTRATION_INVITE_CODE_SHA256=createHash('sha256').update('fixture-registration').digest('hex');
  process.env.NODE_ENV='test'; process.env.ACCOUNT_RECOVERY_ENFORCED='true';
  process.env.ACCOUNT_EMAIL_TRANSPORT='memory'; process.env.ACCOUNT_EMAIL_TEST_IPC='true';
  try {
    await db.collection('user').insertOne({_id:'unrelated-user',name:'Unrelated',email:'unrelated@example.invalid',emailVerified:true});
    await db.collection('ticketWallets').insertOne({_id:'unrelated-user',balance:19,revision:4});
    const before = await db.collection('ticketWallets').findOne({_id:'unrelated-user'});
    await assert.rejects(provisionPair(client,db,[{...accounts[0],email:'invalid@@example.com'},accounts[1]],{apply:true,confirm:'CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS'}),/INVALID_LOGIN/);
    await assert.rejects(provisionPair(client,db,[{...accounts[0],email:'invalid..login@example.com'},accounts[1]],{apply:true,confirm:'CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS'}),/INVALID_LOGIN/);
    assert.equal(await db.collection('user').countDocuments({}),1);
    await assert.rejects(provisionPair(client,db,accounts,{apply:true,confirm:''}), /CONFIRMATION_REQUIRED/);
    assert.equal(await db.collection('user').countDocuments({}),1);
    assert.deepEqual(await provisionPair(client,db,accounts,{apply:false}),{status:'planned',users:2,credentials:2,emailSends:0});
    assert.equal(await db.collection('user').countDocuments({}),1);
    assert.deepEqual(await provisionPair(client,db,accounts,{apply:true,confirm:'CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS'}),{status:'created',users:2,credentials:2,emailSends:0});
    assert.equal(await db.collection('user').countDocuments({}),3);
    assert.equal(await db.collection('account').countDocuments({providerId:'credential'}),2);
    assert.equal(await db.collection('user').countDocuments({name:{$in:['Playtest A','Playtest B']},emailVerified:true}),2);
    await assert.rejects(provisionPair(client,db,accounts,{apply:true,confirm:'CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS'}),/ACCOUNT_EXISTS/);
    const auth=await createPokerAuth(db,client);
    for(const account of accounts){
      const response=await auth.handler(new Request('https://fixture.invalid/api/auth/sign-in/email',{method:'POST',headers:{origin:'https://fixture.invalid','content-type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})}));
      assert.equal(response.status,200);
      const result=await response.json();
      assert.equal(result.user.emailVerified,true);
      const stored=await db.collection('account').findOne({accountId:result.user.id});
      assert.ok(stored); assert.notEqual(stored.password,password);
      const tickets=new TicketsRepository(db); await tickets.ensureWallet(result.user.id);
      assert.equal((await db.collection('ticketWallets').findOne({_id:result.user.id})).balance,0);
    }
    assert.equal(await db.collection('emailCodeChallenges').countDocuments({}),0);
    assert.deepEqual(await db.collection('ticketWallets').findOne({_id:'unrelated-user'}),before);
    assert.equal(await db.collection('pullReceipts').countDocuments({}),0);
    assert.equal(await db.collection('ownedCosmetics').countDocuments({}),0);
    const other=[{alias:'A',email:'collision-a@example.invalid',password},{alias:'B',email:'collision-b@example.invalid',password}];
    const priorCounts=[await db.collection('user').countDocuments({}),await db.collection('account').countDocuments({})];
    await db.command({collMod:'account',validator:{$jsonSchema:{properties:{providerId:{enum:['reject-fixture']}}}},validationLevel:'strict',validationAction:'error'});
    await assert.rejects(provisionPair(client,db,other,{apply:true,confirm:'CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS'}));
    assert.equal(await db.collection('user').countDocuments({}),priorCounts[0]);
    assert.equal(await db.collection('account').countDocuments({}),priorCounts[1]);
  } finally { await db.dropDatabase(); await client.close(); }
});
