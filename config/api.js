/*
|--------------------------------------------------------------------------
| NSTP HUB Admin Mobile API Configuration
|--------------------------------------------------------------------------
|
| Set EXPO_PUBLIC_NSTPHUB_SERVER_URL in .env when your Laravel server IP
| changes.
|
*/

export const SERVER_URL =
  process.env.EXPO_PUBLIC_NSTPHUB_SERVER_URL ||
  'http://192.168.254.158:8000';

export const API_URL = `${SERVER_URL}/api`;
export const ADMIN_MOBILE_API_URL = `${API_URL}/admin-mobile`;

export const API_ENDPOINTS = {
  VERIFY_UNIVERSITY_ACCESS_CODE:
    `${ADMIN_MOBILE_API_URL}/university/verify-access-code`,

  LOGIN:
    `${ADMIN_MOBILE_API_URL}/login`,

  GOOGLE_LOGIN:
    `${ADMIN_MOBILE_API_URL}/google-login`,

  ME:
    `${ADMIN_MOBILE_API_URL}/me`,

  DASHBOARD:
    `${ADMIN_MOBILE_API_URL}/dashboard`,

  LOGOUT:
    `${ADMIN_MOBILE_API_URL}/logout`,
};
