import { t } from '../utils/i18n.js';

/**
 * Language Middleware
 * Detects the client's preferred language from Accept-Language header or query parameter,
 * and attaches `req.lang` ('id' | 'en') and `req.t(key, params)` helper to the request object.
 */
export const langMiddleware = (req, res, next) => {
  const queryLang = req.query?.lang;
  const headerLang = req.headers['accept-language'] || '';

  let lang = 'id';
  if (queryLang && (queryLang.toLowerCase().startsWith('en') || queryLang.toLowerCase() === 'en')) {
    lang = 'en';
  } else if (headerLang.toLowerCase().startsWith('en')) {
    lang = 'en';
  }

  req.lang = lang;
  req.t = (keyOrMessage, params = {}) => t(keyOrMessage, lang, params);

  next();
};

export default langMiddleware;

