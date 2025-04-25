<template>
  <view class="plan-container">
    <view class="header">
      <text class="title">喂食计划</text>
      <text class="subtitle">设置您的自动喂食时间和份量</text>
    </view>

    <view class="time-slots-container">
      <view class="time-slot-card" v-for="(slot, index) in timeSlots" :key="index">
        <view class="time-section">
          <text class="time-label">时间</text>
          <picker mode="time" :value="slot.time" @change="(e) => timeChange(index, e)">
            <view class="time-picker">
              <text class="time-value">{{ slot.time }}</text>
              <uni-icons type="arrowdown" size="16" color="#666"></uni-icons>
            </view>
          </picker>
        </view>

        <view class="amount-section">
          <text class="amount-label">份量</text>
          <view class="amount-control">
            <button class="control-btn minus" @click="decrement(index)" :disabled="slot.amount <= 0">
              <uni-icons type="minus" size="16" color="#fff"></uni-icons>
            </button>
            <text class="amount-value">{{ slot.amount }}g</text>
            <button class="control-btn plus" @click="increment(index)">
              <uni-icons type="plus" size="16" color="#fff"></uni-icons>
            </button>
          </view>
        </view>

        <button class="delete-btn" @click="removeTimeSlot(index)" v-if="timeSlots.length > 1">
          <uni-icons type="trash" size="18" color="#ff4d4f"></uni-icons>
        </button>
      </view>

      <button class="add-btn" @click="addTimeSlot">
        <uni-icons type="plusempty" size="20" color="#4a90e2"></uni-icons>
        <text>添加喂食时间</text>
      </button>
    </view>

    <view class="summary-card">
      <text class="summary-title">今日喂食计划</text>
      <view class="summary-item">
        <text>总喂食次数</text>
        <text class="highlight">{{ timeSlots.filter(s => s.amount > 0).length }}次</text>
      </view>
      <view class="summary-item">
        <text>总喂食量</text>
        <text class="highlight">{{ totalAmount }}g</text>
      </view>
    </view>

    <button class="save-btn" @click="savePlan" :disabled="isSaving">
      <text>{{ isSaving ? '保存中...' : '保存喂食计划' }}</text>
    </button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// 初始数据
const initialTimeSlots = [
  { time: '08:00', amount: 100 },
  { time: '12:00', amount: 100 },
  { time: '18:00', amount: 100 }
]

const timeSlots = ref([...initialTimeSlots])
const openID = ref('6fc94297b1a4771e713523fd16d19702')
const topicID = ref('food')
const deviceType = 1
const isSaving = ref(false)

// 计算总出粮份数
const totalAmount = computed(() => {
  return timeSlots.value.reduce((sum, slot) => sum + (parseInt(slot.amount) || 0), 0)
})

// 加载保存的数据
const loadSavedData = async () => {
  try {
    const savedSlots = uni.getStorageSync('timeSlots')
    if (savedSlots?.length) {
      timeSlots.value = savedSlots
    }
    openID.value = uni.getStorageSync('openID') || '6fc94297b1a4771e713523fd16d19702'
    console.log('加载后的 openID:', openID.value)
    if (!openID.value) {
      uni.showToast({
        title: '未找到用户ID，请重新登录',
        icon: 'none'
      })
      uni.navigateTo({
        url: '/pages/login/login' // 替换为实际的登录页面路径
      })
    }
  } catch (error) {
    console.error('加载数据出错:', error)
    uni.showToast({
      title: '加载数据失败',
      icon: 'none'
    })
  }
}

// 添加时间槽
const addTimeSlot = () => {
  const lastTime = timeSlots.value[timeSlots.value.length - 1].time
  const [hours, minutes] = lastTime.split(':').map(Number)
  const newHours = (hours + 2) % 24
  const newTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  
  timeSlots.value.push({
    time: newTime,
    amount: 100
  })
}

// 删除时间槽
const removeTimeSlot = (index) => {
  if (timeSlots.value.length > 1) {
    timeSlots.value.splice(index, 1)
  }
}

// 时间选择变化
const timeChange = (index, e) => {
  timeSlots.value[index].time = e.detail.value
}

// 增加数量
const increment = (index) => {
  timeSlots.value[index].amount = (parseInt(timeSlots.value[index].amount) || 0) + 100
}

// 减少数量
const decrement = (index) => {
  const current = parseInt(timeSlots.value[index].amount) || 0
  if (current > 0) {
    timeSlots.value[index].amount = current - 100
  }
}

