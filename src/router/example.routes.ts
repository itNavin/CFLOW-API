import { Hono } from "hono";
import { GetExampleController } from "../controller/example/getExample";

const exampleRouter = new Hono();

exampleRouter.get("/", GetExampleController);

export { exampleRouter };
