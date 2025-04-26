<template>
  <view class="plan-water-container">
    <view class="time-slot" v-for="(time, index) in timeSlots" :key="index">
      <text class="time">{{ time }}</text>
      <input 
        v-model="waterAmounts[index]" 
        type="number" 
        placeholder="0" 
        class="water-input"
        min="0"
        max="100"
      />
      <text>%</text>
    </view>
    <view class="total-amount">
      <text>总出水量: {{ totalAmount }}%</text>
    </view>
    <view class="save-button" @click="savePlan">
      <text>保存</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const timeSlots = ref(['00:00', '06:00', '12:00', '18:00', '24:00'])
const waterAmounts = ref([0, 0, 0, 0, 0])

// 计算总出水量百分比
const totalAmount = computed(() => {
  return waterAmounts.value.reduce((sum, amount) => sum + (parseInt(amount) || 0), 0)
})

// 加载保存的数据
const loadSavedData = () => {
  const savedAmounts = uni.getStorageSync('waterAmounts')
  if (savedAmounts) {
    waterAmounts.value = savedAmounts.map(amount => parseInt(amount) || 0)
  }
}

// 保存计划
const savePlan = () => {
  // 验证输入值是否在0-100之间
  const invalidIndex = waterAmounts.value.findIndex(amount => {
    const num = parseInt(amount) || 0
    return num < 0 || num > 100
  })
  
  if (invalidIndex !== -1) {
    uni.showToast({
      title: `时间点${timeSlots.value[invalidIndex]}的数值需在0-100之间`,
      icon: 'none'
    })
    return
  }

  uni.setStorageSync('plannedWaterAmount', totalAmount.value)
  uni.setStorageSync('waterAmounts', waterAmounts.value)
  uni.navigateBack()
  
  uni.showToast({
    title: '喂水计划已保存',
    icon: 'success'
  })
}

// 页面加载时获取保存的数据
onLoad(() => {
  loadSavedData()
})
</script>

<style scoped>
.plan-water-container {
  padding: 20px;
}

.time-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.time {
  font-size: 16px;
  font-weight: bold;
  width: 60px;
}

.water-input {
  width: 80px;
  height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 0 10px;
  text-align: center;
  margin: 0 10px;
}

.total-amount {
  margin-top: 30px;
  font-size: 18px;
  text-align: center;
  font-weight: bold;
  color: #333;
}

.save-button {
  margin-top: 40px;
  background-color: #4a90e2;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.save-button:active {
  background-color: #3a7bc8;
}
</style>