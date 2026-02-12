/**
 * Placeholder adapter for Helia-backed blob storage.
 *
 * v1 uses manifest-first + lazy byte fetch contracts. This adapter shape is ready
 * for wiring Helia node APIs without changing route contracts.
 */
export interface BlobStorageAdapter {
  putBlob(input: { projectId: string; cid: string; bytes: Uint8Array; mime: string }): Promise<void>;
  getBlob(projectId: string, cid: string): Promise<Uint8Array | null>;
  hasBlob(projectId: string, cid: string): Promise<boolean>;
}

export class InMemoryBlobStorageAdapter implements BlobStorageAdapter {
  private readonly blobs = new Map<string, Uint8Array>();

  private key(projectId: string, cid: string) {
    return `${projectId}:${cid}`;
  }

  async putBlob(input: { projectId: string; cid: string; bytes: Uint8Array }) {
    this.blobs.set(this.key(input.projectId, input.cid), input.bytes);
  }

  async getBlob(projectId: string, cid: string) {
    return this.blobs.get(this.key(projectId, cid)) ?? null;
  }

  async hasBlob(projectId: string, cid: string) {
    return this.blobs.has(this.key(projectId, cid));
  }
}
