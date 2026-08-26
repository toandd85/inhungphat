import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/app";

const root = createRoot(document.getElementById("app") as HTMLElement);
root.render(React.createElement(App));
