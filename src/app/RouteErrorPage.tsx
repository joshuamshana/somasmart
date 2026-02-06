import React from "react";
import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

export function RouteErrorPage() {
  const error = useRouteError();

  const details = (() => {
    if (isRouteErrorResponse(error)) {
      return {
        title: `${error.status} ${error.statusText}`,
        message: typeof error.data === "string" ? error.data : "A routing error occurred."
      };
    }
    if (error instanceof Error) {
      return { title: "Unexpected error", message: error.message };
    }
    return { title: "Unexpected error", message: "Something went wrong." };
  })();

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Card title={details.title}>
        <div className="text-sm text-muted">{details.message}</div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Link to="/">
            <Button variant="secondary">Go home</Button>
          </Link>
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>

        <details className="mt-4 rounded-lg border border-border bg-surface p-3">
          <summary className="cursor-pointer text-sm text-text">Error details</summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-muted">
            {(() => {
              if (isRouteErrorResponse(error)) {
                return JSON.stringify(
                  { status: error.status, statusText: error.statusText, data: error.data },
                  null,
                  2
                );
              }
              if (error instanceof Error) {
                return error.stack || error.message;
              }
              return JSON.stringify(error, null, 2);
            })()}
          </pre>
        </details>
      </Card>
    </div>
  );
}

