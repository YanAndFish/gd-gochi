import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.jsx";
import { CommerceProvider } from "./CommerceProvider.jsx";
import "./styles.css";

const routerBasename =
  import.meta.env.BASE_URL === "/"
    ? "/"
    : import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <CommerceProvider>
        <App />
      </CommerceProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
