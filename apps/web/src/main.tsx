import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const queryClient = new QueryClient();
const theme = createTheme({
  palette: { mode: "light", primary: { main: "#176b61" } },
});

function App() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Geofencing Alert System</h1>
      <p>
        Dashboard setup is ready. API health:{" "}
        <a href="http://localhost:3000/health">localhost:3000/health</a>
      </p>
      <p>
        Test PostGIS connection:{" "}
        <a href="http://localhost:3000/test-postgis">localhost:3000/test-postgis</a>
      </p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
