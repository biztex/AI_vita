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
    
    // Return error in consistent format
    res.status(status).json({ 
      success: false,
      error: err.message || "サーバー内部でエラーが発生しました",
      message: err.message || "サーバー内部でエラーが発生しました"
    });
  }
  