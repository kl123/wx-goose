<template>
  <view class="plan-food-container">
    <view class="time-slot" v-for="(time, index) in timeSlots" :key="index">
      <text class="time">{{ time }}</text>
      <input 
        v-model="mealAmounts[index]" 
        type="number" 
        placeholder="0" 
        class="meal-input"
      />
    </view>
    <view class="total-amount">
      <text>总出粮份数: {{ totalAmount }} 份</text>
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
const mealAmounts = ref([0, 0, 0, 0, 0])

// 计算总出粮份数
const totalAmount = computed(() => {
  return mealAmounts.value.reduce((sum, amount) => sum + (parseInt(amount) || 0), 0)
})

// 加载保存的数据
const loadSavedData = () => {
  const savedAmounts = uni.getStorageSync('mealAmounts')
  if (savedAmounts) {
    mealAmounts.value = savedAmounts.map(amount => parseInt(amount) || 0)
  }
}

// 保存计划
const savePlan = () => {
  uni.setStorageSync('plannedAmount', totalAmount.value)
  uni.setStorageSync('mealAmounts', mealAmounts.value)
  uni.navigateBack()
}

// 页面加载时获取保存的数据
onLoad(() => {
  loadSavedData()
})
</script>

<style scoped>
.plan-food-container {
  padding: 20px;
}

.time-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.time {
  font-size: 16px;
}

.meal-input {
  width: 60px;
  height: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 0 10px;
  text-align: center;
}

.total-amount {
  margin-top: 20px;
  font-size: 18px;
  text-align: center;
}

.save-button {
  margin-top: 30px;
  background-color: #90EE90;
  padding: 10px;
  border-radius: 5px;
  text-align: center;
  color: white;
  font-size: 16px;
}
</style>