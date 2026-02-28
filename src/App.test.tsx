import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the 3-panel layout", () => {
    render(<App />);
    expect(screen.getByText("YAD")).toBeInTheDocument();
  });
});
