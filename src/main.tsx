import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import HelpPage from "./HelpPage.tsx";

const isHelpRoute = window.location.pathname === "/help";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {isHelpRoute ? <HelpPage /> : <App />}
    </StrictMode>
);
