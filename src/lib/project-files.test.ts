import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECT_FILE_MAX_BYTES,
  createProjectFileKey,
  formatFileSize,
  isProjectFileKey,
  validateProjectFileUpload,
} from "./project-files";

const projectId = "proj_123";
const fileId = "file_abcdefghijklmnop";

describe("project file uploads", () => {
  it("accepts an allowlisted file within 25 MB", () => {
    assert.equal(
      validateProjectFileUpload({
        name: "spec.pdf",
        size: 1024,
        mimeType: "application/pdf",
      }),
      null,
    );
    assert.equal(
      validateProjectFileUpload({
        name: "photo.png",
        size: PROJECT_FILE_MAX_BYTES,
        mimeType: "image/png",
      }),
      null,
    );
  });

  it("rejects oversized, empty, unnamed, or disallowed types", () => {
    assert.equal(
      validateProjectFileUpload({
        name: "big.pdf",
        size: PROJECT_FILE_MAX_BYTES + 1,
        mimeType: "application/pdf",
      }),
      "Files must be 25 MB or smaller.",
    );
    assert.equal(
      validateProjectFileUpload({
        name: "notes.exe",
        size: 1024,
        mimeType: "application/x-msdownload",
      }),
      "That file type is not allowed.",
    );
    assert.equal(
      validateProjectFileUpload({ name: " ", size: 1024, mimeType: "text/plain" }),
      "Enter a file name.",
    );
    assert.equal(
      validateProjectFileUpload({ name: "empty.txt", size: 0, mimeType: "text/plain" }),
      "Choose a file to upload.",
    );
  });

  it("builds and checks keys only for that project", () => {
    const key = createProjectFileKey(projectId, fileId, "application/pdf");
    assert.equal(key, "projects/proj_123/file_abcdefghijklmnop.pdf");
    assert.equal(isProjectFileKey(projectId, key ?? ""), true);
    assert.equal(isProjectFileKey("other", key ?? ""), false);
    assert.equal(isProjectFileKey(projectId, "projects/proj_123/../secret.pdf"), false);
  });

  it("formats byte sizes for the list UI", () => {
    assert.equal(formatFileSize(500), "500 B");
    assert.equal(formatFileSize(2048), "2.0 KB");
    assert.equal(formatFileSize(5 * 1024 * 1024), "5.0 MB");
  });
});
