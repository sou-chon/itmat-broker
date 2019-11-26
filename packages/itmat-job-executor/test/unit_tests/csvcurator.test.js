const { processDataRow, processHeader, CSVCurator } = require('../../src/curation/CSVCurator');
const fs = require('fs');

// describe('Unit tests for processHeader function', () => {
//     it('processHeader function weeds out syntax error', () => {
//         const exampleheader = ['eid', '1-3.3', '1-4.3'];
//         const { error, parsedHeader } = processHeader(exampleheader);
//         expect(parsedHeader.length).toBe(3);
//         expect(parsedHeader[0]).toBeNull();
//         expect(parsedHeader[1]).toBeNull();
//         expect(parsedHeader[2]).toBeNull();
//         expect(error).toBeDefined();
//         expect(error.length).toBe(2);
//         expect(error[0]).toBe("Line 1: '1-3.3' is not a valid header field descriptor.");
//         expect(error[1]).toBe("Line 1: '1-4.3' is not a valid header field descriptor.");
//     });

//     it('processHeader function weeds out duplicates', () => {
//         const exampleheader = ['eid', '1@3.3', '1@3.3', '1@2.1', '2@3.2'];
//         const { error, parsedHeader } = processHeader(exampleheader);
//         expect(parsedHeader.length).toBe(5);
//         expect(parsedHeader[0]).toBeNull();
//         expect(parsedHeader[1]).toEqual({ fieldId: 1, timepoint: 3, measurement: 3, datatype: 'c' });
//         expect(parsedHeader[2]).toEqual({ fieldId: 1, timepoint: 3, measurement: 3, datatype: 'c' });
//         expect(parsedHeader[3]).toEqual({ fieldId: 1, timepoint: 2, measurement: 1, datatype: 'c' });
//         expect(parsedHeader[4]).toEqual({ fieldId: 2, timepoint: 3, measurement: 2, datatype: 'c' });
//         expect(error).toBeDefined();
//         expect(error.length).toBe(1);
//         expect(error[0]).toBe("Line 1: There is duplicate (field, timepoint, measurement) combination.");
//     });

//     it('processHeader function, user can annotate data type', () => {
//         const exampleheader = ['eid', '1@3.3:i', '1@3.3:c', '1@2.1:b', '2@3.2:c'];
//         const { error, parsedHeader } = processHeader(exampleheader);
//         expect(parsedHeader.length).toBe(5);
//         expect(parsedHeader[0]).toBeNull();
//         expect(parsedHeader[1]).toEqual({ fieldId: 1, timepoint: 3, measurement: 3, datatype: 'i' });
//         expect(parsedHeader[2]).toEqual({ fieldId: 1, timepoint: 3, measurement: 3, datatype: 'c' });
//         expect(parsedHeader[3]).toEqual({ fieldId: 1, timepoint: 2, measurement: 1, datatype: 'b' });
//         expect(parsedHeader[4]).toEqual({ fieldId: 2, timepoint: 3, measurement: 2, datatype: 'c' });
//         expect(error).toBeDefined();
//         expect(error.length).toBe(1);
//         expect(error[0]).toBe("Line 1: There is duplicate (field, timepoint, measurement) combination.");
//     });

//     it('processHeader function weeds out wrong data type', () => {
//         const exampleheader = ['eid', '1@3.3:p', '1@2.1:b', '2@3.2:e'];
//         const { error, parsedHeader } = processHeader(exampleheader);
//         expect(parsedHeader.length).toBe(4);
//         expect(parsedHeader[0]).toBeNull();
//         expect(parsedHeader[1]).toBeNull();
//         expect(parsedHeader[2]).toEqual({ fieldId: 1, timepoint: 2, measurement: 1, datatype: 'b' });
//         expect(parsedHeader[3]).toBeNull();
//         expect(error).toBeDefined();
//         expect(error.length).toBe(2);
//         expect(error[0]).toBe("Line 1: '1@3.3:p' is not a valid header field descriptor.");
//         expect(error[1]).toBe("Line 1: '2@3.2:e' is not a valid header field descriptor.");
//     });

