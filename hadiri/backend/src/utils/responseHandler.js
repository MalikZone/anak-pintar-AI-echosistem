export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null, params = {}) => {
  const req = res.req;
  const finalMessage = req?.t ? req.t(message, params) : message;
  const response = {
    success: true,
    message: finalMessage,
    data,
  };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null, params = {}) => {
  const req = res.req;
  const finalMessage = req?.t ? req.t(message, params) : message;
  const response = {
    success: false,
    message: finalMessage,
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

