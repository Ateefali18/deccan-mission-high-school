from fastapi import HTTPException, status

class DMHSException(HTTPException):
    def __init__(self, status_code: int, detail: str, error_code: str = "ERROR"):
        super().__init__(status_code=status_code, detail={"message": detail, "code": error_code})

class AuthenticationException(DMHSException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTHENTICATION_FAILED"
        )

class PermissionDeniedException(DMHSException):
    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="PERMISSION_DENIED"
        )

class ResourceNotFoundException(DMHSException):
    def __init__(self, detail: str = "Requested resource was not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND"
        )

class ConflictException(DMHSException):
    def __init__(self, detail: str = "Resource conflict detected"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT"
        )
