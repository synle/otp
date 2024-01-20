// https://remix.run/docs/en/main/start/quickstart
import { createRequestHandler } from "@remix-run/express";
import express from "express";

import * as build from "./build/index.js";

const app = express();
app.use(express.static("public"));

// and your app is "just a request handler"
app.all("*", createRequestHandler({ build }));

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log("App listening on: ", port);
});
