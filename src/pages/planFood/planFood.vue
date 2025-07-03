<template>
  <view class="plan-container">
    <!-- 头部标题 -->
    <view class="header">
      <text class="title">喂食计划设置</text>
      <text class="subtitle">自定义您的自动喂食时间和份量</text>
    </view>

    <!-- 添加时间区域 -->
    <view class="add-time-container">
        <!-- 时间选择器 -->
      <view class="input-container time-picker-container">
        <uni-icons type="clock" size="20" color="#666" class="input-icon"></uni-icons>
        <picker mode="time" :value="selectedTime" @change="onTimeChange" class="time-picker">
          <view class="time-text">{{ selectedTime || '请选择时间' }}</view>
        </picker>
      </view>

      <!-- 克数输入框 -->
      <view class="input-container amount-input-container">
        <uni-icons type="edit" size="20" color="#666" class="input-icon"></uni-icons>
        <input 
          v-model="foodAmount" 
          type="number"
          placeholder="喂食克数(g)"
          class="amount-input"
        />
      </view>

      <!-- 添加按钮 -->
      <button class="add-button" @click="addTimeSlot">
        <uni-icons type="plus" size="16" color="#fff"></uni-icons>
        <text>添加</text>
      </button>
    </view>

    <!-- 时间点列表 -->
    <view class="time-list">
      <view class="time-item" v-for="(time, index) in timeSlots" :key="index"
      :class="{'disabled': time.status === 0}"
      >
        <view class="time-info">
          <uni-icons type="clock" size="18" color="#4a90e2"></uni-icons>
          <text class="time-text">{{ time.time }}</text>
        </view>
        
        <view class="amount-control">
          <!-- 禁用 -->
          <button class="control-btn minus" @click="probitTime(time.id)">
            <uni-icons type="locked-filled" size="14" color="#fff"></uni-icons>
          </button>
          <text class="amount">{{ getAmount(time.msg) }}g</text>
          <!-- 启用 -->
          <button class="control-btn plus" @click="invokeTime(time.id)">
            <uni-icons type="eye-filled" size="14" color="#fff"></uni-icons>
          </button>
        </view>
        <!-- 删除 -->
        <button class="delete-btn" @click="deleteTimeSlot(time.id)" v-if="timeSlots.length > 1">
          <uni-icons type="trash" size="16" color="#ff4d4f"></uni-icons>
        </button>
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-card">
      <view class="stat-item">
        <text>启用时间点数量</text>
        <text class="stat-value">{{ invokeamount }}个</text>
      </view>
      <view class="stat-item">
        <text>有效总喂食量</text>
        <text class="stat-value">{{ invokefood }}g</text>
      </view>
    </view>

    <!-- 保存按钮 -->
    <button class="save-btn" @click="savePlan">
      <text>保存喂食计划</text>
    </button>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const timeSlots = ref([])
const selectedTime = ref('')
const foodAmount = ref('')
const invokeamount = ref(0)
const invokefood = ref(0)
onMounted(()=>{
  getAlltime()
})

function getAlltime(){
  uni.request({
    url: "https://apis.bemfa.com/vb/delay/v1/timeList",
    method: "GET",
    data: {
      openID: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topicID: 'food'
    },
    success: function (res) {
      timeSlots.value = res.data.data.data
      computeNum()
      console.log(timeSlots.value);
      console.log(timeSlots.value[0].time);
    },
    fail: function (err) {
      console.error("请求失败", err);
    }
})
}

const getAmount = (msg) => {
  try {
    const data = JSON.parse(msg);
    return data.num * 200;
  } catch (e) {
    console.error('Failed to parse msg:', e);
    return 0; // 或者其他默认值
  }
};
const deleteTimeSlot = (ID) =>{
  console.log(ID);
  uni.request({
    url: "https://apis.bemfa.com/vb/delay/v1/deleteTime",
    method: "POST",
    data: {
      openID: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topicID: 'food',
      id:ID
    },
    success: function (res) {
      console.log("删除成功~");
      //重新获取时间
      getAlltime();
    },
    fail: function (err) {
      console.error("请求失败", err);
    }
})
}
//添加新的时间点
// 构造 msg 并提交到服务器
function addTimeSlot() {
  if (!selectedTime.value || !foodAmount.value) {
    uni.showToast({ title: '请输入时间和克数', icon: 'none' })
    return
  }

  const num = parseInt(foodAmount.value)/200
  if (isNaN(num) || num <= 0) {
    uni.showToast({ title: '请输入有效的克数', icon: 'none' })
    return
  }
  // 将 HH:mm 补全为 HH:mm:ss
  const fullTime = selectedTime.value + ":00"
  uni.request({
    url: "https://apis.bemfa.com/vb/delay/v1/addTime",
    method: "POST",
    data: {
      time: fullTime,
      openID: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topicID: 'food',
      week: [0,1,2,3,4,5,6],
      msg: JSON.stringify({
        num: num,
        status: 'on'
      })
    },
    success: function (res) {
      uni.showToast({ title: '添加成功' });
      console.log(res.data);
      selectedTime.value = ''
      foodAmount.value = ''
      getAlltime()
    },
    fail: function (err) {
      console.error("请求失败", err);
      uni.showToast({ title: '添加失败', icon: 'none' });
    }
  })
}
// 获取选中的时间
function onTimeChange(e) {
  const value = e.detail.value // 返回 HH:mm 格式
  selectedTime.value = value
}

function probitTime(ID) {
  uni.request({
    url: "https://apis.bemfa.com/vb/delay/v1/disableTime",
    method: "POST",
    data: {
      openID: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topicID: 'food',
      id:ID
    },
    success: function (res) {
      uni.showToast({ title: '已禁用' });
      //重新获取时间
      getAlltime();
    },
    fail: function (err) {
      console.error("请求失败", err);
    }
})
}

function invokeTime(ID) {
  uni.request({
    url: "https://apis.bemfa.com/vb/delay/v1/enableTime",
    method: "POST",
    data: {
      openID: '6fc94297b1a4771e713523fd16d19702',
      type: 1,
      topicID: 'food',
      id:ID
    },
    success: function (res) {
      uni.showToast({ title: '已启用' });
      //重新获取时间
      getAlltime();
    },
    fail: function (err) {
      console.error("请求失败", err);
    }
})
}

function computeNum() {
  invokeamount.value = 0
  invokefood.value = 0
  timeSlots.value.forEach((item,index)=>{
      if (item.status == 1) {
        invokeamount.value +=1
        invokefood.value += getAmount(item.msg)
      }
  })
}
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
    
    &.disabled {
    background-color: #e0e0e0; // 设置禁用时的背景颜色为灰色
    opacity: 0.7;
  }

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
.time-picker {
  flex: 1;
  padding-left: 10px;
  font-size: 16px;
  color: #333;
}

.amount-input {
  flex: 1;
  padding-left: 10px;
  font-size: 16px;
  border: none;
  background-color: transparent;
}

</style>