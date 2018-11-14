import { ItmatAPIReq } from '../server/requests';
import { Database } from '../database/database';
import { Models, RequestValidationHelper, CustomError, OpenStackSwiftObjectStore } from 'itmat-utils';
import { Express, Request, Response, NextFunction } from 'express';
import mongodb from 'mongodb';

declare global {
    namespace Express {
        namespace Multer {
            interface File { // tslint:disable-line
                stream: NodeJS.ReadableStream;
            }
        }
    }
}

export class FileController {
    constructor(private readonly db: Database, private readonly objStore: OpenStackSwiftObjectStore) {}

    public async uploadFile(req: ItmatAPIReq<requests.FileUploadReqBody>, res: Response, next: NextFunction): Promise<void> {
        const validator = new RequestValidationHelper(req, res);    // what if the person sends the same files to two carriers
        // maybe a script for checking integrity.
        // this doesn't include images..
        if (validator
            .checkForAdminPrivilege()
        //     .checkRequiredKeysArePresentIn<requests.FileUploadReqBody>(Models.APIModels.Enums.PlaceToCheck.BODY, ['fileName', 'jobId'])
        //     .checkForValidDataTypeForValue(req.params.fileName, Models.Enums.JSDataType.STRING, 'fileName')
        //     .checkForValidDataTypeForValue(req.params.jobId, Models.Enums.JSDataType.STRING, 'jobId')
            .checksFailed) { return; }

        const jobSearchResult: Models.JobModels.IJobEntry = await this.db.users_collection!.findOne({ id: req.params.jobId });

        if (validator
            .checkSearchResultIsNotDefinedNorNull(jobSearchResult, 'job')
            .checksFailed)  { return; }

        const user: Models.UserModels.IUserWithoutToken = req.user as Models.UserModels.IUserWithoutToken;

        if (user.username !== jobSearchResult.requester) {
            res.status(401).json(new CustomError(Models.APIModels.Errors.authorised));
            return;
        }

        if (jobSearchResult.cancelled === true) {
            res.status(400).json(new CustomError('Job was cancelled.'));
            return;
        }

        if (validator
            .checkKeyForValidValue('fileName', req.params.fileName, jobSearchResult.files)
            .checksFailed)  { return; }

        try {
            await this.objStore.uploadFile(req.file.stream, jobSearchResult, req.params.fileName);
        } catch (e) {
            res.status(500).json(new CustomError('Cannot upload file.', e));
            return;
        }

        if (jobSearchResult.filesReceived.includes(req.params.fileName)) {
            res.status(200).json({ message: 'File successfully replaced.'});
            return;
        } else {
            await this.db.jobs_collection!.updateOne({ id: req.params.jobId }, { $inc: { numberOfTransferredFiles: 1 }, $push: { filesReceived: req.params.fileName }});
            res.status(200).json({ message: 'File successfully uploaded.'});
            return;
        }
    }

    public async downloadFile(req: ItmatAPIReq<undefined>, res: Response): Promise<void> {
        // TO_DO: how to restrict downloadfile to other microservices .
        // TO_DO: check whether the job is by the user; bounce if not
        const user: Models.UserModels.IUserWithoutToken = req.user as Models.UserModels.IUserWithoutToken;
        const validator = new RequestValidationHelper(req, res);
        const { jobId, fileName } = req.params;

        const jobSearchResult: Models.JobModels.IJobEntry = await this.db.jobs_collection!.findOne({ id: jobId });

        if (validator
            .checkSearchResultIsNotDefinedNorNull(jobSearchResult, 'job')
            .checkKeyForValidValue('fileName', fileName, jobSearchResult.filesReceived)
            .checksFailed)  { return; }

        let fileStream: NodeJS.ReadableStream;
        try {
            fileStream = await this.objStore.downloadFile(fileName, jobSearchResult.id);
        } catch (e) {
            res.status(500).json(new CustomError('Cannot download file', e));
            return;
        }

        fileStream.on('data', data => {
            res.write(data);
        });

        fileStream.on('end', () => {
            res.end();
        });

        return;
    }
}