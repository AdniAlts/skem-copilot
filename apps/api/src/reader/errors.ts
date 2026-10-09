/** Reader errors that are permanent for a given uploaded document. */
export class InvalidDocumentError extends Error {
  constructor(message = 'PDF tidak dapat dibaca.') {
    super(message);
    this.name = 'InvalidDocumentError';
  }
}
