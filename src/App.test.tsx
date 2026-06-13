import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";
import { ThemeProvider } from "./providers/theme-provider";

describe("App shell", () => {
  it("üst bar, içerik ve alt durum çubuğunu render eder", () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );
    // Üst bar kontrolleri (erişilebilir etiketlerle benzersiz)
    expect(screen.getByRole("button", { name: "Tema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ayarlar" })).toBeInTheDocument();
    // Alt durum çubuğu
    expect(screen.getByText("Güncel")).toBeInTheDocument();
  });
});
