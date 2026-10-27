import * as authService from './auth.service.js';
import { env } from '../../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth',
};

export const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body, req);
    res.status(201).json({
      success: true,
      data: {
        user,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(
      {
        email: req.body.email,
        password: req.body.password,
        ipAddress,
        userAgent,
      },
      req
    );

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.rotateRefreshToken(
      rawRefreshToken,
      { ipAddress, userAgent },
      req
    );

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(req.user?._id, rawRefreshToken, req);

    res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, path: '/api/v1/auth' });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

