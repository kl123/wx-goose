import { http } from "../utils/http"

/**
 * 发送短信验证码（通过第三方平台）
 * @param {string} phone - 手机号
 * @returns {Promise}
 */
export const sendSmsAPI = (phone) => {
  return http({
    method: "POST",
    url: "/third-party/send-sms", // 第三方短信接口
    data: {
      mobile: phone,
      appKey: "YOUR_THIRD_PARTY_APP_KEY", // 从第三方平台获取
      sign: "GENERATED_SIGNATURE"        // 根据第三方要求生成签名
    }
  })
}

/**
 * 短信验证码登录（第三方验证）
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {Promise}
 */
export const smsLoginAPI = (phone, code) => {
  return http({
    method: "POST",
    url: "/third-party/sms-login", // 第三方验证接口
    data: {
      mobile: phone,
      smsCode: code,
      appKey: "YOUR_THIRD_PARTY_APP_KEY"
    }
  })
}

/**
 * 密码登录（通过第三方验证）
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise}
 */
export const pwdLoginAPI = (phone, password) => {
  return http({
    method: "POST",
    url: "/third-party/password-login",
    data: {
      mobile: phone,
      password: password,
      appKey: "YOUR_THIRD_PARTY_APP_KEY"
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
  