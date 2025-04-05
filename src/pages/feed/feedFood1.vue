<template>
  <view class="container">
    <!-- 设备信息 -->
    <view class="device-info">
      <image class="device-image" src="/static/logo.png" mode="aspectFit"></image>
    </view>

    <!-- 喂食状态 -->
    <view class="feeding-status">
      <text class="progress-text">已出粮: {{ dispensedAmount }} 份</text>
      <view class="progress-row">
        <progress 
          class="progress-bar" 
          :percent="progressPercent" 
          stroke-width="6" 
          activeColor="#90EE90" 
          backgroundColor="#e0e0e0" 
        />
        <text class="planned-amount">计划出粮: {{ plannedAmount }} 份</text>
      </view>
      <view class="feeding-details">
        <view class="detail-item">
          <text class="detail-value">{{ extraMeals }} 份</text>
          <text class="detail-label">今日加餐</text>
        </view>
        <view class="detail-item" @click="goToPlanFoodPage">
          <text class="detail-value">{{ plannedAmount }} 份</text>
          <text class="detail-label">计划出粮</text>
        </view>
      </view>
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
            :src="isFed[index] ? '/static/logo_gray.png' : '/static/logo.png'" 
            class="feed-icon" 
            mode="aspectFit"
            @click="handleFeedIconClick(index)"
          ></image>
        </view>
      </view>
      <view class="feeding-info">
        <text>本次出粮: {{ currentFeedingTime }} {{ currentFeedingAmount }} 份</text>
        <text>下次出粮: {{ nextFeedingTime }} {{ nextFeedingAmount }} 份</text>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view class="action-area">
      <view class="action-button" @click="handleAddMeal">
        <image class="action-icon" src="/static/logo.png" mode="aspectFit"></image>
        <text class="action-text">立即加餐</text>
      </view>
      <view class="action-button" @click="handleDispense">
        <image class="action-icon" src="/static/logo.png" mode="aspectFit"></image>
        <text class="action-text">立即出粮</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const dispensedAmount = ref(0)    // 已出粮份数
const plannedAmount = ref(0)      // 计划出粮份数
const extraMeals = ref(0)         // 今日加餐份数
const timeSlots = ref(['00:00', '06:00', '12:00', '18:00', '24:00'])
const mealAmounts = ref([0, 0, 0, 0, 0])  // 每个时间点的计划份数
const isFed = ref([false, false, false, false, false])  // 每个时间点是否已喂食
const fedAmounts = ref([0, 0, 0, 0, 0])  // 每个时间点的实际喂食份数

// 计算总进度条百分比
const progressPercent = computed(() => {
  const plannedDispensed = dispensedAmount.value - extraMeals.value
  return plannedAmount.value > 0 
    ? Math.min((plannedDispensed / plannedAmount.value) * 100, 100)
    : 0
})

// 计算每个时间点的喂食进度
const feedProgress = computed(() => {
  return timeSlots.value.map((_, index) => {
    if (mealAmounts.value[index] === 0) return 0 // 如果计划喂食量为 0，进度为 0
    if (isFed.value[index]) return 100 // 如果已经喂食完成，进度为 100%
    return Math.min((fedAmounts.value[index] / mealAmounts.value[index]) * 100, 100)
  })
})

// 计算本次出粮时间和份数
// 计算本次出粮时间
const currentFeedingTime = computed(() => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  // 查找当前时间点之后的第一个未喂食的时间点
  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute

    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return timeSlots.value[i]
    }
  }

  // 如果当前时间超过 24:00，则从第二天的 00:00 开始重新检查
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

  // 查找当前时间点之后的第一个未喂食的时间点
  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute

    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return mealAmounts.value[i]
    }
  }

  // 如果当前时间超过 24:00，则从第二天的 00:00 开始重新检查
  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return mealAmounts.value[i]
    }
  }

  return 0
})

