```vue
<template>
  <view class="container">
    <!-- 设备信息 -->
    <view class="device-info">
      <image class="device-image" src="/static/feed/喂食器皿.png" mode="aspectFit"></image>
    </view>

    <!-- 出粮控制区 -->
    <view class="feeding-control">
      <view class="remaining-food" :style="foodStatusStyle">
        <text>当前饲料区剩余: {{ foodRemaining }} 斤</text>
      </view>
      <view class="input-row">
        <text class="input-label">出粮斤数:</text>
        <input 
          class="input-box" 
          type="digit" 
          v-model="manualDispenseAmount" 
          placeholder="请输入出粮斤数（正数）"
        />
      </view>
      <text class="manual-feed-text" v-if="manualDispensed > 0">
        今日已手动出粮: {{ manualDispensed }} 斤
      </text>
    </view>

    <!-- 今日喂养计划模块 -->
    <view class="feeding-plan">
      <view class="plan-header">
        <text class="plan-title">今日喂养计划</text>
        <switch 
          class="auto-feed-switch" 
          :checked="isAutoFeedEnabled" 
          @change="toggleAutoFeed"
        />
      </view>
      <view class="timeline">
        <view 
          v-for="(time, index) in timeSlots" 
          :key="index" 
          class="timeline-item"
        >
          <text class="time-text">{{ time }}</text>
          <text class="amount-text">{{ mealAmounts[index] }} 斤</text>
          <progress 
            class="feed-progress" 
            :percent="feedProgress[index]" 
            stroke-width="4" 
            :activeColor="isFed[index] ? '#90EE90' : '#90EE90'" 
            backgroundColor="#e0e0e0"
          />
          <image 
            :src="getFeedIconSrc(index)" 
            class="feed-icon" 
            mode="aspectFit"
            @click="handleFeedIconClick(index)"
          ></image>
        </view>
      </view>
      <view class="feeding-info">
        <text>本次出粮: {{ currentFeedingTime }} {{ currentFeedingAmount }} 斤</text>
        <text>下次出粮: {{ nextFeedingTime }} {{ nextFeedingAmount }} 斤</text>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view class="action-area">
      <view class="action-button" @click="goToPlanFoodPage">
        <image class="action-icon" src="/static/feed/goose.png" mode="aspectFit"></image>
        <text class="action-text">计划出粮</text>
      </view>
      <view class="action-button" @click="outfood()" :class="{ 'disabled': isDispensing }">
        <image class="action-icon" src="/static/feed/goose.png" mode="aspectFit"></image>
        <text class="action-text">{{ isDispensing ? '出粮中...' : '立即出粮' }}</text>
      </view>
    </view>
  </view>
  <view class="back" v-if="backshow"></view>
  <canvas id="lottie_demo" :style="{ display: ifshow ? 'inline-block' : 'none' }" 
  type="2d" style="position: fixed;top: 200px;left: 100px; width: 200px; height: 150px;"></canvas>
  <view style="position: fixed;left: 140px;top: 360px;color: white;" v-if="backshow">出食中请稍后.....</view>>
</template>

<script setup>
import { ref, computed,reactive,getCurrentInstance } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { onMounted, onUnmounted } from 'vue'
import mqtt from 'mqtt/dist/mqtt.js'
import lottie from 'lottie-miniprogram';
import lottieJson from "../../static/cat.json"

// 响应式数据
const manualDispenseAmount = ref('')
const manualDispensed = ref(0)
const plannedAmount = ref(0)
const timeSlots = ref([])
const mealAmounts = ref([])
const isFed = ref([])
const fedAmounts = ref([])
const isDispensing = ref(false)
const isAutoFeedEnabled = ref(true) // 自动喂食开关，默认开启

// 初始化剩余饲料量
const storedFood = uni.getStorageSync('foodRemaining')
const foodRemaining = ref(0)

// 初始化自动喂食开关状态
const storedAutoFeed = uni.getStorageSync('isAutoFeedEnabled')
if (storedAutoFeed !== '') {
  isAutoFeedEnabled.value = storedAutoFeed === 'true'
}

// 饲料状态
const foodStatus = computed(() => {
  if (foodRemaining.value > 500) return '充足'
  if (foodRemaining.value > 200) return '正常'
  return '不足'
})

const foodStatusStyle = computed(() => {
  if (foodRemaining.value > 500) return 'color: #52c41a;'
  if (foodRemaining.value > 200) return 'color: #faad14;'
  return 'color: #f5222d;'
})

// MQTT 配置
const mqttConfig = {
  url: 'wxs://bemfa.com:9504/wss',
  options: {
    clientId: '6fc94297b1a4771e713523fd16d19702',
    keepalive: 60,
    clean: true,
    protocolVersion: 4,
  },
  topic: 'food',
  leaveNum:'leave'
}

const deviceStatus = ref('连接中...')
let client = ref(null)
let reconnectTimer = ref(null)
let pendingDispense = ref(null)
let lastMessage = ref(null)
const feedTimers = ref([]) // 存储每个时间点的定时器
let minuteCheckTimer = ref(null) // 分钟级检查定时器
let resetTimer = ref(null) // 每日重置定时器
const isConnecting = ref(false) // 防止重复初始化

// MQTT 初始化
const initMQTT = () => {
  if (isConnecting.value || (client.value && client.value.connected)) {
    console.log('MQTT 已在连接或已连接，跳过初始化')
    return
  }

  isConnecting.value = true
  disconnectMQTT() // 确保关闭现有连接

  client.value = mqtt.connect(mqttConfig.url, mqttConfig.options)

  client.value.on('connect', () => {
    deviceStatus.value = '已连接'
    console.log('✅ MQTT连接成功')
    isConnecting.value = false
    client.value.subscribe(mqttConfig.topic, { qos: 1 }, (err) => {
      if (err) {
        console.error('订阅food主题失败:', err)
        uni.showToast({ title: '订阅food主题失败', icon: 'none' })
      } else {
        console.log('订阅food主题成功')
      }
    })
    client.value.subscribe(mqttConfig.leaveNum, { qos: 1,retain: true }, (err) => {
      if (err) {
        console.error('订阅leaveNum主题失败:', err)
        uni.showToast({ title: '订阅food主题失败', icon: 'none' })
      } else {
        console.log('订阅leaveNum主题成功')
      }
    })
  })

  client.value.on('message', (topic, message) => {
    const messageStr = message.toString().trim()
    console.log(`调试: 收到MQTT消息 - 主题: ${topic}, 内容: ${messageStr}`)
    
    if (!messageStr) {
      console.error('收到空MQTT消息')
      return
    }

    try {
      const data = JSON.parse(messageStr)

      if (lastMessage.value === messageStr) {
        console.log('忽略重复消息:', messageStr)
        return
      }
      lastMessage.value = messageStr

      // 如果消息来自 leaveNum 主题
      if (topic === mqttConfig.leaveNum) {
        // 将消息内容赋值给响应式对象 leaveNumData
        console.log(data.foodNum);
        foodRemaining.value = data.foodNum*200
        console.log('收到来自 leaveNum 主题的消息:', data)
      }

      if (pendingDispense.value && data.status === 'success' && data.num === -1) {
        const { inputAmount, resolve } = pendingDispense.value
        console.log('handleDispense 收到MQTT响应:', data)
        resolve({ feedAmount: inputAmount })
        pendingDispense.value = null
      } else if (data.status === 'error') {
        console.error('硬件错误:', data.message)
        if (pendingDispense.value) {
          pendingDispense.value.reject(new Error(data.message || '硬件错误'))
          pendingDispense.value = null
        }
      }
    } catch (error) {
      console.error('解析MQTT消息失败:', error.message, '原始消息:', messageStr)
    }
  })

  client.value.on('error', (err) => {
    deviceStatus.value = '连接异常'
    console.error('MQTT错误:', err)
    isConnecting.value = false
    handleReconnect()
  })

  client.value.on('close', () => {
    deviceStatus.value = '连接断开'
    console.log('MQTT连接断开')
    isConnecting.value = false
    handleReconnect()
  })
}

const handleReconnect = () => {
  if (reconnectTimer.value || isConnecting.value) {
    console.log('重连已在进行或初始化中，跳过')
    return
  }

  reconnectTimer.value = setTimeout(() => {
    console.log('尝试重连...')
    deviceStatus.value = '尝试重连...'
    initMQTT()
    clearTimeout(reconnectTimer.value)
    reconnectTimer.value = null
  }, 10000) // 延长重连间隔到 10 秒
}

const disconnectMQTT = () => {
  if (client.value) {
    client.value.end(true, () => {
      console.log('MQTT连接已关闭')
    })
    client.value = null
  }
  if (reconnectTimer.value) {
    clearTimeout(reconnectTimer.value)
    reconnectTimer.value = null
  }
  isConnecting.value = false
}

const sendFeedCommand = async (num) => {
  console.log('进入 sendFeedCommand，num:', num)
  
  if (!client.value || !client.value.connected) {
    console.log('MQTT客户端未连接，尝试初始化')
    initMQTT()
    await new Promise(resolve => setTimeout(resolve, 2000)) // 等待连接
    if (!client.value || !client.value.connected) {
      deviceStatus.value = '未连接，无法发送'
      console.error('MQTT客户端仍未连接')
      uni.showToast({ title: '设备未连接', icon: 'none' })
      return false
    }
  }

  const payload = { num, status: 'on' }
  console.log(`准备发布MQTT消息: ${JSON.stringify(payload)}`)

  try {
    await new Promise((resolve, reject) => {
      client.value.publish(
        mqttConfig.topic,
        JSON.stringify(payload),
        { qos: 1 },
        (err) => {
          if (err) {
            console.error('发送失败:', err)
            deviceStatus.value = '发送失败'
            uni.showToast({ title: '发送指令失败', icon: 'none' })
            reject(err)
          } else {
            console.log('消息发送成功:', payload)
            deviceStatus.value = '消息已发送'
            resolve(true)
          }
        }
      )
    })
    return true
  } catch (err) {
    console.error('MQTT发布失败:', err)
    return false
  }
}

// 同步计划数据
const syncPlanData = () => {
  const savedTimes = uni.getStorageSync('timeSlots')
  const savedAmounts = uni.getStorageSync('mealAmounts')
  const plannedAmountFromStorage = uni.getStorageSync('plannedAmount')

  if (savedTimes && savedAmounts && savedTimes.length === savedAmounts.length) {
    timeSlots.value = savedTimes
    mealAmounts.value = savedAmounts.map(amount => parseInt(amount) || 0)
    isFed.value = new Array(savedTimes.length).fill(false)
    fedAmounts.value = new Array(savedTimes.length).fill(0)
  } else {
    timeSlots.value = ['00:00', '06:00', '12:00', '18:00', '24:00']
    mealAmounts.value = [0, 0, 0, 0, 0]
    isFed.value = [false, false, false, false, false]
    fedAmounts.value = [0, 0, 0, 0, 0]
  }

  if (plannedAmountFromStorage) {
    plannedAmount.value = parseInt(plannedAmountFromStorage) || 0
  }
}

// 自动喂食开关切换
const toggleAutoFeed = (e) => {
  isAutoFeedEnabled.value = e.detail.value
  uni.setStorageSync('isAutoFeedEnabled', isAutoFeedEnabled.value.toString())
  console.log('自动喂食开关状态:', isAutoFeedEnabled.value ? '开启' : '关闭')
  
  // 清理现有定时器
  feedTimers.value.forEach(timer => clearTimeout(timer))
  feedTimers.value = []
  if (minuteCheckTimer.value) {
    clearInterval(minuteCheckTimer.value)
    minuteCheckTimer.value = null
  }

  // 如果开启，重新调度
  if (isAutoFeedEnabled.value) {
    console.log('自动喂食开启，调度喂食任务')
    scheduleAutoFeed()
    startMinuteCheck()
  }
}

// 动态获取喂食图标
const getFeedIconSrc = (index) => {
  if (!isAutoFeedEnabled.value) {
    return '/static/feed/planFeed_gray.png'
  }
  return isFed.value[index] ? '/static/feed/planFeed_gray.png' : '/static/feed/planFeed.png'
}

// 自动喂食逻辑
const scheduleAutoFeed = () => {
  if (!isAutoFeedEnabled.value) {
    console.log('自动喂食已禁用，跳过调度')
    return
  }

  console.log('开始调度自动喂食，timeSlots:', timeSlots.value, 'mealAmounts:', mealAmounts.value)

  // 清理现有定时器
  feedTimers.value.forEach(timer => clearTimeout(timer))
  feedTimers.value = []

  const now = new Date()
  const currentTime = now.getTime()
  const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  timeSlots.value.forEach((time, index) => {
    if (mealAmounts.value[index] <= 0) {
      console.log(`时间点 ${time} 喂食量为 0，跳过调度`)
      return
    }
    if (isFed.value[index]) {
      console.log(`时间点 ${time} 已喂食，跳过调度`)
      return
    }

    const [hour, minute] = time.split(':').map(Number)
    const feedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute)
    let feedTimeMs = feedTime.getTime()

    // 检查是否为当前分钟
    if (feedTimeMs <= currentTime && time === currentHHMM) {
      console.log(`当前分钟 ${time} 触发喂食`)
      handleAutoFeed(index)
      return
    }

    // 若时间点已过，调度到明天
    if (feedTimeMs < currentTime) {
      feedTimeMs += 24 * 60 * 60 * 1000
      console.log(`时间点 ${time} 已过，调度到明天: ${new Date(feedTimeMs).toLocaleString()}`)
    }

    const delay = feedTimeMs - currentTime
    console.log(`为时间点 ${time} 调度喂食，延迟 ${delay / 1000} 秒`)

    const timer = setTimeout(() => {
      console.log(`定时器触发喂食: ${time}`)
      handleAutoFeed(index)
    }, delay)
    feedTimers.value.push(timer)
  })
}

const handleAutoFeed = async (index) => {
  if (!isAutoFeedEnabled.value) {
    console.log('自动喂食已禁用，取消喂食:', timeSlots.value[index])
    return
  }

  console.log(`执行自动喂食: 时间点 ${timeSlots.value[index]}, 索引 ${index}`)

  const feedAmount = mealAmounts.value[index]
  
  if (foodRemaining.value < feedAmount) {
    console.log('自动喂食饲料不足:', { feedAmount, remaining: foodRemaining.value })
    uni.showToast({ 
      title: `饲料不足 (需要:${feedAmount} 斤 剩余:${foodRemaining.value} 斤)`,
      icon: 'none'
    })
    return
  }

  try {
    console.log('发送自动喂食指令:', feedAmount / 100)
    const sent = await sendFeedCommand(feedAmount / 100)
    if (!sent) {
      throw new Error('发送指令失败')
    }

    fedAmounts.value[index] += feedAmount
    if (fedAmounts.value[index] >= mealAmounts.value[index]) {
      isFed.value[index] = true
      console.log(`时间点 ${timeSlots.value[index]} 喂食完成，标记 isFed[${index}] = true`)
    }
    
    foodRemaining.value = Math.max(foodRemaining.value - feedAmount, 0)
    
    if (!Number.isFinite(foodRemaining.value)) {
      console.error('更新后饲料量无效，重置为0')
      foodRemaining.value = 0
    }
    
    uni.setStorageSync('foodRemaining', foodRemaining.value)
    
    console.log('发送 updateFood 事件:', { used: feedAmount, remaining: foodRemaining.value })
    uni.$emit('updateFood', {
      used: feedAmount,
      remaining: foodRemaining.value
    })
    
    console.log('自动喂食成功:', { feedAmount, foodRemaining: foodRemaining.value })
    const toastMessage = foodRemaining.value < 200 
      ? `自动喂食 ${feedAmount} 斤，饲料不足，请补充！`
      : `自动喂食 ${feedAmount} 斤`
    uni.showToast({ 
      title: toastMessage,
      icon: 'success',
      duration: 1500
    })

    // 调度下一天的喂食
    const [hour, minute] = timeSlots.value[index].split(':').map(Number)
    const nextFeed = new Date()
    nextFeed.setDate(nextFeed.getDate() + 1)
    nextFeed.setHours(hour, minute, 0, 0)
    const delay = nextFeed.getTime() - new Date().getTime()
    console.log(`为时间点 ${timeSlots.value[index]} 调度下一天喂食，延迟 ${delay / 1000} 秒`)
    const timer = setTimeout(() => {
      console.log(`下一天喂食触发: ${timeSlots.value[index]}`)
      handleAutoFeed(index)
    }, delay)
    feedTimers.value[index] = timer
  } catch (error) {
    console.error('自动喂食流程错误:', error.message)
    uni.showToast({
      title: '自动喂食失败: ' + error.message,
      icon: 'none',
      duration: 2000
    })
  }
}

// 分钟级检查
const startMinuteCheck = () => {
  if (!isAutoFeedEnabled.value) {
    console.log('自动喂食已禁用，跳过分钟检查')
    return
  }

  console.log('启动分钟级检查')
  minuteCheckTimer.value = setInterval(() => {
    if (!isAutoFeedEnabled.value) {
      console.log('自动喂食已禁用，停止分钟检查')
      clearInterval(minuteCheckTimer.value)
      minuteCheckTimer.value = null
      return
    }

    const now = new Date()
    const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    console.log(`分钟检查: 当前时间 ${currentHHMM}`)

    timeSlots.value.forEach((time, index) => {
      if (time === currentHHMM && !isFed.value[index] && mealAmounts.value[index] > 0) {
        console.log(`分钟检查触发喂食: ${time}`)
        handleAutoFeed(index)
      }
    })
  }, 60000) // 每分钟检查
}

// 重置每日数据
const resetDailyData = () => {
  const today = new Date().toDateString()
  const lastReset = uni.getStorageSync('foodLastReset') || ''
  if (lastReset !== today) {
    console.log('重置每日出粮数据')
    manualDispensed.value = 0
    isFed.value = new Array(timeSlots.value.length).fill(false)
    fedAmounts.value = new Array(timeSlots.value.length).fill(0)
    uni.setStorageSync('foodLastReset', today)
    if (isAutoFeedEnabled.value) {
      console.log('自动喂食开启，重新调度喂食任务')
      scheduleAutoFeed()
    }
  }
}

// 调度每日重置
const scheduleDailyReset = () => {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const delay = tomorrow.getTime() - now.getTime()

  resetTimer.value = setTimeout(() => {
    console.log('执行每日重置')
    resetDailyData()
    scheduleDailyReset() // 调度下一个重置
  }, delay)
  console.log(`调度每日重置，延迟 ${delay / 1000} 秒`)
}

// 喂食进度
const feedProgress = computed(() => {
  return timeSlots.value.map((_, index) => {
    if (mealAmounts.value[index] === 0) return 0
    if (isFed.value[index]) return 100
    return Math.min((fedAmounts.value[index] / mealAmounts.value[index]) * 100, 100)
  })
})

// 当前喂食时间和数量
const currentFeedingTime = computed(() => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return timeSlots.value[i]
    }
  }
  return '无'
})

const currentFeedingAmount = computed(() => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return mealAmounts.value[i]
    }
  }
  return 0
})

// 下次喂食时间和数量
const nextFeedingTime = computed(() => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute
  let foundCurrent = false

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return timeSlots.value[i]
      } else {
        foundCurrent = true
      }
    }
  }
  return '无'
})

const nextFeedingAmount = computed(() => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute
  let foundCurrent = false

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return mealAmounts.value[i]
      } else {
        foundCurrent = true
      }
    }
  }
  return 0
})

const goToPlanFoodPage = () => {
  uni.navigateTo({
    url: '/pages/planFood/planFood'
  })
}

const handleFeedIconClick = async (index) => {
  if (!isAutoFeedEnabled.value) {
    console.log('自动喂食已禁用，忽略图标点击:', timeSlots.value[index])
    uni.showToast({
      title: '自动喂食已禁用',
      icon: 'none',
      duration: 1500
    })
    return
  }

  if (!isFed.value[index]) {
    const feedAmount = mealAmounts.value[index]
    
    if (foodRemaining.value < feedAmount) {
      console.log('手动定时喂食饲料不足:', { feedAmount, remaining: foodRemaining.value })
      uni.showToast({ 
        title: `饲料不足 (需要:${feedAmount} 斤 剩余:${foodRemaining.value} 斤)`,
        icon: 'none'
      })
      return
    }
    
    try {
      console.log('发送手动定时喂食指令:', feedAmount / 100)
      const sent = await sendFeedCommand(feedAmount / 100)
      if (!sent) {
        throw new Error('发送指令失败')
      }

      fedAmounts.value[index] += feedAmount
      if (fedAmounts.value[index] >= mealAmounts.value[index]) {
        isFed.value[index] = true
      }
      
      foodRemaining.value = Math.max(foodRemaining.value - feedAmount, 0)
      
      if (!Number.isFinite(foodRemaining.value)) {
        console.error('更新后饲料量无效，重置为0')
        foodRemaining.value = 0
      }
      
      uni.setStorageSync('foodRemaining', foodRemaining.value)
      
      console.log('发送 updateFood 事件:', { used: feedAmount, remaining: foodRemaining.value })
      uni.$emit('updateFood', {
        used: feedAmount,
        remaining: foodRemaining.value
      })
      
      console.log('手动定时喂食成功:', { feedAmount, foodRemaining: foodRemaining.value })
      const toastMessage = foodRemaining.value < 200 
        ? `手动定时喂食 ${feedAmount} 斤，饲料不足，请补充！`
        : `手动定时喂食 ${feedAmount} 斤`
      uni.showToast({ 
        title: toastMessage,
        icon: 'success',
        duration: 1500
      })
    } catch (error) {
      console.error('手动定时喂食流程错误:', error.message)
      uni.showToast({
        title: '手动定时喂食失败: ' + error.message,
        icon: 'none',
        duration: 2000
      })
    }
  } else {
    console.log('时间点已喂食:', index)
    uni.showToast({ 
      title: '当前时间点已喂食完成', 
      icon: 'none' 
    })
  }
}

// 生命周期
onMounted(() => {
  console.log('页面挂载，初始化 MQTT 和定时任务')
  initMQTT()
  //首次获取剩余量
  getleave()
  if (isAutoFeedEnabled.value) {
    scheduleAutoFeed()
    startMinuteCheck()
  }
  scheduleDailyReset()
})

onUnmounted(() => {
  console.log('页面卸载，清理资源')
  disconnectMQTT()
  feedTimers.value.forEach(timer => clearTimeout(timer))
  feedTimers.value = []
  if (minuteCheckTimer.value) {
    clearInterval(minuteCheckTimer.value)
    minuteCheckTimer.value = null
  }
  if (resetTimer.value) {
    clearTimeout(resetTimer.value)
    resetTimer.value = null
  }
})

onLoad((options) => {
  console.log('页面加载，同步计划数据')
  syncPlanData()
  if (options.remaining) {
    const parsedRemaining = parseFloat(options.remaining)
    foodRemaining.value = Number.isFinite(parsedRemaining) ? parsedRemaining : 1000
    console.log('初始化饲料量 (来自导航):', foodRemaining.value)
  } else {
    const storedFood = uni.getStorageSync('foodRemaining')
    foodRemaining.value = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : 1000
    console.log('初始化饲料量 (来自存储):', foodRemaining.value)
  }
  uni.setStorageSync('foodRemaining', foodRemaining.value)
  resetDailyData()
})

onShow(() => {
  console.log('页面显示，同步数据和任务')
  syncPlanData()
  const storedFood = uni.getStorageSync('foodRemaining')
  const newRemaining = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : foodRemaining.value
  foodRemaining.value = newRemaining
  console.log('onShow 同步饲料量:', foodRemaining.value)
  uni.setStorageSync('foodRemaining', foodRemaining.value)
  resetDailyData()
  if (isAutoFeedEnabled.value) {
    scheduleAutoFeed()
  }
})
// 定量出食逻辑, wkl新增
const outfood = async () => {
  console.log("剩余量:" + foodRemaining.value);
  const manualint = parseInt(manualDispenseAmount.value, 10);
  
  if (manualint > foodRemaining.value) {
    console.log("超过最大量~");
    uni.showModal({
      title: '警告',
      content: '饲料剩余量不足~',
      showCancel: false,  // 不显示取消按钮
      success: function () {
        console.log('警告已显示');
      }
    });
    return;
  }
  
  const Num = Math.trunc(manualint / 200);
  console.log(Num);
  //背景显示出来
  backshow.value = true

  // // 显示加载动画
  // uni.showLoading({
  //   title: '正在出食物...',
  //   mask: false // 遮罩，避免用户点击其他操作
  // });
  toggleLottie();
  uni.request({
    url: "https://apis.bemfa.com/va/postJsonMsg",
    method: "POST",
    data: {
      uid: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topic: 'food',
      msg: JSON.stringify({
        num: Num,
        status: 'on'
      })
    },
    success: function (res) {
      console.log(res.data);
      // 启动轮询检查
      checkFoodStatus();
    },
    fail: function (err) {
      console.error("请求失败", err);
    }
  });
}

// 用 http 轮询检查
const checkFoodStatus = () => {
  uni.request({
    url: "https://apis.bemfa.com/va/getmsg",
    method: "GET",
    data: {
      uid: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topic: 'food',
      num: 1
    },
    success: function (res) {
      console.log("http接收到");
      const msgJson = JSON.parse(res.data.data[0].msg); // 解析 msg 字符串为 JSON
      console.log("msgJson.num:", msgJson.num);
      
      if (msgJson.num === -1) {
        backshow.value=false
        toggleLottie()
        uni.hideLoading();
        console.log("食物出库完成，停止轮询。");
         // 显示出食成功的提示消息
        uni.showToast({
          title: '出食成功!',
          icon: 'success',
          duration: 2000 // 显示2秒
        });
      } else {
        setTimeout(() => {
          checkFoodStatus();
        }, 1000);
      }
    },
    fail: function (err) {
      console.error("请求失败", err);
    }
  });
}

const getleave = () =>{
  uni.request({
    url: "https://apis.bemfa.com/va/getmsg",
    method: "GET",
    data: {
      uid: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topic: 'leave',
      num: 1
    },
    success: function (res) {
      console.log("剩余量已接收到");
      const msgJson = JSON.parse(res.data.data[0].msg); // 解析 msg 字符串为 JSON
      console.log("msgJson.foodNum:", msgJson.foodNum);
      foodRemaining.value = msgJson.foodNum*200
    },
    fail: function (err) {
      console.error("请求失败", err);
    }
  });
}
const backshow = ref(false)

const state = reactive({
  that: getCurrentInstance(),
});

const ifshow = ref(false); // 控制动画显隐性的变量

function toggleLottie() {
  ifshow.value = !ifshow.value;
  if (ifshow.value) {
    initLottie(); // 当设置为显示时初始化Lottie动画
  }
}

function initLottie() {
  const query = uni.createSelectorQuery().in(state.that);
  query.select('#lottie_demo').fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) {
      console.error('获取 canvas 节点失败');
      return;
    }

    const canvas = res[0].node;
    const context = canvas.getContext('2d');

    lottie.setup(canvas);
    lottie.loadAnimation({
      loop: true,
      autoplay: true,
      animationData: lottieJson,
      rendererSettings: {
        context,
      },
    });
  });
}

</script>

<style scoped>
.back{
  height: 100vh;
  width: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.5);
}
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  padding-bottom: 80px;
}

.device-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.device-image {
  width: 150px;
  height: 150px;
  margin-bottom: 10px;
}

.feeding-control {
  width: 100%;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 10px;
}

.remaining-food {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  transition: color 0.3s;
}

.input-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.input-label {
  font-size: 16px;
  margin-right: 10px;
}

.input-box {
  flex: 1;
  height: 40px;
  padding: 0 10px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  font-size: 14px;
}

.manual-feed-text {
  font-size: 16px;
  color: #1890ff;
  text-align: center;
  padding: 8px;
  background-color: #e6f7ff;
  border-radius: 4px;
  margin-top: 10px;
  font-weight: bold;
}

.feeding-plan {
  width: 100%;
  margin-bottom: 20px;
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.plan-title {
  font-size: 18px;
  font-weight: bold;
}

.auto-feed-switch {
  transform: scale(0.8);
}

.timeline {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.timeline-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 10px;
}

.time-text {
  font-size: 14px;
  font-weight: bold;
  width: 60px;
}

.amount-text {
  font-size: 14px;
  width: 60px;
  text-align: center;
}

.feed-progress {
  flex: 1;
  margin: 0 10px;
  border-radius: 5px;
}

.feed-icon {
  width: 30px;
  height: 30px;
}

.feeding-info {
  text-align: center;
  font-size: 16px;
  color: #666;
}

.feeding-info text {
  display: block;
  margin: 5px 0;
}

.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background-color: #fff;
  border-radius: 10px 10px 0 0;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  padding: 8px;
  height: 60px;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  transition: opacity 0.3s;
}

.action-button.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-bottom: 6px;
}

.action-text {
  font-size: 12px;
  color: #333;
}
</style>