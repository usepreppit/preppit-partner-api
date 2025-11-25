// // import request from 'supertest';
// // import mongoose from 'mongoose';
// // import { MongoMemoryServer } from 'mongodb-memory-server';
// // import app from '../app';
// // import User from '../models/user';
// import { describe, it } from "@jest/globals";

// type TestUser = {
//   email: string;
//   password: string;
//   name: string;
//   _id: mongoose.Types.ObjectId;
// };

// describe('Login API', () => {
//     let mongoServer: MongoMemoryServer;
//     let testUser: TestUser;

//     beforeAll(async () => {
//         mongoServer = await MongoMemoryServer.create();
//         const uri = mongoServer.getUri();
//         await mongoose.connect(uri);

//         // Create test user
//         const user = await User.create({
//             email: 'test@example.com',
//             password: '$2b$10$ExampleHashedPassword',
//             name: 'Test User'
//         });
//         testUser = user.toObject() as TestUser;
//     });

//     afterAll(async () => {
//         await mongoose.disconnect();
//         await mongoServer.stop();
//     });

//     describe('POST /api/login', () => {
//         test('should login with valid credentials', async () => {
//             const response = await request(app)
//                 .post('/api/login')
//                 .send({
//                 email: 'test@example.com',
//                 password: 'validPassword123'
//                 });

//             expect(response.statusCode).toBe(200);
//             expect(response.body).toHaveProperty('token');
//             expect(response.body).toHaveProperty('user');
//             expect(response.body.user.email).toBe(testUser.email);
//             expect(response.body.user.password).toBeUndefined();
//         });

//         test('should return 401 for invalid credentials', async () => {
//             const response = await request(app)
//                 .post('/api/login')
//                 .send({
//                 email: 'test@example.com',
//                 password: 'wrongPassword'
//                 });

//             expect(response.statusCode).toBe(401);
//             expect(response.body).toHaveProperty('error');
//         });

//         test('should return 400 for missing fields', async () => {
//             const testCases = [
//                 { email: 'test@example.com' },
//                 { password: 'validPassword123' },
//                 {}
//             ];

//             for (const body of testCases) {
//                 const response = await request(app)
//                 .post('/api/login')
//                 .send(body);
                
//                 expect(response.statusCode).toBe(400);
//                 expect(response.body).toHaveProperty('errors');
//             }
//         });

//         test('should return 500 on server error', async () => {
//             // Mock database failure
//             const originalFindOne = User.findOne;
//             User.findOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error('Database error');
//             });

//             const response = await request(app)
//                 .post('/api/login')
//                 .send({
//                 email: 'test@example.com',
//                 password: 'validPassword123'
//                 });

//             expect(response.statusCode).toBe(500);
//             expect(response.body).toHaveProperty('error');
            
//             User.findOne = originalFindOne;
//         });
//     });
// });