//     it('processHeader function correctly parsed header', () => {
//         const exampleheader = ['eid', '1@3.3:c', '1@2.1:i', '2@3.2:b'];
//         const { error, parsedHeader } = processHeader(exampleheader);
//         expect(parsedHeader.length).toBe(4);
//         expect(parsedHeader[0]).toBeNull();
//         expect(parsedHeader[1]).toEqual({ fieldId: 1, timepoint: 3, measurement: 3, datatype: 'c' });
//         expect(parsedHeader[2]).toEqual({ fieldId: 1, timepoint: 2, measurement: 1, datatype: 'i' });
//         expect(parsedHeader[3]).toEqual({ fieldId: 2, timepoint: 3, measurement: 2, datatype: 'b' });
//         expect(error).toBeUndefined();
//     });
// });

// describe('Unit tests for processDataRow function', () => {
//     const templateParams = {
//         lineNum: 22,
//         row: [],
//         parsedHeader: processHeader(['eid', '1@3.3:c', '1@2.1:i', '2@3.2:b', '3@3.1:d']).parsedHeader,
//         job: {  // subset of the IJobEntry interface
//             id: 'mockJobId',
//             studyId: 'mockStudyId',
//             data: {
//                 dataVersion: '0.0.1',
//                 versionTag: 'testData' 
//             }
//         },
//         versionId: 'mockVersionId'
//     };

//     it('processDataRow function correctly parse data row', () => {
//         const { error, dataEntry } = processDataRow({ ...templateParams, row: ['A001', 'male', '95', 'true', '4.64'] });
//         expect(error).toBeUndefined();
//         expect(dataEntry).toEqual({
//             m_eid: 'A001',
//             m_jobId: 'mockJobId',
//             m_study: 'mockStudyId',
//             m_versionId: 'mockVersionId',
//             1: { 2: { 1: 95 }, 3: { 3: 'male' } },
//             2: { 3: { 2: true } },
//             3: { 3: { 1: 4.64 } }
//         });
//     });

//     it('processDataRow function weeds out datatype mismatch', () => {
//         const { error, dataEntry } = processDataRow({ ...templateParams, row: ['A001', 'male', 'female', 'male', '4.64'] });
//         expect(error).toBeDefined();
//         expect(error).toHaveLength(2);
//         expect(error[0]).toBe("Line 22 column 3: Cannot parse 'female' as integer.");
//         expect(error[1]).toBe("Line 22 column 4: value for boolean type must be 'true' or 'false'.");
//         expect(dataEntry).toEqual({
//             m_eid: 'A001',
//             m_jobId: 'mockJobId',
//             m_study: 'mockStudyId',
//             m_versionId: 'mockVersionId',
//             1: { 3: { 3: 'male' } },
//             3: { 3: { 1: 4.64 } }
//         });
//     });

//     it('processDataRow function weeds out datatype mismatch (2)', () => {
//         const { error, dataEntry } = processDataRow({ ...templateParams, row: ['A001', '45', '53', 'false', '5a'] });
//         expect(error).toBeDefined();
//         expect(error).toHaveLength(1);
//         expect(error[0]).toBe("Line 22 column 5: Cannot parse '5a' as decimal.");
//         expect(dataEntry).toEqual({
//             m_eid: 'A001',
//             m_jobId: 'mockJobId',
//             m_study: 'mockStudyId',
//             m_versionId: 'mockVersionId',
//             1: { 2: { 1: 53 }, 3: { 3: '45' } },
//             2: { 3: { 2: false } },
//         });
//     });

//     it('processDataRow function deals with missing value by skipping', () => {
//         const { error, dataEntry } = processDataRow({ ...templateParams, row: ['A001', '', '', 'false', '5.96'] });
//         expect(error).toBeUndefined();
//         expect(dataEntry).toEqual({
//             m_eid: 'A001',
//             m_jobId: 'mockJobId',
//             m_study: 'mockStudyId',
//             m_versionId: 'mockVersionId',
//             2: { 3: { 2: false } },
//             3: { 3: { 1: 5.96 } }
//         });
//     });

