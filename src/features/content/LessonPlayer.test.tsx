import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LessonAsset, LessonBlock } from "@/shared/types";
import { LessonPlayer } from "@/features/content/LessonPlayer";

const assets = new Map<string, LessonAsset>();

vi.mock("@/shared/db/db", () => ({
  db: {
    lessonAssets: {
      get: vi.fn(async (id: string) => assets.get(id) ?? null)
    }
  }
}));

vi.mock("@/shared/content/assetUrl", () => ({
  useAssetObjectUrl: (assetId: string | null) => (assetId ? `blob:${assetId}` : null)
}));

vi.mock("@/features/content/PdfViewer", () => ({
  PdfViewer: () => <div data-testid="pdf-viewer">PDF viewer</div>
}));

vi.mock("@/features/content/PptxViewer", () => ({
  PptxViewer: () => <div data-testid="pptx-viewer">PPTX viewer</div>
}));

describe("LessonPlayer", () => {
  beforeEach(() => {
    assets.clear();
    assets.set("asset_img", {
      id: "asset_img",
      lessonId: "lesson_1",
      kind: "image",
      mime: "image/png",
      name: "photo.png",
      blob: new Blob(["img"]),
      createdAt: new Date().toISOString()
    });
    assets.set("asset_audio", {
      id: "asset_audio",
      lessonId: "lesson_1",
      kind: "audio",
      mime: "audio/mpeg",
      name: "sound.mp3",
      blob: new Blob(["audio"]),
      createdAt: new Date().toISOString()
    });
    assets.set("asset_video", {
      id: "asset_video",
      lessonId: "lesson_1",
      kind: "video",
      mime: "video/webm",
      name: "clip.webm",
      blob: new Blob(["video"]),
      createdAt: new Date().toISOString()
    });
    assets.set("asset_pdf", {
      id: "asset_pdf",
      lessonId: "lesson_1",
      kind: "pdf",
      mime: "application/pdf",
      name: "doc.pdf",
      blob: new Blob(["pdf"]),
      createdAt: new Date().toISOString()
    });
    assets.set("asset_pptx", {
      id: "asset_pptx",
      lessonId: "lesson_1",
      kind: "pptx",
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      name: "slides.pptx",
      blob: new Blob(["pptx"]),
      createdAt: new Date().toISOString()
    });
  });

  it("renders text + image + audio + video + pdf + pptx blocks", async () => {
    const blocks: LessonBlock[] = [
      { id: "b_text", type: "text", variant: "body", text: "Lesson text content" },
      { id: "b_img", type: "image", assetId: "asset_img", mime: "image/png", name: "photo.png" },
      { id: "b_audio", type: "audio", assetId: "asset_audio", mime: "audio/mpeg", name: "sound.mp3" },
      { id: "b_video", type: "video", assetId: "asset_video", mime: "video/webm", name: "clip.webm" },
      { id: "b_pdf", type: "pdf", assetId: "asset_pdf", mime: "application/pdf", name: "doc.pdf" },
      {
        id: "b_pptx",
        type: "pptx",
        assetId: "asset_pptx",
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        name: "slides.pptx"
      }
    ];

    const { container } = render(<LessonPlayer blocks={blocks} />);

    expect(screen.getByText("Lesson text content")).toBeInTheDocument();
    expect(await screen.findByRole("img")).toBeInTheDocument();
    expect(container.querySelector("audio")).toBeTruthy();
    expect(container.querySelector("video")).toBeTruthy();
    expect(await screen.findByTestId("pdf-viewer")).toBeInTheDocument();
    expect(await screen.findByTestId("pptx-viewer")).toBeInTheDocument();
  });
});
