export function errorHandler(err:any, _req:any, res:any, _next:any) {
    const status = err.status || 500;
    // Log error for debugging
    console.error("[ERROR]", {
      status,
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      code: err.code,
      meta: err.meta,
      error: err
    });
    
    // Return error in consistent format.
    // Only expose err.message for expected client errors (status < 500);
    // never leak internal error details (Prisma, stack info, etc.) to the client.
    const isClientError = typeof err.status === "number" && err.status < 500;
    const clientMessage = isClientError && err.message
      ? err.message
      : "サーバーでエラーが発生しました。時間をおいて再度お試しください。";
    res.status(isClientError ? status : 500).json({
      success: false,
      error: clientMessage,
      message: clientMessage
    });
  }
  