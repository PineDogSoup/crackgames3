import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../styles/global.css";
import "./manage.css";
import { ManagerApp } from "./ManagerApp";

const rootElement = document.getElementById("manager-root");
if (!rootElement) throw new Error("Manager root element was not found");

createRoot(rootElement).render(
  <StrictMode>
    <ManagerApp />
  </StrictMode>
);
