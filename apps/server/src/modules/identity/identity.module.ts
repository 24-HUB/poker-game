import { Module } from '@nestjs/common';
import type { Db, MongoClient } from 'mongodb';

import { HttpSessionGuard } from '../../common/httpSessionGuard';
import { MONGO_CLIENT, MONGO_DB } from '../../database/database.tokens';
import { AUTH, createPokerAuth, type PokerAuth } from './auth';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [
    {
      provide: AUTH,
      inject: [MONGO_DB, MONGO_CLIENT],
      useFactory: (db: Db, client: MongoClient): Promise<PokerAuth> => createPokerAuth(db, client),
    },
    IdentityService,
    HttpSessionGuard,
  ],
  exports: [AUTH, IdentityService, HttpSessionGuard],
})
export class IdentityModule {}
