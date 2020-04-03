const request = require('supertest');
const { print } = require('graphql');
const { connectAdmin, connectUser, connectAgent } = require('./_loginHelper');
const { db } = require('../../src/database/database');
const { objStore } = require('../../src/objStore/objStore');
const { Router } = require('../../src/server/router');
const path = require('path');
const uuid = require('uuid/v4');
const { errorCodes } = require('../../src/graphql/errors');
const { MongoClient } = require('mongodb');
const itmatCommons = require('itmat-commons');
const { UPLOAD_FILE, CREATE_STUDY, DELETE_FILE } = itmatCommons.GQLRequests;
const { MongoMemoryServer } = require('mongodb-memory-server');
const setupDatabase = require('itmat-utils/src/databaseSetup/collectionsAndIndexes');
const config = require('../../config/config.sample.json');
const { Models, permissions } = itmatCommons;

let app;
let mongodb;
let admin;
let user;
let mongoConnection;
let mongoClient;

afterAll(async () => {
    await db.closeConnection();
    await mongoConnection.close();
    await mongodb.stop();
});

beforeAll(async () => { // eslint-disable-line no-undef
    /* Creating a in-memory MongoDB instance for testing */
    mongodb = new MongoMemoryServer();
    const connectionString = await mongodb.getUri();
    const database = await mongodb.getDbName();
    await setupDatabase(connectionString, database);

    /* Wiring up the backend server */
    config.database.mongo_url = connectionString;
    config.database.database = database;
    await db.connect(config.database);
    await objStore.connect(config.objectStore);
    const router = new Router();

    /* Connect mongo client (for test setup later / retrieve info later) */
    mongoConnection = await MongoClient.connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    mongoClient = mongoConnection.db(database);

    /* Connecting clients for testing later */
    app = router.getApp();
    admin = request.agent(app);
    user = request.agent(app);
    await connectAdmin(admin);
    await connectUser(user);
});

