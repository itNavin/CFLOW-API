export namespace AuthPayload {
    export type Auth = {
        userId: string;
        role: "STAFF" | "LECTURER" | "STUDENT" | "SUPER_ADMIN";
    }
}