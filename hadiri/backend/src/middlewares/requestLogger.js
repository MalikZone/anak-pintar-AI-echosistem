export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${color}${status}\x1b[0m - ${duration}ms`
    );
  });
  next();
};

