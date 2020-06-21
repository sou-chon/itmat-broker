import React, { useState } from 'react';
import { useMutation } from 'react-apollo';
import { CREATE_FILE } from 'itmat-commons';
import { FileTree } from '../fileTree/fileTree';

/**
 * create new file (script / upload)
 * create new folder
 * drag and drop move
 * rename file
 */


export const FileBrowser: React.FunctionComponent<{ rootDirId: string }> = ({ rootDirId }) => {
    const [createNewFile] = useMutation(CREATE_FILE);
    const [selectedPath, setSelectedPath] = useState([rootDirId]);

    return <div>
        <button onClick={() => {
            createNewFile({ variables: {} }); }
        }>New file</button>
        <button>New folder</button>
        <FileTree studyId='...'/>
    </div>;

};
