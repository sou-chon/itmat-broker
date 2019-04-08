import mongodb from 'mongodb';
import { IDatabaseBaseConfig, Database } from 'itmat-utils';
import config from '../../config/config.json';

export interface IDatabaseConfig extends IDatabaseBaseConfig {
    collections: {
        users_collection: string,
        jobs_collection: string,
        studies_collection: string,
        projects_collection: string,
        queries_collection: string,
        field_dictionary_collection: string,
        roles_collection: string
    }
}

export type Database = Database<IDatabaseBaseConfig>;
export const db = new Database(config.database);