function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    console.error(error);
  }

  if (error.retryAfter) {
    res.set("Retry-After", String(error.retryAfter));
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : error.message,
    ...(error.data && { data: error.data }),
    ...(error.retryAfter && { retryAfter: error.retryAfter }),
    timestamp: new Date().toISOString(),
  });
}

module.exports = errorMiddleware;
