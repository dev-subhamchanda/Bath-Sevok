import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { DataProviderContextProvider } from "@/app/providers/DataProviderContext";
import { router } from "@/app/router";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProviderContextProvider>
        <RouterProvider router={router} />
      </DataProviderContextProvider>
    </QueryClientProvider>
  );
}

export default App;
