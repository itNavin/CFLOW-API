export namespace AuthPayload {
    export type Auth = {
        userId: number;
        role: "ADMIN" | "ADVISOR" | "STUDENT" | "SUPER_ADMIN";
    }
}