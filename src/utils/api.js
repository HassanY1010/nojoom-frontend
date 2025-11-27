// public/js/api.js أو src/utils/api.js

/**
 * دالة للتعامل مع الطلبات المحمية مع تجديد تلقائي للتوكن
 */
async function makeAuthRequest(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  
  // إضافة التوكن للـ headers
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
    'Refresh-Token': refreshToken
  };
  
  try {
    const response = await fetch(url, options);
    
    // إذا انتهت صلاحية التوكن، حاول تجديده
    if (response.status === 401) {
      const newAccessToken = response.headers.get('New-Access-Token');
      const newRefreshToken = response.headers.get('New-Refresh-Token');
      
      if (newAccessToken && newRefreshToken) {
        // حفظ التوكنات الجديدة
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // إعادة المحاولة مع التوكن الجديد
        options.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return await fetch(url, options);
      } else {
        // إذا لم يكن هناك توكنات جديدة، حاول تجديدها يدويًا
        const refreshResponse = await fetch('/api/tokens/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Refresh-Token': refreshToken
          }
        });
        
        if (refreshResponse.ok) {
          const { data } = await refreshResponse.json();
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          
          // إعادة المحاولة مع التوكن الجديد
          options.headers['Authorization'] = `Bearer ${data.accessToken}`;
          return await fetch(url, options);
        } else {
          // إذا فشل التجديد، أعد توجيه المستخدم لصفحة Login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Session expired - please login again');
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('Auth request failed:', error);
    throw error;
  }
}

/**
 * دالة مساعدة للطلبات العادية (GET)
 */
async function authGet(url, options = {}) {
  return makeAuthRequest(url, { ...options, method: 'GET' });
}

/**
 * دالة مساعدة للطلبات (POST)
 */
async function authPost(url, data = {}, options = {}) {
  return makeAuthRequest(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data)
  });
}

/**
 * دالة مساعدة للطلبات (PUT)
 */
async function authPut(url, data = {}, options = {}) {
  return makeAuthRequest(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data)
  });
}

/**
 * دالة مساعدة للطلبات (DELETE)
 */
async function authDelete(url, options = {}) {
  return makeAuthRequest(url, { ...options, method: 'DELETE' });
}

/**
 * التحقق من صحة التوكن
 */
async function validateToken() {
  try {
    const response = await makeAuthRequest('/api/tokens/validate');
    return await response.json();
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * تسجيل الدخول وحفظ التوكنات
 */
async function loginUser(credentials) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const { data } = await response.json();
    
    // حفظ التوكنات في localStorage
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * تسجيل الخروج وإزالة التوكنات
 */
function logoutUser() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

/**
 * التحقق مما إذا كان المستخدم مسجلاً الدخول
 */
function isLoggedIn() {
  const token = localStorage.getItem('accessToken');
  const user = localStorage.getItem('user');
  return !!(token && user);
}

/**
 * الحصول على بيانات المستخدم من localStorage
 */
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

/**
 * تحديث بيانات المستخدم في localStorage
 */
function updateUserData(userData) {
  try {
    const currentUser = getCurrentUser();
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  } catch (error) {
    console.error('Error updating user data:', error);
    return null;
  }
}

/**
 * دالة للتحقق من صلاحية التوكن قبل إجراء طلب مهم
 */
async function ensureValidToken() {
  try {
    const validation = await validateToken();
    if (!validation.valid) {
      throw new Error('Token is invalid');
    }
    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    logoutUser();
    return false;
  }
}

/**
 * interceptor للطلبات - يحقن التوكن تلقائياً
 */
function setupAuthInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options = {}) {
    // إذا كان الطلب لـ API محمية، أضف التوكن
    if (url.startsWith('/api/') && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Refresh-Token': refreshToken
        };
      }
    }
    
    const response = await originalFetch(url, options);
    
    // معالجة انتهاء صلاحية التوكن
    if (response.status === 401 && url.startsWith('/api/')) {
      const newAccessToken = response.headers.get('New-Access-Token');
      const newRefreshToken = response.headers.get('New-Refresh-Token');
      
      if (newAccessToken && newRefreshToken) {
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // إعادة الطلب الأصلي مع التوكن الجديد
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`,
          'Refresh-Token': newRefreshToken
        };
        
        return originalFetch(url, options);
      }
    }
    
    return response;
  };
}

/**
 * تهيئة نظام المصادقة
 */
function initAuthSystem() {
  setupAuthInterceptor();
  
  // التحقق من صلاحية التوكن عند تحميل الصفحة
  if (isLoggedIn()) {
    validateToken().then(result => {
      if (!result.valid) {
        console.log('Token expired, redirecting to login...');
        logoutUser();
      }
    });
  }
  
  // إضافة event listener للخروج
  const logoutButtons = document.querySelectorAll('[data-logout]');
  logoutButtons.forEach(button => {
    button.addEventListener('click', logoutUser);
  });
}

// جعل الدوال متاحة globally
if (typeof window !== 'undefined') {
  window.makeAuthRequest = makeAuthRequest;
  window.authGet = authGet;
  window.authPost = authPost;
  window.authPut = authPut;
  window.authDelete = authDelete;
  window.validateToken = validateToken;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.isLoggedIn = isLoggedIn;
  window.getCurrentUser = getCurrentUser;
  window.updateUserData = updateUserData;
  window.ensureValidToken = ensureValidToken;
  window.setupAuthInterceptor = setupAuthInterceptor;
  window.initAuthSystem = initAuthSystem;
  
  // التصدير للاستخدام في modules
  window.AuthAPI = {
    makeAuthRequest,
    authGet,
    authPost,
    authPut,
    authDelete,
    validateToken,
    loginUser,
    logoutUser,
    isLoggedIn,
    getCurrentUser,
    updateUserData,
    ensureValidToken,
    setupAuthInterceptor,
    initAuthSystem
  };
}

// إذا كنت تستخدم modules
export {
  makeAuthRequest,
  authGet,
  authPost,
  authPut,
  authDelete,
  validateToken,
  loginUser,
  logoutUser,
  isLoggedIn,
  getCurrentUser,
  updateUserData,
  ensureValidToken,
  setupAuthInterceptor,
  initAuthSystem
};

export default {
  makeAuthRequest,
  authGet,
  authPost,
  authPut,
  authDelete,
  validateToken,
  loginUser,
  logoutUser,
  isLoggedIn,
  getCurrentUser,
  updateUserData,
  ensureValidToken,
  setupAuthInterceptor,
  initAuthSystem
};