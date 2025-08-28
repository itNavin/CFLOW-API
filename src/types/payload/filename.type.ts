export namespace FilenamePayload {
    export type FilePayload = {
        groupCode: string;
        deliverableName: string;
        version: number;
        mime: string;
        originalName: string;
        partIndex: number;
        deliverableId?: number;
        courseId?: number;
        assignmentId?: number; 
    }
}