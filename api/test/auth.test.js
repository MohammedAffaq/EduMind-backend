const { start } = require('../server');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer, server;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  server = await start(0);
});

afterAll(async () => {
  if (server && server.close) server.close();
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

test('register -> login -> refresh -> logout', async () => {
  const agent = request(server);

  // register
  const reg = await agent.post('/api/auth/register').send({ firstName: 'Test', lastName: 'User', email: 'test@ex.com', password: 'Password123!', role: 'admin' });
  expect(reg.body.success).toBe(true);

  // login
  const login = await agent.post('/api/auth/login').send({ email: 'test@ex.com', password: 'Password123!' });
  expect(login.body.success).toBe(true);
  expect(login.body.token).toBeDefined();
  expect(login.body.refreshToken).toBeDefined();

  const { refreshToken } = login.body;

  // refresh (rotates)
  const refresh = await agent.post('/api/auth/refresh').send({ refreshToken });
  expect(refresh.body.success).toBe(true);
  expect(refresh.body.token).toBeDefined();
  expect(refresh.body.refreshToken).toBeDefined();
  const newRefresh = refresh.body.refreshToken;

  // old refresh should no longer be valid
  const bad = await agent.post('/api/auth/refresh').send({ refreshToken });
  expect(bad.status).toBe(401);

  // logout with new token
  const logout = await agent.post('/api/auth/logout').send({ refreshToken: newRefresh });
  expect(logout.body.success).toBe(true);

  // refreshing after logout should fail
  const bad2 = await agent.post('/api/auth/refresh').send({ refreshToken: newRefresh });
  expect(bad2.status).toBe(401);
});