//     it('processDataRow function deals with missing subject id correctly', () => {
//         const { error, dataEntry } = processDataRow({ ...templateParams, row: ['', 'male', '53', 'false', '5.3'] });
//         expect(error).toBeDefined();
//         expect(error).toHaveLength(1);
//         expect(error[0]).toBe("Line 22: No subject id provided.");
//         expect(dataEntry).toEqual({
//             m_jobId: 'mockJobId',
//             m_study: 'mockStudyId',
//             m_versionId: 'mockVersionId',
//             1: { 2: { 1: 53 }, 3: { 3: 'male' } },
//             2: { 3: { 2: false } },
//             3: { 3: { 1: 5.3 } }
//         });
//     });
// });

describe('CSVCuratorClass', () => {
    function BulkInsert() {
        this._insertArray = [];
        this._executeCalled = []; // array of length of _insertArray when execute() is called
        this.insert = (object) => { this._insertArray.push(object); };
        this.execute = () => new Promise((resolve, reject) => {
            setTimeout(() => {
                this._executeCalled.push(this._insertArray.length);
                resolve();
            }, 10);
        });
    }

    function MongoStub() {
        this._bulkinsert = new BulkInsert();
        this.initializeUnorderedBulkOp = () => this._bulkinsert;
    };

    it('test mongostub', () => {
        const bulkinsert = (new MongoStub).initializeUnorderedBulkOp();
        bulkinsert.insert({});
        bulkinsert.insert({});
        bulkinsert.execute().then(() => {
            bulkinsert.insert({});
            return bulkinsert.execute();
        }).then(() => {
            expect(bulkinsert._insertArray).toEqual([{}, {}, {}]);
            expect(bulkinsert._executeCalled).toEqual([2, 3]);
        });
    });

    it('csvcurator uploads csv file okay', async () => {
        const readStream = fs.createReadStream('./test/testFiles/CSVCurator.tsv');
        const mongoStub = new MongoStub();
        const csvcurator = new CSVCurator(
            mongoStub,
            readStream,
            { delimiter: '\t', quote: '"' },
            {  // subset of the IJobEntry interface
                id: 'mockJobId',
                studyId: 'mockStudyId',
                data: {
                    dataVersion: '0.0.1',
                    versionTag: 'testData' 
                }
            },
            'mockVersionId'
        );
        await csvcurator.processIncomingStreamAndUploadToMongo();
        expect(mongoStub._bulkinsert._insertArray).toHaveLength(2107);
        expect(mongoStub._bulkinsert._executeCalled).toEqual([1000, 2000, 2107]);
        expect(mongoStub._bulkinsert._insertArray[0]).toEqual({
            1: { 1: { 1: '1', 2: 2 }, 2: { 1: 2, } }, 2: { 1: { 1: 'male' } },
            m_eid: 'Subj1',
            m_jobId: 'mockJobId',
            m_study: 'mockStudyId',
            m_versionId: 'mockVersionId'
        });

    }, 10000);

    it('csvcurator uploads csv file okay', async () => {
        const readStream = fs.createReadStream('./test/testFiles/CSVCurator.tsv');
        const mongoStub = new MongoStub();
        const csvcurator = new CSVCurator(
            mongoStub,
            readStream,
            { delimiter: '\t', quote: '"' },
            {  // subset of the IJobEntry interface
                id: 'mockJobId',
                studyId: 'mockStudyId',
                data: {
                    dataVersion: '0.0.1',
                    versionTag: 'testData' 
                }
            },
            'mockVersionId'
        );
        await csvcurator.processIncomingStreamAndUploadToMongo();
        expect(mongoStub._bulkinsert._insertArray).toHaveLength(2107);
        expect(mongoStub._bulkinsert._executeCalled).toEqual([1000, 2000, 2107]);
        expect(mongoStub._bulkinsert._insertArray[0]).toEqual({
            1: { 1: { 1: '1', 2: 2 }, 2: { 1: 2, } }, 2: { 1: { 1: 'male' } },
            m_eid: 'Subj1',
            m_jobId: 'mockJobId',
            m_study: 'mockStudyId',
            m_versionId: 'mockVersionId'
        });

    }, 10000);
});