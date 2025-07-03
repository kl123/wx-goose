import { http } from "../utils/http"

/**
 * 发送短信验证码（通过第三方平台）
 * @param {string} phone - 手机号
 * @returns {Promise}
 */
export const sendSmsAPI = (phone) => {
  return http({
    method: "GET",
    url: "/sms/sendcode", 
    data: {
      phone: phone,
      
    }
  })
}

/**
 * 验证码登录
 * @param {*} phone 手机号
 * @param {*} CAPTCHA 验证码
 * @returns 
 */
export const smsLoginAPI = (phone, CAPTCHA) => {
  return http({
    method: "POST",
    url: "/login/loginByPhone", // 第三方验证接口
    data: {
      phone: phone,
      CAPTCHA: CAPTCHA,
      
    }
  })
}

/**
 * 密码登录（通过第三方验证）
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise}
 */
export const pwdLoginAPI = (phone, password, username) => {
  return http({
    method: "POST",
    url: "/login",
    data: {
      phone: phone,
      password: password,
      username: username
    }
  })
}

export const wechatLoginAPI = (code, userInfo) => {
    return http({
      method: 'POST',
      url: '/third-party/wechat-login',
      data: {
        code,
        nickname: userInfo.nickName,
        avatar: userInfo.avatarUrl
      }
    })
  }
  