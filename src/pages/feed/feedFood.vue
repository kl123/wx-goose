<template>
  <view class="container">
    <!-- 设备信息 -->
    <view class="device-info">
      <image class="device-image" src="/static/feed/喂食器皿.png" mode="aspectFit"></image>
    </view>

    <!-- 出粮控制区 -->
    <view class="feeding-control">
      <view class="input-row">
        <text class="input-label">出粮斤数:</text>
        <input 
          class="input-box" 
          type="number" 
          v-model="manualDispenseAmount" 
          placeholder="请输入出粮斤数"
        />
      </view>
      <text class="manual-feed-text" v-if="manualDispensed > 0">
        已手动出粮: {{ manualDispensed }} 斤
      </text>
    </view>

    <!-- 今日喂养计划模块 -->
    <view class="feeding-plan">
      <text class="plan-title">今日喂养计划</text>
      <view class="timeline">
        <view 
          v-for="(time, index) in timeSlots" 
          :key="index" 
          class="timeline-item"
        >
          <text class="time-text">{{ time }}</text>
          <progress 
            class="feed-progress" 
            :percent="feedProgress[index]" 
            stroke-width="4" 
            :activeColor="isFed[index] ? '#90EE90' : '#90EE90'" 
            backgroundColor="#e0e0e0" 
          />
          <image 
            :src="isFed[index] ? '/static/feed/planFeed_gray.png' : '/static/feed/planFeed.png'" 
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
      <view class="action-button" @click="handleDispense">
        <image class="action-icon" src="/static/feed/goose.png" mode="aspectFit"></image>
        <text class="action-text">立即出粮</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app' // 只从 uni-app 导入 onShow
import { onMounted, onUnmounted } from 'vue' // 从 vue 导入 onMounted 和 onUnmounted
import mqtt from 'mqtt/dist/mqtt.js' // 确保已安装 mqtt 库

const manualDispenseAmount = ref('') // 手动输入出粮份数
const manualDispensed = ref(0)      // 已手动出粮份数
const plannedAmount = ref(0)        // 计划出粮份数
const timeSlots = ref(['00:00', '06:00', '12:00', '18:00', '24:00'])
const mealAmounts = ref([0, 0, 0, 0, 0])  // 每个时间点的计划份数
const isFed = ref([false, false, false, false, false])  // 每个时间点是否已喂食
const fedAmounts = ref([0, 0, 0, 0, 0])  // 每个时间点的实际喂食份数

// MQTT 配置
const mqttConfig = {
  url: 'wxs://bemfa.com:9504/wss', // 巴法云 MQTT 地址
  options: {
    clientId: '6fc94297b1a4771e713523fd16d19702', // 替换为您的巴法云 clientId
    keepalive: 60,
    clean: true,
    protocolVersion: 4,
    reconnectPeriod: 5000,
    connectTimeout: 10000
  },
  topics: {
    food: 'food' // 出粮主题
  }
}

let mqttClient = ref(null)

// 初始化 MQTT 连接
const initMQTT = async () => {
  try {
    if (typeof mqtt === 'undefined') {
      throw new Error('MQTT库未正确加载')
    }
    
    mqttClient.value = mqtt.connect(mqttConfig.url, mqttConfig.options)
    
    mqttClient.value.on('connect', () => {
      console.log('✅ MQTT连接成功')
      uni.showToast({ title: '设备连接成功', icon: 'success' })
      
      // 订阅 food 主题
      mqttClient.value.subscribe(mqttConfig.topics.food, { qos: 1 }, (err) => {
        if (err) {
          console.error('订阅food主题失败:', err)
          uni.showToast({ title: '订阅food主题失败', icon: 'none' })
        } else {
          console.log('成功订阅food主题')
        }
      })
    })
    
    mqttClient.value.on('message', (topic, message) => {
      console.log('收到MQTT消息:', topic, message.toString())
      try {
        const data = JSON.parse(message.toString())
        if (topic === mqttConfig.topics.food && data.status === 'on' && data.num) {
          console.log('收到出粮指令:', data.num)
          // 可选：根据接收到的消息更新状态
          manualDispensed.value += parseInt(data.num) || 0
        }
      } catch (error) {
        console.error('解析MQTT消息失败:', error)
      }
    })
    
    mqttClient.value.on('error', (err) => {
      console.error('MQTT连接错误:', err)
      uni.showToast({ title: '设备连接失败', icon: 'none' })
    })
    
    mqttClient.value.on('reconnect', () => {
      console.log('正在尝试重新连接MQTT...')
    })
    
  } catch (error) {
    console.error('MQTT初始化错误:', error)
    uni.showToast({
      title: 'MQTT初始化失败: ' + error.message,
      icon: 'none'
    })
    setTimeout(initMQTT, 5000) // 5秒后重试
  }
}

