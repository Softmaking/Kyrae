"""Only stable content-free errors may cross the sandbox or logging boundary."""


class WorkerError(Exception):
    def __init__(self, code="ATTACHMENT_PROCESSING_FAILED", *, transient=False):
        super().__init__(code)
        self.code = code
        self.transient = transient


class LeaseLost(WorkerError):
    def __init__(self):
        super().__init__("ATTACHMENT_ACCESS_REVOKED")


MESSAGES = {
    "ATTACHMENT_ACCESS_REVOKED": "Attachment processing access is no longer available.",
    "ATTACHMENT_ORIGINAL_UNAVAILABLE": "The stored original could not be verified.",
    "ATTACHMENT_STORAGE_UNAVAILABLE": "Private storage is temporarily unavailable.",
    "ATTACHMENT_UNSUPPORTED_CONTENT": "This content cannot be processed in the selected category.",
    "ATTACHMENT_CORRUPT": "The document could not be parsed safely.",
    "ATTACHMENT_PASSWORD_PROTECTED": "Password-protected content cannot be processed.",
    "ATTACHMENT_DECODING_FAILED": "Text must use UTF-8 or BOM-marked UTF-16 without binary content.",
    "ATTACHMENT_EMPTY_CONTENT": "No usable content could be extracted.",
    "ATTACHMENT_OCR_FAILED": "The scanned region could not be read.",
    "ATTACHMENT_CONVERSION_FAILED": "The image could not be normalized.",
    "ATTACHMENT_CODEC_UNAVAILABLE": "The required image decoder is unavailable.",
    "ATTACHMENT_PROCESSING_LIMIT": "A processing resource limit was reached; the original is retained.",
    "ATTACHMENT_PROCESSING_TIMEOUT": "The processing deadline was reached; the original is retained.",
    "ATTACHMENT_PROCESSING_FAILED": "Attachment processing failed; the original is retained.",
}
