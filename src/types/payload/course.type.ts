export namespace CoursePayload {

    export type createCourse = {
        name: string;
        description: string;
        program : "DSI" | "CS"
    };

    export type updateCourseBody = {
        courseId: string;
        name: string;
        description: string;
    }
}

