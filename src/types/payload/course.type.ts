export namespace CoursePayload {

    export type CreateCourse = {
        name: string;
        description: string;
        program : "DSI" | "CS"
        createdById: string;
    };

    export type updateCourseBody = {
        courseId: number;
        name: string;
        description: string;
    }
}

