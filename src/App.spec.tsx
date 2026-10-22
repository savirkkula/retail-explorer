//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VisualTheme } from "@microsoft/fabric-visuals-core";
import App from "@/App";
import { ThemeContext } from "@/hooks/theme.context";

vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: () => ({ data: undefined, isLoading: true, error: undefined, refetch: async () => undefined }),
}));

function renderApp() {
    return render(
        <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => undefined, theme: {} as VisualTheme }}>
            <App />
        </ThemeContext.Provider>,
    );
}

describe("App", () => {
    it("renders the shell while data is loading", () => {
        renderApp();
        expect(screen.getByRole("heading", { name: "Retail Explorer" })).toBeInTheDocument();
        expect(screen.getByText("Loading floor plans…")).toBeInTheDocument();
    });

    it("labels the demo data and offers the period selector", () => {
        renderApp();
        expect(screen.getByText("Demo data")).toBeInTheDocument();
        expect(screen.getByLabelText("Period")).toHaveValue("ltm");
    });
});
