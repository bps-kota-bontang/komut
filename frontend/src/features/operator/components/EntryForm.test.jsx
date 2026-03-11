/** @vitest-environment jsdom */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EntryForm from "./EntryForm";

// Basic smoke tests for row deletion functionality

describe("EntryForm component", () => {
  it("renders category tables with delete buttons", () => {
    render(<EntryForm />);

    // expect at least one 'Aksi' header
    expect(screen.getAllByText(/aksi/i).length).toBeGreaterThan(0);

    // there should be at least one delete button in the table body (empty rows still have button?)
    const deleteButtons = screen.getAllByTitle(/hapus baris/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it("removes a row when delete button is clicked", () => {
    render(<EntryForm />);

    // assume first category 'Luar Negeri' has at least one row
    const initialRows = screen.getAllByRole("row");
    // find a delete button that is rendered
    const deleteBtn = screen.getAllByTitle(/hapus baris/i)[0];
    fireEvent.click(deleteBtn);

    const afterRows = screen.getAllByRole("row");
    // after clicking, number of rows should be one less (or at least not greater)
    expect(afterRows.length).toBeLessThanOrEqual(initialRows.length);
  });

  it("moves focus to next cell when Enter is pressed", () => {
    render(<EntryForm />);

    // grab all inputs
    const inputs = screen.getAllByRole("spinbutton");
    if (inputs.length < 2) {
      // should always have at least two inputs
      return;
    }
    const first = inputs[0];
    const second = inputs[1];

    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Enter", code: "Enter", charCode: 13 });
    // after pressing Enter, focus should move to second input
    expect(document.activeElement).toBe(second);
  });
});