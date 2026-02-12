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

test('trip lifecycle with auth', async () => {
  const agent = request(server);
  // register and login
  await agent.post('/api/auth/register').send({ firstName: 'T', lastName: 'U', email: 'trip@ex.com', password: 'Pass123!', role: 'staff', staffType: 'driver' });
  const login = await agent.post('/api/auth/login').send({ email: 'trip@ex.com', password: 'Pass123!' });
  const token = login.body.token;

  const headers = { Authorization: `Bearer ${token}` };

  // create trip
  const create = await agent.post('/api/trips').set(headers).send({ routeName: 'R1', vehicleNumber: 'V1', date: new Date() });
  expect(create.body.success).toBe(true);
  const tripId = create.body.trip._id;

  // start trip
  const s = await agent.patch(`/api/trips/${tripId}/start`).set(headers).send();
  expect(s.body.success).toBe(true);
  expect(s.body.trip.status).toBe('in-progress');

  // end trip
  const e = await agent.patch(`/api/trips/${tripId}/end`).set(headers).send();
  expect(e.body.success).toBe(true);
  expect(e.body.trip.status).toBe('completed');
});