// 添加定时任务
const addTimingTask = async (time, amount) => {
  if (!amount || amount <= 0) return false

  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(time)) {
    console.error(`无效的时间格式: ${time}`)
    uni.showToast({
      title: '时间格式错误',
      icon: 'none'
    })
    return false
  }

  try {
    const requestData = {
      openID: openID.value,
      topicID: topicID.value,
      time: `${time}:00`,
      type: deviceType,
      msg: `feed#${amount}`,
      week: [0, 1, 2, 3, 4, 5, 6]
    }
    console.log('发送请求:', requestData)

    const response = await uni.request({
      url: 'https://apis.bemfa.com/vb/delay/v1/addTime',
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

    console.log('API 响应:', response)

    if (!response.data) {
      console.error('API 响应为空:', response)
      return false
    }

    if (response.data.code !== 0) {
      console.error(`添加定时任务失败: ${response.data.msg || '未知错误'}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`添加定时任务出错 (时间: ${time}, 份量: ${amount}):`, error)
    return false
  }
}

// 清除旧的定时任务
const clearOldTimingTasks = async () => {
  try {
    const response = await uni.request({
      url: `https://apis.bemfa.com/vb/delay/v1/timeList?openID=${openID.value}&topicID=${topicID.value}&type=${deviceType}`,
      method: 'GET'
    })

    console.log('获取定时任务列表响应:', response)

    if (!response.data || response.data.code !== 0) {
      console.error('获取定时任务列表失败:', response.data?.msg || '未知错误')
      return
    }

    const tasks = response.data.data?.data || []
    for (const task of tasks) {
      await deleteTimingTask(task.id)
    }
  } catch (error) {
    console.error('清除定时任务出错:', error)
  }
}

// 删除定时任务
const deleteTimingTask = async (id) => {
  try {
    const response = await uni.request({
      url: 'https://apis.bemfa.com/vb/delay/v1/deleteTime',
      method: 'POST',
      data: {
        openID: openID.value,
        topicID: topicID.value,
        type: deviceType,
        id: id
      },
      header: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

    console.log('删除定时任务响应:', response)

    if (!response.data || response.data.code !== 0) {
      console.error(`删除定时任务失败 (ID: ${id}):`, response.data?.msg || '未知错误')
      return false
    }

    return true
  } catch (error) {
    console.error(`删除定时任务出错 (ID: ${id}):`, error)
    return false
  }
}

// 保存计划
const savePlan = async () => {
  if (!openID.value) {
    console.error('保存失败：openID 为空')
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    uni.navigateTo({
      url: '/pages/login/login' // 替换为实际的登录页面路径
    })
    return
  }

  if (!topicID.value || deviceType !== 1) {
    console.error('保存失败：无效的 topicID 或 deviceType', { topicID: topicID.value, deviceType })
    uni.showToast({
      title: '设备配置错误',
      icon: 'none'
    })
    return
  }

  // 验证输入
  const invalidSlot = timeSlots.value.find((slot) => {
    const num = parseInt(slot.amount) || 0
    return num < 0 || num % 100 !== 0
  })

  if (invalidSlot) {
    uni.showToast({
      title: '喂食量必须为100的整数倍且不能为负数',
      icon: 'none'
    })
    return
  }

  // 检查时间重复和格式
  const timeSet = new Set()
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  for (const slot of timeSlots.value) {
    if (!timeRegex.test(slot.time)) {
      uni.showToast({
        title: `时间 ${slot.time} 格式错误`,
        icon: 'none'
      })
      return
    }
    if (timeSet.has(slot.time)) {
      uni.showToast({
        title: `时间 ${slot.time} 重复了`,
        icon: 'none'
      })
      return
    }
    timeSet.add(slot.time)
  }

  isSaving.value = true

  try {
    // 清除旧的定时任务
    await clearOldTimingTasks()

    // 串行添加新的定时任务
    for (const slot of timeSlots.value.filter((s) => s.amount > 0)) {
      const success = await addTimingTask(slot.time, slot.amount)
      if (!success) {
        throw new Error(`添加定时任务失败: ${slot.time}`)
      }
    }

    // 本地存储
    uni.setStorageSync('timeSlots', timeSlots.value)
    uni.setStorageSync('plannedAmount', totalAmount.value)

    uni.showToast({
      title: '喂食计划已保存',
      icon: 'success'
    })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error) {
    console.error('保存计划出错:', error)
    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none'
    })
  } finally {
    isSaving.value = false
  }
}

// 页面加载
onLoad(() => {
  loadSavedData()
})
</script>

<style lang="scss" scoped>
.plan-container {
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.header {
  margin-bottom: 24px;
  text-align: center;
  
  .title {
    font-size: 22px;
    font-weight: 600;
    color: #333;
    display: block;
    margin-bottom: 4px;
  }
  
  .subtitle {
    font-size: 14px;
    color: #666;
  }
}

.time-slots-container {
  margin-bottom: 24px;
}

.time-slot-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  
  .time-section {
    flex: 1;
    
    .time-label {
      font-size: 12px;
      color: #999;
      display: block;
      margin-bottom: 4px;
    }
    
    .time-picker {
      display: flex;
      align-items: center;
      
      .time-value {
        font-size: 18px;
        font-weight: 500;
        color: #333;
        margin-right: 6px;
      }
    }
  }
  
  .amount-section {
    flex: 1;
    
    .amount-label {
      font-size: 12px;
      color: #999;
      display: block;
      margin-bottom: 4px;
      text-align: right;
    }
    
    .amount-control {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      
      .control-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0;
        margin: 0;
        
        &.minus {
          background-color: #ff4d4f;
        }
        
        &.plus {
          background-color: #4a90e2;
        }
        
        &[disabled] {
          opacity: 0.5;
        }
      }
      
      .amount-value {
        font-size: 16px;
        font-weight: 500;
        margin: 0 12px;
        min-width: 60px;
        text-align: center;
      }
    }
  }
  
  .delete-btn {
    position: absolute;
    right: -8px;
    top: -8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  background-color: #fff;
  border: 1px dashed #4a90e2;
  border-radius: 12px;
  color: #4a90e2;
  font-size: 14px;
  
  text {
    margin-left: 6px;
  }
}

.summary-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  .summary-title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin-bottom: 12px;
    display: block;
  }
  
  .summary-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;
    
    .highlight {
      color: #4a90e2;
      font-weight: 500;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.save-btn {
  width: 100%;
  padding: 14px;
  background-color: #4a90e2;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  
  &[disabled] {
    opacity: 0.7;
  }
}
</style>