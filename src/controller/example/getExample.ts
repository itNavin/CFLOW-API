import { Context } from "hono";
import { GenResponse } from "../../util/response";
import * as exampleModel from "../../model/example.model";

const GetExampleController = async (c: Context) => {
  try {
    const data = await exampleModel.getAllExample();
    return c.json(GenResponse(true, "Fetch Example table success", data));
  } catch (e) {
    return c.json(GenResponse(false, `${e}`));
  }
};

export { GetExampleController };
