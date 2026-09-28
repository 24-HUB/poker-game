import { z } from 'zod';

import type { Result } from './common.js';

const identifierSchema = z.string().min(1).max(128);
export const roomTitleSchema = z.string().trim().min(1).max(24);
const mutationMetadata = {
  commandId: z.uuid(),
  authorityBootId: identifierSchema,
  issuedAt: z.iso.datetime(),
};

const createRoomCommandSchema = z.object({
  type: z.literal('room:create'),
  title: roomTitleSchema,
  ...mutationMetadata,
}).strict();

const joinRoomCommandSchema = z.object({
  type: z.literal('room:join'),
  token: z.string().min(1).max(512),
  ...mutationMetadata,
}).strict();

const syncRoomCommandSchema = z.object({
  type: z.literal('room:sync'),
  roomId: identifierSchema,
}).strict();

const takeSeatCommandSchema = z.object({
  type: z.literal('room:takeSeat'),
  roomId: identifierSchema,
  seat: z.number().int().min(0).max(5),
  controlEpoch: z.number().int().nonnegative(),
  ...mutationMetadata,
}).strict();

const leaveRoomCommandSchema = z.object({
  type: z.literal('room:leave'),
  roomId: identifierSchema,
  controlEpoch: z.number().int().nonnegative(),
  ...mutationMetadata,
}).strict();

const rotateInviteCommandSchema = z.object({
  type: z.literal('room:rotateInvite'),
  roomId: identifierSchema,
  controlEpoch: z.number().int().nonnegative(),
  ...mutationMetadata,
}).strict();

const claimControlCommandSchema = z.object({
  type: z.literal('room:claimControl'),
  roomId: identifierSchema,
  ...mutationMetadata,
}).strict();

export const roomCommandSchema = z.discriminatedUnion('type', [
  createRoomCommandSchema,
  joinRoomCommandSchema,
  syncRoomCommandSchema,
  takeSeatCommandSchema,
  leaveRoomCommandSchema,
  rotateInviteCommandSchema,
  claimControlCommandSchema,
]);

export type RoomCommand = z.infer<typeof roomCommandSchema>;
export type RoomMutationCommand = Exclude<RoomCommand, { type: 'room:sync' }>;
export type RoomCommandType = RoomCommand['type'];

export const roomMemberSchema = z.object({
  accountId: identifierSchema,
  displayName: z.string().min(1).max(128),
  seat: z.number().int().min(0).max(5).nullable(),
  connected: z.boolean(),
}).strict();

export const roomViewSchema = z.object({
  roomId: identifierSchema,
  title: z.string().min(1).max(24),
  revision: z.number().int().nonnegative(),
  hostAccountId: identifierSchema,
  members: z.array(roomMemberSchema).max(6),
  control: z.object({
    isController: z.boolean(),
    epoch: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export type RoomView = z.infer<typeof roomViewSchema>;

export const invitationReplySchema = z.object({
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
}).strict();

export const roomReplySchema = z.object({
  room: roomViewSchema.nullable(),
  invitation: invitationReplySchema.optional(),
}).strict();

export type RoomReply = z.infer<typeof roomReplySchema>;

export interface ClientToServerEvents {
  'room:create': (command: Extract<RoomCommand, { type: 'room:create' }>, ack: RoomAck) => void;
  'room:join': (command: Extract<RoomCommand, { type: 'room:join' }>, ack: RoomAck) => void;
  'room:sync': (command: Extract<RoomCommand, { type: 'room:sync' }>, ack: RoomAck) => void;
  'room:takeSeat': (command: Extract<RoomCommand, { type: 'room:takeSeat' }>, ack: RoomAck) => void;
  'room:leave': (command: Extract<RoomCommand, { type: 'room:leave' }>, ack: RoomAck) => void;
  'room:rotateInvite': (command: Extract<RoomCommand, { type: 'room:rotateInvite' }>, ack: RoomAck) => void;
  'room:claimControl': (command: Extract<RoomCommand, { type: 'room:claimControl' }>, ack: RoomAck) => void;
}

export interface ServerToClientEvents {
  'connection:ready': (payload: { authorityBootId: string }) => void;
  'room:snapshot': (view: RoomView) => void;
  'room:closed': (payload: { roomId: string; reason: 'LEFT' | 'EMPTY' | 'RESTARTED' }) => void;
}

export type RoomAck = (result: Result<RoomReply>) => void;