// 计算下次出粮时间
const nextFeedingTime = computed(() => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  let foundCurrent = false
  // 查找当前时间点之后的第一个未喂食的时间点
  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute

    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return timeSlots.value[i] // 返回下一个未喂食的时间点
      } else {
        foundCurrent = true // 标记已找到当前时间点
      }
    }
  }

  // 如果当前时间超过 24:00，则从第二天的 00:00 开始重新检查
  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return timeSlots.value[i] // 返回下一个未喂食的时间点
      } else {
        foundCurrent = true // 标记已找到当前时间点
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
  // 查找当前时间点之后的第一个未喂食的时间点
  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number)
    const slotTime = hour * 60 + minute

    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return mealAmounts.value[i] // 返回下一个未喂食的时间点的份数
      } else {
        foundCurrent = true // 标记已找到当前时间点
      }
    }
  }

  // 如果当前时间超过 24:00，则从第二天的 00:00 开始重新检查
  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return mealAmounts.value[i] // 返回下一个未喂食的时间点的份数
      } else {
        foundCurrent = true // 标记已找到当前时间点
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

// 立即加餐
const handleAddMeal = () => {
  extraMeals.value += 1
  dispensedAmount.value += 1
  uni.showToast({
    title: '已加餐 1 份',
    icon: 'success'
  })
}

// 立即出粮
const handleDispense = () => {
  const plannedDispensed = dispensedAmount.value - extraMeals.value
  if (plannedDispensed < plannedAmount.value) {
    dispensedAmount.value += 1

    // 找到当前时间点对应的索引
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    let found = false
    for (let i = 0; i < timeSlots.value.length; i++) {
      const [hour, minute] = timeSlots.value[i].split(':').map(Number)
      const slotTime = hour * 60 + minute

      // 如果当前时间点未喂食且有计划喂食量
      if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
        fedAmounts.value[i] += 1 // 更新实际喂食份数
        isFed.value[i] = fedAmounts.value[i] >= mealAmounts.value[i] // 更新喂食完成状态
        found = true
        break // 只更新当前时间点
      }
    }

    // 如果当前时间超过 24:00，则从 00:00 开始重新检查
    if (!found) {
      for (let i = 0; i < timeSlots.value.length; i++) {
        if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
          fedAmounts.value[i] += 1
          isFed.value[i] = fedAmounts.value[i] >= mealAmounts.value[i]
          break
        }
      }
    }

    uni.showToast({
      title: '已出粮 1 份',
      icon: 'success'
    })
  } else {
    uni.showToast({
      title: '已达到计划出粮量',
      icon: 'none'
    })
  }
}

const handleFeedIconClick = (index) => {
  if (!isFed.value[index]) {
    fedAmounts.value[index] += 1

    if (fedAmounts.value[index] >= mealAmounts.value[index]) {
      isFed.value[index] = true
    }

    dispensedAmount.value += 1

    uni.showToast({
      title: `已出粮 1 份`,
      icon: 'success'
    })
  } else {
    uni.showToast({
      title: '当前时间点已喂食完成',
      icon: 'none'
    })
  }
}

// 更新喂食状态
const updateFeedingStatus = () => {
  let remaining = dispensedAmount.value - extraMeals.value // 排除加餐的份数
  fedAmounts.value = [0, 0, 0, 0, 0] // 重置实际喂食份数

  for (let i = 0; i < mealAmounts.value.length; i++) {
    if (remaining > 0 && mealAmounts.value[i] > 0) {
      const amountToFeed = Math.min(remaining, mealAmounts.value[i])
      fedAmounts.value[i] = amountToFeed
      remaining -= amountToFeed
      isFed.value[i] = fedAmounts.value[i] >= mealAmounts.value[i] // 更新喂食完成状态
    } else {
      fedAmounts.value[i] = 0
      isFed.value[i] = false
    }
  }
}

// 监听页面显示事件，更新数据
onShow(() => {
  const plannedAmountFromStorage = uni.getStorageSync('plannedAmount')
  const mealAmountsFromStorage = uni.getStorageSync('mealAmounts')
  if (plannedAmountFromStorage) {
    plannedAmount.value = plannedAmountFromStorage
  }
  if (mealAmountsFromStorage) {
    mealAmounts.value = mealAmountsFromStorage.map(amount => parseInt(amount) || 0)
  }
  updateFeedingStatus()
})

import { onMounted, onUnmounted } from 'vue'

const resetDailyFeedingStatus = () => {
  isFed.value = [false, false, false, false, false]
  fedAmounts.value = [0, 0, 0, 0, 0]
  dispensedAmount.value = 0
  extraMeals.value = 0
}

// 监听日期变化
const checkDateChange = () => {
  const today = new Date().getDate()
  let lastCheckedDate = today

  const interval = setInterval(() => {
    const currentDate = new Date().getDate()
    if (currentDate !== lastCheckedDate) {
      resetDailyFeedingStatus()
      lastCheckedDate = currentDate
    }
  }, 60000) // 每分钟检查一次

  return interval
}

onMounted(() => {
  const interval = checkDateChange()
  onUnmounted(() => clearInterval(interval))
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

.feeding-status {
  width: 100%;
  margin-bottom: 20px;
}

.progress-text {
  font-size: 16px;
  margin-bottom: 15px;
}

.progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15px;
  margin-bottom: 30px;
}

.progress-bar {
  flex: 1;
  margin-right: 10px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.planned-amount {
  font-size: 16px;
}

.feeding-details {
  display: flex;
  justify-content: space-around;
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-value {
  font-size: 18px;
  font-weight: bold;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

/* 今日喂养计划样式 */
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
  transition: all 0.3s ease; /* 添加过渡效果 */
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
//5