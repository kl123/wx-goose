<template>
  <view class="container">
    <!-- Logo区域 -->
    <image class="logo" src="/static/logo.png" mode="aspectFit" />

    <!-- 登录方式切换 -->
    <view class="login-type">
      <text 
        :class="['type-item', !showCodeLogin && 'active']"
        @click="showCodeLogin = false"
      >密码登录</text>
      <text 
        :class="['type-item', showCodeLogin && 'active']"
        @click="showCodeLogin = true"
      >验证码登录</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-container">
      <input 
        
        class="input" 
        v-model="form.phone" 
        :placeholder="showCodeLogin ? '请输入手机号' : '请输入手机号或用户名'" 
        type="number"
        maxlength="11"
      />

      <!-- 密码输入（仅密码登录时显示） -->
      <input 
        v-if="!showCodeLogin"
        class="input" 
        v-model="form.password" 
        placeholder="请输入密码" 
        password
        maxlength="20"
      />

      <!-- 验证码输入（仅验证码登录时显示） -->
      <view v-else class="code-row">
        <input
          class="input code-input"
          v-model="form.CAPTCHA"
          placeholder="请输入验证码"
          maxlength="6"
        />
        <button 
          class="code-btn" 
          hover-class="button-hover"
          @tap.stop="handleSendCode"
          :style="{color: countdown > 0 ? '#999' : '#007aff'}"
        >{{ codeBtnText }}</button>
      </view>
      
      <button 
        class="login-btn" 
        :disabled="!canLogin" 
        @click="handleLogin"
      >{{ showCodeLogin ? '立即登录' : '登录' }}</button>
    </view>

    <!-- 微信快捷登录 -->
    <view class="wechat-login">
      <text class="divider">快捷登录</text>
      <button class="wechat-btn" @click="handleWechatQuickLogin">
        <image class="wechat-icon" src="/static/wechat-icon.png" />
        <text>微信一键登录</text>
      </button>
    </view>

    <!-- 底部协议 -->
    <view class="agreement">
      <text>登录即代表同意</text>
      <text class="link">《用户协议》</text>
      <text class="link">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { sendSmsAPI, smsLoginAPI, pwdLoginAPI } from '@/services/login'
import { http } from '../../utils/http'
import { useUserStore } from '../../stores/user';

const userStore = useUserStore();

const form = ref({
  phone: '',
  password: '',
  username: '',
  CAPTCHA: ''
})

// 登录方式切换
const showCodeLogin = ref(false)
const countdown = ref(0)
const codeBtnText = computed(() => countdown.value > 0 
  ? `${countdown.value}s后重发` 
  : '获取验证码'
)

// 登录按钮状态
const canLogin = computed(() => {
  const validPhone = form.value.phone.length >= 6
  if (showCodeLogin.value) {
    return validPhone && form.value.CAPTCHA.length === 6
  }
  return validPhone && form.value.password.length >= 6
})

// 发送验证码
const handleSendCode = async () => {
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  }
  
  try {
    await sendSmsAPI(form.value.phone)
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch (error) {
    uni.showToast({ title: error.message, icon: 'none' })
  }
}

// 普通登录
const handleLogin = async () => {
  form.value.username = form.value.phone
  console.log(form.value)
  try {
    const res = showCodeLogin.value 
      ? await smsLoginAPI(form.value.phone, form.value.CAPTCHA)
      : await pwdLoginAPI(form.value.phone, form.value.password, form.value.username)
    
    console.log(res)   
    if (res.code === 1) {
      uni.setStorageSync('token', res.data)
      userStore.token = res.data
      uni.switchTab({ url: '/pages/index/index' })
    }
  } catch (error) {
    uni.showToast({ title: error.message, icon: 'none' })
  }
}

// 微信快捷登录
const handleWechatQuickLogin = async () => {
  try {
    // 获取微信code
    const [err, loginRes] = await uni.login({ provider: 'weixin' })
    if (err) throw new Error('微信登录失败')

    // 获取用户信息
    const [userErr, userRes] = await uni.getUserProfile({
      desc: '用于完善会员资料'
    })
    if (userErr) throw new Error('获取用户信息失败')

    // 调用第三方微信登录接口
    const res = await http.post('/third-party/wechat-login', {
      code: loginRes.code,
      userInfo: userRes
    })

    if (res.data.code === 200) {
      uni.setStorageSync('token', res.data.token)
      uni.switchTab({ url: '/pages/home' })
    }
  } catch (error) {
    uni.showToast({ title: error.message, icon: 'none' })
  }
}
</script>

<style scoped>
.container {
  padding: 40rpx 60rpx;
  min-height: 100vh;
  background: #fff;
}

.logo {
  width: 180rpx;
  height: 180rpx;
  margin: 80rpx auto;
  display: block;
}

.login-type {
  display: flex;
  justify-content: center;
  margin-bottom: 60rpx;
}

.type-item {
  margin: 0 40rpx;
  font-size: 34rpx;
  color: #999;
  position: relative;
  padding-bottom: 10rpx;
}

.type-item.active {
  color: #333;
  font-weight: bold;
}

.type-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 6rpx;
  background: #007aff;
  border-radius: 3rpx;
}

.input {
  height: 100rpx;
  padding: 0 20rpx;
  font-size: 32rpx;
}

.code-row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #eee; /* 统一底部边框 */
}

.code-input {
  flex: 1;
  border-bottom: none !important;
}

.code-btn {
  flex-shrink: 0;
  height: 60rpx;
  line-height: 60rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: none;
  margin-left: 20rpx;
  border-left: 1rpx solid #eee;
  border-radius: 0;
}
.code-btn::after {
  border: none !important;
}

.button-hover {
  opacity: 0.6;
}

.login-btn {
  margin-top: 60rpx;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 45rpx;
  background: #007aff;
  color: #fff;
  font-size: 34rpx;
}

.login-btn[disabled] {
  background: #ccc;
}

.wechat-login {
  margin-top: 100rpx;
  text-align: center;
}

.divider {
  color: #999;
  font-size: 28rpx;
  position: relative;
  display: block;
  margin-bottom: 60rpx;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 120rpx;
  height: 1rpx;
  background: #eee;
}

.divider::before {
  left: -140rpx;
}

.divider::after {
  right: -140rpx;
}

.wechat-btn {
  background: #07c160;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 45rpx;
  color: #fff;
  font-size: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wechat-icon {
  width: 50rpx;
  height: 50rpx;
  margin-right: 20rpx;
}

.agreement {
  position: fixed;
  bottom: 40rpx;
  width: 100%;
  text-align: center;
  font-size: 24rpx;
  color: #999;
  left: 0;
}

.link {
  color: #007aff;
  margin: 0 10rpx;
}
</style>