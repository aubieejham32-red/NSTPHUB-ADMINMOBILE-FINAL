/*
|--------------------------------------------------------------------------
| NSTP HUB Admin Mobile API Configuration
|--------------------------------------------------------------------------
*/

export const SERVER_URL =
  process.env.EXPO_PUBLIC_NSTPHUB_SERVER_URL ||
  'http://192.168.1.38:8000';

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

  FORGOT_PASSWORD:
    `${ADMIN_MOBILE_API_URL}/forgot-password`,

  VERIFY_FORGOT_PASSWORD_CODE:
    `${ADMIN_MOBILE_API_URL}/forgot-password/verify-code`,

  RESEND_FORGOT_PASSWORD_CODE:
    `${ADMIN_MOBILE_API_URL}/forgot-password/resend-code`,

  RESET_FORGOT_PASSWORD:
    `${ADMIN_MOBILE_API_URL}/forgot-password/reset`,

  ATTENDANCE:
    `${ADMIN_MOBILE_API_URL}/attendance`,

  ATTENDANCE_SCHEDULE:
    `${ADMIN_MOBILE_API_URL}/attendance/schedule`,

  ATTENDANCE_SCAN:
    `${ADMIN_MOBILE_API_URL}/attendance/scan`,

  EXCUSE_LETTERS:
    `${ADMIN_MOBILE_API_URL}/excuse-letters`,

  PROFILE:
    `${ADMIN_MOBILE_API_URL}/profile`,

  PROFILE_PHOTO:
    `${ADMIN_MOBILE_API_URL}/profile/photo`,

  CHANGE_PASSWORD:
    `${ADMIN_MOBILE_API_URL}/change-password`,
};
