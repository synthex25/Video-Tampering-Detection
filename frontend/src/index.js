import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.body.style.margin = "0";
document.body.className = "";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