describe('FILE API', () => {
    let adminId;
    let userId;

    beforeAll(async () => {
        /* setup: first retrieve the generated user id */
        const result = await mongoClient.collection(config.database.collections.users_collection).find({}, { projection: { id: 1, username: 1 } }).toArray();
        adminId = result.filter(e => e.username === 'admin')[0].id;
        userId = result.filter(e => e.username === 'standardUser')[0].id;
    });

    describe('UPLOAD AND DOWNLOAD FILE', () => {
        describe('UPLOAD FILE', () => {
            /* note: a new study is created */
            let createdStudy;
            beforeEach(async () => {
                /* setup: create a study to upload file to */
                const studyname = uuid();
                const createStudyRes = await admin.post('/graphql').send({
                    query: print(CREATE_STUDY),
                    variables: { name: studyname }
                });
                expect(createStudyRes.status).toBe(200);
                expect(createStudyRes.body.errors).toBeUndefined();

                /* setup: getting the created study Id */
                createdStudy = await mongoClient.collection(config.database.collections.studies_collection).findOne({ name: studyname });
                expect(createStudyRes.body.data.createStudy).toEqual({
                    id: createdStudy.id,
                    name: studyname
                });
            });

            test('Upload file to study (admin)', async () => { 
                /* test: upload file */
                const res = await admin.post('/graphql')
                    .field('operations', JSON.stringify({
                        query: print(UPLOAD_FILE),
                        variables: {
                            studyId: createdStudy.id,
                            file: null,
                            description: 'just a file 1.',
                            fileLength: 10000
                        }
                    }))
                    .field('map', JSON.stringify({ 1: ['variables.file']}))
                    .attach('1', path.join(__dirname, '../filesForTests/just_a_test_file.txt'));

                /* setup: geting the created file Id */
                const createdFile = await mongoClient.collection(config.database.collections.files_collection).findOne({ fileName: 'just_a_test_file.txt', studyId: createdStudy.id });
                expect(res.status).toBe(200);
                expect(res.body.errors).toBeUndefined();
                expect(res.body.data.uploadFile).toEqual({
                    id: createdFile.id,
                    fileName: 'just_a_test_file.txt',
                    studyId: createdStudy.id,
                    projectId: null,
                    fileSize: 10000,
                    description: 'just a file 1.',
                    uploadedBy: adminId
                });
            });

            test('Upload file to study (user with no privilege) (should fail)', async () => {
                /* test: upload file */
                const res = await user.post('/graphql')
                    .field('operations', JSON.stringify({
                        query: print(UPLOAD_FILE),
                        variables: {
                            studyId: createdStudy.id,
                            file: null,
                            description: 'just a file 1.',
                            fileLength: 10000
                        }
                    }))
                    .field('map', JSON.stringify({ 1: ['variables.file']}))
                    .attach('1', path.join(__dirname, '../filesForTests/just_a_test_file.txt'));

                expect(res.status).toBe(200);
                expect(res.body.errors).toHaveLength(1);
                expect(res.body.errors[0].message).toBe(errorCodes.NO_PERMISSION_ERROR);
                expect(res.body.data.uploadFile).toEqual(null);
            });

            test('Upload file to study (user with privilege)', async () => {

            });

            test('Upload a empty file (admin)', async () => {
                /* test: upload file */
                const res = await admin.post('/graphql')
                    .field('operations', JSON.stringify({
                        query: print(UPLOAD_FILE),
                        variables: {
                            studyId: createdStudy.id,
                            file: null,
                            description: 'just a file 3.',
                            fileLength: 0
                        }
                    }))
                    .field('map', JSON.stringify({ 1: ['variables.file']}))
                    .attach('1', path.join(__dirname, '../filesForTests/just_a_empty_file.txt'));

                /* setup: geting the created file Id */
                const createdFile = await mongoClient.collection(config.database.collections.files_collection).findOne({ fileName: 'just_a_empty_file.txt', studyId: createdStudy.id });
                expect(res.status).toBe(200);
                expect(res.body.errors).toBeUndefined();
                expect(res.body.data.uploadFile).toEqual({
                    id: createdFile.id,
                    fileName: 'just_a_empty_file.txt',
                    studyId: createdStudy.id,
                    projectId: null,
                    fileSize: 0,
                    description: 'just a file 3.',
                    uploadedBy: adminId
                });
            });
        });

        describe('DOWNLOAD FILES', () => {
            /* note: a new study is created and a non-empty text file is uploaded before each test */
            let createdStudy;
            let createdFile;

            beforeEach(async () => {
                /* setup: create a study to upload file to */
                const studyname = uuid();
                const createStudyRes = await admin.post('/graphql').send({
                    query: print(CREATE_STUDY),
                    variables: { name: studyname }
                });
                expect(createStudyRes.status).toBe(200);
                expect(createStudyRes.body.errors).toBeUndefined();

                /* setup: getting the created study Id */
                createdStudy = await mongoClient.collection(config.database.collections.studies_collection).findOne({ name: studyname });
                expect(createStudyRes.body.data.createStudy).toEqual({
                    id: createdStudy.id,
                    name: studyname
                });

                /* setup: upload file (would be better to upload not via app api but will do for now) */
                await admin.post('/graphql')
                    .field('operations', JSON.stringify({
                        query: print(UPLOAD_FILE),
                        variables: {
                            studyId: createdStudy.id,
                            file: null,
                            description: 'just a file 1.',
                            fileLength: 10000
                        }
                    }))
                    .field('map', JSON.stringify({ 1: ['variables.file']}))
                    .attach('1', path.join(__dirname, '../filesForTests/just_a_test_file.txt'));

                /* setup: geting the created file Id */
                createdFile = await mongoClient.collection(config.database.collections.files_collection).findOne({ fileName: 'just_a_test_file.txt', studyId: createdStudy.id });
            });

            test('Download file from study (admin)', async () => {
                const res = await admin.get(`/file/${createdFile.id}`);
                expect(res.status).toBe(200);
                expect(res.headers['content-type']).toBe('application/download');
                expect(res.headers['content-disposition']).toBe('attachment; filename="just_a_test_file.txt"');
                expect(res.text).toBe('just testing.');
            });

            test('Download file from study (user with privilege)', async () => {

            });

            test('Download file from study (not logged in)', async () => {
                const loggedoutUser = request.agent(app);
                const res = await loggedoutUser.get(`/file/${createdFile.id}`);
                expect(res.status).toBe(403);
                expect(res.body).toEqual({ error: 'Please log in.' });
            });

            test('Download file from study (user with no privilege) (should fail)', async () => {
                const res = await user.get(`/file/${createdFile.id}`);
                expect(res.status).toBe(404);
                expect(res.body).toEqual({ error: 'File not found or you do not have the necessary permission.' });
            });

            test('Download an non-existent file from study (admin) (should fail)', async () => {
                const res = await admin.get('/file/fakefileid');
                expect(res.status).toBe(404);
                expect(res.body).toEqual({ error: 'File not found or you do not have the necessary permission.' });
            });

            test('Download an non-existent file from study (not logged in)', async () => {
                const loggedoutUser = request.agent(app);
                const res = await loggedoutUser.get('/file/fakefileid');
                expect(res.status).toBe(403);
                expect(res.body).toEqual({ error: 'Please log in.' });
            });

            test('Download an non-existent file from study (user without privilege) (should fail)', async () => {
                const res = await user.get('/file/fakefileid');
                expect(res.status).toBe(404);
                expect(res.body).toEqual({ error: 'File not found or you do not have the necessary permission.' });
            });

            test('Download an non-existent file from study (user with privilege) (should fail)', async () => {
            });
        });

        describe('DELETE FILES', () => {
            let createdStudy;
            let createdFile;
            beforeEach(async () => {
                /* setup: create a study to upload file to */
                const studyname = uuid();
                const createStudyRes = await admin.post('/graphql').send({
                    query: print(CREATE_STUDY),
                    variables: { name: studyname }
                });
                expect(createStudyRes.status).toBe(200);
                expect(createStudyRes.body.errors).toBeUndefined();

                /* setup: getting the created study Id */
                createdStudy = await mongoClient.collection(config.database.collections.studies_collection).findOne({ name: studyname });
                expect(createStudyRes.body.data.createStudy).toEqual({
                    id: createdStudy.id,
                    name: studyname
                });

                /* setup: upload file (would be better to upload not via app api but will do for now) */
                await admin.post('/graphql')
                    .field('operations', JSON.stringify({
                        query: print(UPLOAD_FILE),
                        variables: {
                            studyId: createdStudy.id,
                            file: null,
                            description: 'just a file 1.',
                            fileLength: 10000
                        }
                    }))
                    .field('map', JSON.stringify({ 1: ['variables.file']}))
                    .attach('1', path.join(__dirname, '../filesForTests/just_a_test_file.txt'));

                /* setup: geting the created file Id */
                createdFile = await mongoClient.collection(config.database.collections.files_collection).findOne({ fileName: 'just_a_test_file.txt', studyId: createdStudy.id, deleted: null });

                /* before test: can download file */
                const res = await admin.get(`/file/${createdFile.id}`);
                expect(res.status).toBe(200);
                expect(res.headers['content-type']).toBe('application/download');
                expect(res.headers['content-disposition']).toBe('attachment; filename="just_a_test_file.txt"');
                expect(res.text).toBe('just testing.');
            });

            test('Delete file from study (admin)', async () => {
                const res = await admin.post('/graphql').send({
                    query: print(DELETE_FILE),
                    variables: { fileId: createdFile.id }
                });
                expect(res.status).toBe(200);
                expect(res.body.errors).toBeUndefined();
                expect(res.body.data.deleteFile).toEqual({ successful: true });
                
                const downloadFileRes = await user.get(`/file/${createdFile.id}`);
                expect(downloadFileRes.status).toBe(404);
                expect(downloadFileRes.body).toEqual({ error: 'File not found or you do not have the necessary permission.' });
            });

            test('Delete file from study (user with privilege)', async () => {

            });

            test('Delete file from study (user with no privilege) (should fail)', async () => {
                const res = await user.post('/graphql').send({
                    query: print(DELETE_FILE),
                    variables: { fileId: createdFile.id }
                });
                expect(res.status).toBe(200);
                expect(res.body.errors).toHaveLength(1);
                expect(res.body.errors[0].message).toBe(errorCodes.NO_PERMISSION_ERROR);
                expect(res.body.data.deleteFile).toBe(null);
                
                const downloadFileRes = await admin.get(`/file/${createdFile.id}`);
                expect(downloadFileRes.status).toBe(200);
                expect(downloadFileRes.headers['content-type']).toBe('application/download');
                expect(downloadFileRes.headers['content-disposition']).toBe('attachment; filename="just_a_test_file.txt"');
                expect(downloadFileRes.text).toBe('just testing.');
            });

            test('Delete an non-existent file from study (admin)', async () => {
                const res = await admin.post('/graphql').send({
                    query: print(DELETE_FILE),
                    variables: { fileId: 'nosuchfile' }
                });
                expect(res.status).toBe(200);
                expect(res.body.errors).toHaveLength(1);
                expect(res.body.errors[0].message).toBe(errorCodes.CLIENT_ACTION_ON_NON_EXISTENT_ENTRY);
                expect(res.body.data.deleteFile).toBe(null);
            });

            test('Delete an non-existent file from study (user with privilege)', async () => {

            });

            test('Delete an non-existent file from study (user with no privilege)', async () => {
                const res = await user.post('/graphql').send({
                    query: print(DELETE_FILE),
                    variables: { fileId: 'nosuchfile' }
                });
                expect(res.status).toBe(200);
                expect(res.body.errors).toHaveLength(1);
                expect(res.body.errors[0].message).toBe(errorCodes.CLIENT_ACTION_ON_NON_EXISTENT_ENTRY);
                expect(res.body.data.deleteFile).toBe(null);
            });
        });
    });

    describe('FILE PERMISSION FOR PROJECTS', () => {
        test('1 + 1', () => {
            expect(2).toBe(2);
        });
    });
});