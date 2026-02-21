export function internalErrorBody() {
  return { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' };
}

export function validationFailedBody(issues) {
  return { code: 'VALIDATION_FAILED', issues };
}
