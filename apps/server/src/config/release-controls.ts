import { Module } from '@nestjs/common';

export type ReleaseSettings = Readonly<{ allowNewSessions: boolean; economyWritesEnabled: boolean }>;

export function parseReleaseSettings(environment: Record<string, string | undefined>): ReleaseSettings {
  const flag = (name: string): boolean => {
    const value = environment[name];
    if (value === undefined) return environment.NODE_ENV !== 'production';
    if (value !== 'true' && value !== 'false') throw new Error(`${name} must be true or false`);
    return value === 'true';
  };
  return Object.freeze({ allowNewSessions: flag('ALLOW_NEW_SESSIONS'), economyWritesEnabled: flag('ECONOMY_WRITES_ENABLED') });
}

// Read once at process startup. Only operator configuration can change these settings.
export class ReleaseControls {
  public readonly settings: ReleaseSettings;
  public constructor() { this.settings = parseReleaseSettings(process.env); }
}

@Module({ providers: [{ provide: ReleaseControls, useFactory: () => new ReleaseControls() }], exports: [ReleaseControls] })
export class ReleaseControlsModule {}
