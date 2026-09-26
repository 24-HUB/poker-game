import request from 'supertest';

import { createApplication } from '../src/main';

describe('application bootstrap', () => {
  it('bootsRealNestModule', async () => {
    const application = await createApplication();
    await application.init();

    try {
      const response = await request(application.getHttpServer()).get('/health/live');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    } finally {
      await application.close();
    }
  });
});
