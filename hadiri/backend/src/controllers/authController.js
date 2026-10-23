import { authService } from '../services/authService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, result, 'auth.login_success');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const result = await authService.getProfile(req.user.id, req.user);
    return sendSuccess(res, result, 'auth.profile_loaded');
  } catch (error) {
    next(error);
  }
};

