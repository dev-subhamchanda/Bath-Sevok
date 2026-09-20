import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { DataProviderContextProvider } from "@/app/providers/DataProviderContext";
import { router } from "@/app/router";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DataProviderContextProvider>
          <RouterProvider router={router} />
        </DataProviderContextProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