// 发送出粮指令
const sendFeedCommand = (amount) => {
  return new Promise((resolve, reject) => {
    if (!mqttClient.value || !mqttClient.value.connected) {
      console.error('MQTT客户端未连接')
      reject(new Error('设备未连接'))
      return
    }
    
    const command = {
      num: amount,
      status: 'on'
    }
    
    mqttClient.value.publish(
      mqttConfig.topics.food,
      JSON.stringify(command),
      { qos: 1 },
      (err) => {
        if (err) {
          console.error('发送出粮指令失败:', err)
          reject(err)
        } else {
          console.log('出粮指令发送成功:', command)
          resolve(true)
        }
      }
    )
  })
}

// 计算每个时间点的喂食进度
const feedProgress = computed(() => {
  return timeSlots.value.map((_, index) => {
    if (mealAmounts.value[index] === 0) return 0
    if (isFed.value[index]) return 100
    return Math.min((fedAmounts.value[index] / mealAmounts.value[index]) * 100, 100)
  })
})

// 计算本次出粮时间和份数
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

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
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

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return mealAmounts.value[i]
    }
  }

  return 0
})

// 计算下次出粮时间和份数
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

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
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

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return mealAmounts.value[i]
      } else {
        foundCurrent = true
      }
    }
  }

  return 0
})

// 跳转到计划出粮页面
const goToPlanFoodPage = () => {
  uni.navigateTo({
    url: '/pages/planFood/planFood'
  })
}

// 立即出粮
const handleDispense = async () => {
  const inputAmount = parseInt(manualDispenseAmount.value) || 0
  if (inputAmount <= 0) {
    uni.showToast({
      title: '请输入有效的出粮份数',
      icon: 'none'
    })
    return
  }

  // 计算实际发送值：输入值除以100
  const sendAmount = Math.floor(inputAmount / 100)
  
  try {
    await sendFeedCommand(sendAmount) // 发送 MQTT 出粮指令
    manualDispensed.value += inputAmount // 更新已手动出粮份数(显示原始输入值)
    manualDispenseAmount.value = '' // 清空输入框
    
    uni.showToast({
      title: `已手动出粮 ${inputAmount} 斤`,
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '出粮失败: ' + error.message,
      icon: 'none'
    })
  }
}

// 时间点喂食
const handleFeedIconClick = (index) => {
  if (!isFed.value[index]) {
    // 每次点击增加100斤(对应发送1)
    fedAmounts.value[index] += 100
    if (fedAmounts.value[index] >= mealAmounts.value[index] * 100) {
      isFed.value[index] = true
    }
    
    // 发送1份(对应100斤)
    sendFeedCommand(1).catch(err => {
      console.error('发送出粮指令失败:', err)
    })
    
    uni.showToast({
      title: `已出粮 100 斤`,
      icon: 'success'
    })
  } else {
    uni.showToast({
      title: '当前时间点已喂食完成',
      icon: 'none'
    })
  }
}

// 监听页面显示事件，更新数据
onShow(() => {
  const plannedAmountFromStorage = uni.getStorageSync('plannedAmount')
  const mealAmountsFromStorage = uni.getStorageSync('mealAmounts')
  if (plannedAmountFromStorage) {
    plannedAmount.value = parseInt(plannedAmountFromStorage) || 0
  }
  if (mealAmountsFromStorage) {
    mealAmounts.value = mealAmountsFromStorage.map(amount => parseInt(amount) || 0)
  }
  console.log('onShow: plannedAmount=', plannedAmount.value, 'mealAmounts=', mealAmounts.value)
})

// 生命周期钩子
onMounted(() => {
  initMQTT() // 初始化 MQTT
})

onUnmounted(() => {
  if (mqttClient.value && mqttClient.value.connected) {
    mqttClient.value.end() // 断开 MQTT 连接
  }
})
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  padding-bottom: 100px;
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
}

.manual-feed-text {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.feeding-plan {
  width: 100%;
  margin-bottom: 20px;
}

.plan-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
}

.timeline {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-text {
  font-size: 14px;
  margin-bottom: 5px;
}

.feed-progress {
  width: 50px;
  margin-bottom: 5px;
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
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
}

.action-icon {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  margin-bottom: 10px;
}

.action-text {
  font-size: 14px;
}
</style>