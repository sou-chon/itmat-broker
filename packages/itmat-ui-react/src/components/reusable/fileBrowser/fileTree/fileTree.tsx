import React from 'react';
import style from './fileTree.module.css';
import {
    GET_STUDY,
    GET_USERS,
    IStudy,
    IUser,
    GET_FILE_WITH_CHILDREN,
    FETCH_CHILD_FILES,
    fileTypesDirs,
    fileTypesFiles,
    IFileMongoEntry
} from 'itmat-commons';
// import { RouteComponentProps } from 'react-router-dom';
import { useQuery, Query } from 'react-apollo';
import { LoadingBalls } from '../../icons/loadingBalls';

type GQLFile = Omit<IFileMongoEntry, 'childFileIds'> & { childFiles?: GQLFile[] }

export const FileTree: React.FunctionComponent<{ studyId?: string, userId?: string }> = ({ studyId, userId }) => {
    if (studyId && userId) {
        return <p>Error displaying files.</p>;
    } else if (studyId) {
        return <StudyFileBrowserFetch studyId={studyId} />;
    } else if (userId) {
        return <UserFileBrowserFetch userId={userId} />;
    } else {
        return <p>Error displaying files.</p>;
    }
};

const StudyFileBrowserFetch: React.FunctionComponent<{ studyId: string }> = ({ studyId }) => {
    const { loading, error, data } = useQuery(GET_STUDY, { variables: { studyId } });
    if (loading) { return <LoadingBalls />; }
    if (error) { return <p>Error fetching study</p>; }

    const study: IStudy = data.getStudy;
    if (!study) {
        return <p>Error fetching study</p>;
    }
    return <FileBrowserRender rootDirId={study.rootDir} />;
};

const UserFileBrowserFetch: React.FunctionComponent<{ userId: string }> = ({ userId }) => {
    const { loading, error, data } = useQuery(GET_USERS, { variables: { userId } });
    if (loading) { return <LoadingBalls />; }
    if (error) { return <p>Error fetching user</p>; }

    const user: IUser = data.getUsers;
    if (!user) {
        return <p>Error fetching user</p>;
    }
    return <FileBrowserRender rootDirId={user.rootDir} />;
};

const ChildrenFiles: React.FunctionComponent<{ level: number, parentDirId: string }> = ({ level, parentDirId }) => {
    const { data, loading, error } = useQuery(FETCH_CHILD_FILES, { variables: { dirFileId: parentDirId } });
    if (loading) { return <LoadingBalls />; }
    if (error) { return <p>Error fetching file</p>; }
    if (!data || !data.getFile) { return <p>Error.</p>; }
    return <>{
        data.getFile.childFiles.map(file => <OneFile level={level} file={file}/>)
    }</>;
};

const DirectoryFile: React.FunctionComponent<{ level: number, file: GQLFile }> = ({ level, file }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    if (!isOpen) {
        return <div className={style.one_file} onClick={() => setIsOpen(true)}>(+) {file.fileName}</div>;
    } else {
        return <>
            <div className={style.one_file} onClick={() => setIsOpen(false)}>(-) {file.fileName}</div>
            <div className={style.child_div}>
                <ChildrenFiles level={level+1} parentDirId={file.id}/>
            </div>
        </>;
    }
};

const LeafFile: React.FunctionComponent<{ level: number, file: GQLFile }> = ({ file }) => {
    return <div className={style.one_file}>{file.fileName}</div>;
};

const OneFile: React.FunctionComponent<{ level: number, file: GQLFile }> = ({ file, level }) => {
    if (!file) { return null; }
    if (fileTypesDirs.includes(file.fileType)) {
        return <DirectoryFile level={level} file={file}/>;
    } else if (fileTypesFiles.includes(file.fileType)) {
        return <LeafFile level={level} file={file}/>;
    } else {
        return null;
    }
};

const FileBrowserRender: React.FunctionComponent<{ rootDirId: string }> = ({ rootDirId }) => {
    return <Query<any, any> query={GET_FILE_WITH_CHILDREN} variables={{ fileId: rootDirId }}>
        {({ loading: rootLoading, error: rootError, data }) => {
            if (rootLoading) { return <LoadingBalls />; }
            if (rootError) { return <p>Error fetching file</p>; }
            // return <ChildrenFiles level={1} parentDirId={rootDirId}/>;
            return <DirectoryFile level={1} file={data.getFile}/>;
        }}
    </Query>;
};

