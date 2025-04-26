<template>
  <view class="plan-container">
    <!-- 头部标题 -->
    <view class="header">
      <text class="title">喂食计划设置</text>
      <text class="subtitle">自定义您的自动喂食时间和份量</text>
    </view>

    <!-- 添加时间区域 -->
    <view class="add-time-container">
      <view class="input-container">
        <uni-icons type="clock" size="20" color="#666" class="input-icon"></uni-icons>
        <input 
          v-model="newTime" 
          type="text" 
          placeholder="输入时间 (HH:mm)" 
          class="time-input"
          maxlength="5"
        />
      </view>
      <button class="add-button" @click="addTimeSlot">
        <uni-icons type="plus" size="16" color="#fff"></uni-icons>
        <text>添加</text>
      </button>
    </view>

    <!-- 时间点列表 -->
    <view class="time-list">
      <view class="time-item" v-for="(time, index) in timeSlots" :key="index">
        <view class="time-info">
          <uni-icons type="clock" size="18" color="#4a90e2"></uni-icons>
          <text class="time-text">{{ time }}</text>
        </view>
        
        <view class="amount-control">
          <button class="control-btn minus" @click="decrement(index)" :disabled="mealAmounts[index] <= 0">
            <uni-icons type="minus" size="14" color="#fff"></uni-icons>
          </button>
          <text class="amount">{{ mealAmounts[index] }}g</text>
          <button class="control-btn plus" @click="increment(index)">
            <uni-icons type="plus" size="14" color="#fff"></uni-icons>
          </button>
        </view>
        
        <button class="delete-btn" @click="deleteTimeSlot(index)" v-if="timeSlots.length > 1">
          <uni-icons type="trash" size="16" color="#ff4d4f"></uni-icons>
        </button>
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-card">
      <view class="stat-item">
        <text>时间点数量</text>
        <text class="stat-value">{{ timeSlots.length }}个</text>
      </view>
      <view class="stat-item">
        <text>总喂食量</text>
        <text class="stat-value">{{ totalAmount }}g</text>
      </view>
    </view>

    <!-- 保存按钮 -->
    <button class="save-btn" @click="savePlan">
      <text>保存喂食计划</text>
    </button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const timeSlots = ref(['06:00', '12:00', '18:00'])
const mealAmounts = ref([100, 100, 100])
const newTime = ref('')

// 计算总出粮份数
const totalAmount = computed(() => {
  return mealAmounts.value.reduce((sum, amount) => sum + (parseInt(amount) || 0), 0)
})

// 验证时间格式
const isValidTime = (time) => {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(time)
}

// 添加时间点
const addTimeSlot = () => {
  if (!newTime.value) {
    uni.showToast({ title: '请输入时间', icon: 'none' })
    return
  }

  if (!isValidTime(newTime.value)) {
    uni.showToast({ title: '请输入正确的时间格式 (HH:mm)', icon: 'none' })
    return
  }

  if (timeSlots.value.includes(newTime.value)) {
    uni.showToast({ title: '该时间点已存在', icon: 'none' })
    return
  }

  timeSlots.value.push(newTime.value)
  mealAmounts.value.push(100)
  sortTimeSlots()
  newTime.value = ''
  uni.showToast({ title: '时间点添加成功', icon: 'success' })
}

// 删除时间点
const deleteTimeSlot = (index) => {
  if (timeSlots.value.length <= 1) {
    uni.showToast({ title: '至少保留一个时间点', icon: 'none' })
    return
  }
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${timeSlots.value[index]} 的喂食计划吗？`,
    success: (res) => {
      if (res.confirm) {
        timeSlots.value.splice(index, 1)
        mealAmounts.value.splice(index, 1)
        uni.showToast({ title: '时间点已删除', icon: 'success' })
      }
    }
  })
}

// 按时间排序
const sortTimeSlots = () => {
  const combined = timeSlots.value.map((time, index) => ({
    time,
    amount: mealAmounts.value[index]
  }))
  
  combined.sort((a, b) => {
    const [aHour, aMin] = a.time.split(':').map(Number)
    const [bHour, bMin] = b.time.split(':').map(Number)
    return aHour * 60 + aMin - (bHour * 60 + bMin)
  })
  
  timeSlots.value = combined.map(item => item.time)
  mealAmounts.value = combined.map(item => item.amount)
}

// 增加份量
const increment = (index) => {
  mealAmounts.value[index] = (parseInt(mealAmounts.value[index]) || 0) + 100
}

// 减少份量
const decrement = (index) => {
  const current = parseInt(mealAmounts.value[index]) || 0
  mealAmounts.value[index] = current > 0 ? current - 100 : 0
}

// 加载保存的数据
const loadSavedData = () => {
  const savedTimes = uni.getStorageSync('timeSlots')
  const savedAmounts = uni.getStorageSync('mealAmounts')
  if (savedTimes && savedAmounts && savedTimes.length === savedAmounts.length) {
    timeSlots.value = savedTimes
    mealAmounts.value = savedAmounts.map(amount => parseInt(amount) || 0)
  }
}

// 保存计划
const savePlan = () => {
  const invalidIndex = mealAmounts.value.findIndex(amount => {
    const num = parseInt(amount) || 0
    return num < 0
  })

  if (invalidIndex !== -1) {
    uni.showToast({
      title: `时间点${timeSlots.value[invalidIndex]}的数值不能为负数`,
      icon: 'none'
    })
    return
  }

  uni.setStorageSync('timeSlots', timeSlots.value)
  uni.setStorageSync('mealAmounts', mealAmounts.value)
  uni.setStorageSync('plannedAmount', totalAmount.value)

  uni.showToast({
    title: '喂食计划已保存',
    icon: 'success'
  })
  
  setTimeout(() => {
    uni.navigateBack()
  }, 1500)
}

onLoad(() => {
  loadSavedData()
})
</script>

<style lang="scss" scoped>
.plan-container {
  padding: 24px;
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

.add-time-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
  
  .input-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    
    .input-icon {
      position: absolute;
      left: 12px;
      z-index: 1;
    }
    
    .time-input {
      flex: 1;
      height: 44px;
      padding: 0 16px 0 40px;
      background-color: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      
      &:focus {
        border-color: #4a90e2;
      }
    }
  }
  
  .add-button {
    width: 80px;
    height: 44px;
    background-color: #4a90e2;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
}

.time-list {
  margin-bottom: 24px;
  
  .time-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background-color: #fff;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    position: relative;
    
    .time-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      
      .time-text {
        font-size: 16px;
        font-weight: 500;
        color: #333;
        min-width: 60px;
      }
    }
    
    .amount-control {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      padding-right: 12px;
      
      .control-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        
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
      
      .amount {
        min-width: 60px;
        text-align: center;
        font-size: 15px;
        font-weight: 500;
      }
    }
    
    .delete-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid #ff4d4f;
      margin-left: 8px;
    }
  }
}

.stats-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    
    &:not(:last-child) {
      border-bottom: 1px solid #f0f0f0;
    }
    
    .stat-value {
      font-weight: 500;
      color: #4a90e2;
    }
  }
}

.save-btn {
  width: 100%;
  height: 48px;
  background-color: #4a90e2;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    background-color: #3a7bc8;
  }
}
</style>