<template>
  <view class="container">
    <view class="device-info">
      <image class="device-image" src="/static/feed/喂水器皿.png" mode="aspectFit"></image>
    </view>

    <view class="feeding-control">
      <view class="remaining-water" :style="waterStatusStyle">
        <text>当前喂水区剩余水量: {{ waterRemaining }}%</text>
      </view>
      
      <view class="input-row">
        <text class="input-label">出水百分比:</text>
        <input 
          class="input-box" 
          type="number" 
          v-model="manualDispenseAmount" 
          placeholder="请输入出水百分比(0-100)"
        />
      </view>
      <text class="manual-feed-text" v-if="manualDispensed > 0">
        已手动出水: {{ manualDispensed }}%
      </text>
    </view>

    <view class="feeding-plan">
      <text class="plan-title">今日喂水计划</text>
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
            :src="isFed[index] ? '/static/feed/planWater_gray.png' : '/static/feed/planWater.png'" 
            class="feed-icon" 
            mode="aspectFit"
            @click="handleFeedIconClick(index)"
          ></image>
        </view>
      </view>
      <view class="feeding-info">
        <text>本次出水: {{ currentFeedingTime }} {{ currentFeedingAmount }}%</text>
        <text>下次出水: {{ nextFeedingTime }} {{ nextFeedingAmount }}%</text>
      </view>
    </view>

    <view class="action-area">
      <view class="action-button" @click="goToPlanWaterPage">
        <image class="action-icon" src="/static/feed/goose.png" mode="aspectFit"></image>
        <text class="action-text">计划出水</text>
      </view>
      <view class="action-button" @click="handleDispense">
        <image class="action-icon" src="/static/feed/goose.png" mode="aspectFit"></image>
        <text class="action-text">立即出水</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { onMounted, onUnmounted } from 'vue';
import mqtt from 'mqtt/dist/mqtt.js';

const timeSlots = ref(['00:00', '06:00', '12:00', '18:00', '24:00']);
const mealAmounts = ref([0, 0, 0, 0, 0]);
const isFed = ref([false, false, false, false, false]);
const fedAmounts = ref([0, 0, 0, 0, 0]);
const plannedAmount = ref(0);
const manualDispenseAmount = ref('');
const manualDispensed = ref(0);
let mqttClient = ref(null);

// 初始化水量，确保为有效数值
const storedWater = uni.getStorageSync('waterRemaining');
const waterRemaining = ref(Number.isFinite(parseFloat(storedWater)) ? parseFloat(storedWater) : 40);

const waterStatus = computed(() => {
  if (waterRemaining.value > 50) return '充足';
  if (waterRemaining.value > 20) return '正常';
  return '不足';
});

const waterStatusStyle = computed(() => {
  if (waterRemaining.value > 50) return 'color: #52c41a;';
  if (waterRemaining.value > 20) return 'color: #faad14;';
  return 'color: #f5222d;';
});

const mqttConfig = {
  url: 'wxs://bemfa.com:9504/wss',
  options: {
    clientId: '6fc94297b1a4771e713523fd16d19702',
    keepalive: 60,
    clean: true,
    protocolVersion: 4,
    reconnectPeriod: 1000, // 缩短重连间隔
    connectTimeout: 5000
  },
  topics: {
    water: 'water'
  }
};

const initMQTT = async () => {
  try {
    if (typeof mqtt === 'undefined') {
      throw new Error('MQTT库未正确加载');
    }
    
    if (mqttClient.value && mqttClient.value.connected) {
      console.log('MQTT已连接，无需重复初始化');
      return;
    }
    
    mqttClient.value = mqtt.connect(mqttConfig.url, mqttConfig.options);
    
    mqttClient.value.on('connect', () => {
      console.log('✅ MQTT连接成功');
      uni.showToast({ title: '设备连接成功', icon: 'success' });
      
      mqttClient.value.subscribe(mqttConfig.topics.water, { qos: 1 }, (err) => {
        if (err) {
          console.error('订阅water主题失败:', err);
          uni.showToast({ title: '订阅water主题失败', icon: 'none' });
        } else {
          console.log('成功订阅water主题');
        }
      });
    });
    
    mqttClient.value.on('message', (topic, message) => {
      console.log('收到MQTT消息:', topic, message.toString());
      try {
        const data = JSON.parse(message.toString());
        if (topic === mqttConfig.topics.water && data.status === 'on' && data.num) {
          console.log('收到出水指令:', data.num);
        }
      } catch (error) {
        console.error('解析MQTT消息失败:', error);
      }
    });
    
    mqttClient.value.on('error', (err) => {
      console.error('MQTT连接错误:', err);
      uni.showToast({ title: '设备连接失败', icon: 'none' });
    });
    
    mqttClient.value.on('reconnect', () => {
      console.log('正在尝试重新连接MQTT...');
    });
    
    mqttClient.value.on('close', () => {
      console.log('MQTT连接断开');
    });
    
  } catch (error) {
    console.error('MQTT初始化错误:', error);
    uni.showToast({ title: 'MQTT初始化失败: ' + error.message, icon: 'none' });
    setTimeout(initMQTT, 3000);
  }
};

const sendFeedCommand = (amount) => {
  return new Promise((resolve, reject) => {
    console.log('进入 sendFeedCommand，amount:', amount);
    if (!mqttClient.value) {
      console.error('MQTT客户端未初始化');
      uni.showToast({ title: '设备未初始化', icon: 'none' });
      reject(new Error('MQTT客户端未初始化'));
      return;
    }
    
    if (!mqttClient.value.connected) {
      console.error('MQTT客户端未连接');
      uni.showToast({ title: '设备未连接', icon: 'none' });
      reject(new Error('MQTT客户端未连接'));
      mqttClient.value.reconnect();
      return;
    }
    
    const num = Math.floor(amount / 10);
    const command = { num, status: 'on' };
    
    console.log('准备发布MQTT消息:', command);
    const timeout = setTimeout(() => {
      console.error('MQTT发布超时');
      uni.showToast({ title: 'MQTT发布超时', icon: 'none' });
      reject(new Error('MQTT发布超时'));
      mqttClient.value.reconnect();
    }, 5000);
    
    mqttClient.value.publish(
      mqttConfig.topics.water,
      JSON.stringify(command),
      { qos: 1 },
      (err) => {
        clearTimeout(timeout);
        if (err) {
          console.error('MQTT发布失败:', err);
          uni.showToast({ title: '发送指令失败', icon: 'none' });
          reject(err);
          mqttClient.value.reconnect();
        } else {
          console.log('MQTT发布成功:', command);
          resolve(true);
        }
      }
    );
  });
};

const feedProgress = computed(() => {
  return timeSlots.value.map((_, index) => {
    if (mealAmounts.value[index] === 0) return 0;
    if (isFed.value[index]) return 100;
    return Math.min((fedAmounts.value[index] / mealAmounts.value[index]) * 100, 100);
  });
});

const currentFeedingTime = computed(() => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number);
    const slotTime = hour * 60 + minute;
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return timeSlots.value[i];
    }
  }

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return timeSlots.value[i];
    }
  }

  return '无';
});

const currentFeedingAmount = computed(() => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number);
    const slotTime = hour * 60 + minute;
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return mealAmounts.value[i];
    }
  }

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      return mealAmounts.value[i];
    }
  }

  return 0;
});

const nextFeedingTime = computed(() => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  let foundCurrent = false;

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number);
    const slotTime = hour * 60 + minute;
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return timeSlots.value[i];
      } else {
        foundCurrent = true;
      }
    }
  }

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return timeSlots.value[i];
      } else {
        foundCurrent = true;
      }
    }
  }

  return '无';
});

const nextFeedingAmount = computed(() => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  let foundCurrent = false;

  for (let i = 0; i < timeSlots.value.length; i++) {
    const [hour, minute] = timeSlots.value[i].split(':').map(Number);
    const slotTime = hour * 60 + minute;
    if (slotTime >= currentTime && mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return mealAmounts.value[i];
      } else {
        foundCurrent = true;
      }
    }
  }

  for (let i = 0; i < timeSlots.value.length; i++) {
    if (mealAmounts.value[i] > 0 && !isFed.value[i]) {
      if (foundCurrent) {
        return mealAmounts.value[i];
      } else {
        foundCurrent = true;
      }
    }
  }

  return 0;
});

const goToPlanWaterPage = () => {
  uni.navigateTo({
    url: '/pages/planWater/planWater'
  });
};

const handleDispense = async () => {
  console.log('点击立即出水，输入值:', manualDispenseAmount.value);
  const amount = parseFloat(manualDispenseAmount.value);
  
  if (isNaN(amount) || amount <= 0 || amount > 100) {
    console.log('输入验证失败:', { amount });
    uni.showToast({ title: '请输入0-100之间的有效百分比', icon: 'none' });
    return;
  }
  
  console.log('当前剩余水量:', waterRemaining.value);
  if (!Number.isFinite(waterRemaining.value)) {
    console.error('剩余水量无效，重置为40');
    waterRemaining.value = 40;
    uni.setStorageSync('waterRemaining', 40);
  }

  if (amount > waterRemaining.value) {
    console.log('水量不足:', { amount, remaining: waterRemaining.value });
    uni.showToast({ 
      title: `水量不足 (剩余:${waterRemaining.value}%)`, 
      icon: 'none',
      duration: 2000
    });
    return;
  }

  try {
    console.log('发送出水指令:', amount);
    await sendFeedCommand(amount).catch((err) => {
      console.warn('MQTT指令发送失败，仍更新本地状态:', err);
      throw new Error('MQTT指令失败，继续本地更新');
    });
    
    console.log('更新状态前:', { manualDispensed: manualDispensed.value, waterRemaining: waterRemaining.value });
    manualDispensed.value += amount; // 修复为累加
    waterRemaining.value = Math.max(waterRemaining.value - amount, 0);
    manualDispenseAmount.value = '';
    
    if (!Number.isFinite(waterRemaining.value)) {
      console.error('更新后水量无效，重置为0');
      waterRemaining.value = 0;
    }
    
    uni.setStorageSync('waterRemaining', waterRemaining.value);
    
    console.log('发送 updateWater 事件:', { used: amount, remaining: waterRemaining.value });
    uni.$emit('updateWater', {
      used: amount,
      remaining: waterRemaining.value
    });
    
    console.log('出水成功:', { manualDispensed: manualDispensed.value, waterRemaining: waterRemaining.value });
    uni.showToast({ 
      title: `出水成功 ${amount}%`,
      icon: 'success',
      duration: 1500
    });
    
  } catch (error) {
    console.error('出水流程错误:', error.message);
    if (error.message === 'MQTT指令失败，继续本地更新') {
      // MQTT失败时仍更新本地状态
      console.log('更新状态前:', { manualDispensed: manualDispensed.value, waterRemaining: waterRemaining.value });
      manualDispensed.value += amount;
      waterRemaining.value = Math.max(waterRemaining.value - amount, 0);
      manualDispenseAmount.value = '';
      
      if (!Number.isFinite(waterRemaining.value)) {
        console.error('更新后水量无效，重置为0');
        waterRemaining.value = 0;
      }
      
      uni.setStorageSync('waterRemaining', waterRemaining.value);
      
      console.log('发送 updateWater 事件:', { used: amount, remaining: waterRemaining.value });
      uni.$emit('updateWater', {
        used: amount,
        remaining: waterRemaining.value
      });
      
      console.log('出水成功（MQTT失败）:', { manualDispensed: manualDispensed.value, waterRemaining: waterRemaining.value });
      uni.showToast({ 
        title: `出水成功 ${amount}% (设备离线)`,
        icon: 'success',
        duration: 1500
      });
    } else {
      uni.showToast({
        title: '出水失败: ' + error.message,
        icon: 'none',
        duration: 2000
      });
    }
  }
};

const handleFeedIconClick = async (index) => {
  if (!isFed.value[index]) {
    const feedAmount = 10;
    
    if (waterRemaining.value < feedAmount) {
      console.log('定时出水水量不足:', { feedAmount, remaining: waterRemaining.value });
      uni.showToast({ 
        title: `水量不足 (需要:${feedAmount}% 剩余:${waterRemaining.value}%)`,
        icon: 'none'
      });
      return;
    }
    
    try {
      console.log('发送定时出水指令:', feedAmount);
      await sendFeedCommand(feedAmount).catch((err) => {
        console.warn('MQTT指令发送失败，仍更新本地状态:', err);
        throw new Error('MQTT指令失败，继续本地更新');
      });
      
      fedAmounts.value[index] += feedAmount;
      if (fedAmounts.value[index] >= mealAmounts.value[index]) {
        isFed.value[index] = true;
      }
      
      waterRemaining.value = Math.max(waterRemaining.value - feedAmount, 0);
      
      if (!Number.isFinite(waterRemaining.value)) {
        console.error('更新后水量无效，重置为0');
        waterRemaining.value = 0;
      }
      
      uni.setStorageSync('waterRemaining', waterRemaining.value);
      
      console.log('发送 updateWater 事件:', { used: feedAmount, remaining: waterRemaining.value });
      uni.$emit('updateWater', {
        used: feedAmount,
        remaining: waterRemaining.value
      });
      
      console.log('定时出水成功:', { feedAmount, waterRemaining: waterRemaining.value });
      uni.showToast({ 
        title: `定时出水 ${feedAmount}%`,
        icon: 'success'
      });
    } catch (error) {
      console.error('定时出水流程错误:', error.message);
      if (error.message === 'MQTT指令失败，继续本地更新') {
        fedAmounts.value[index] += feedAmount;
        if (fedAmounts.value[index] >= mealAmounts.value[index]) {
          isFed.value[index] = true;
        }
        
        waterRemaining.value = Math.max(waterRemaining.value - feedAmount, 0);
        
        if (!Number.isFinite(waterRemaining.value)) {
          console.error('更新后水量无效，重置为0');
          waterRemaining.value = 0;
        }
        
        uni.setStorageSync('waterRemaining', waterRemaining.value);
        
        console.log('发送 updateWater 事件:', { used: feedAmount, remaining: waterRemaining.value });
        uni.$emit('updateWater', {
          used: feedAmount,
          remaining: waterRemaining.value
        });
        
        console.log('定时出水成功（MQTT失败）:', { feedAmount, waterRemaining: waterRemaining.value });
        uni.showToast({ 
          title: `定时出水 ${feedAmount}% (设备离线)`,
          icon: 'success'
        });
      } else {
        uni.showToast({
          title: '出水失败: ' + error.message,
          icon: 'none',
          duration: 2000
        });
      }
    }
  } else {
    console.log('时间点已喂水:', index);
    uni.showToast({ 
      title: '当前时间点已喂水完成', 
      icon: 'none' 
    });
  }
};

onLoad((options) => {
  if (options.remaining) {
    const parsedRemaining = parseFloat(options.remaining);
    waterRemaining.value = Number.isFinite(parsedRemaining) ? parsedRemaining : 40;
    console.log('初始化水量 (来自导航):', waterRemaining.value);
  } else {
    const storedWater = uni.getStorageSync('waterRemaining');
    waterRemaining.value = Number.isFinite(parseFloat(storedWater)) ? parseFloat(storedWater) : 40;
    console.log('初始化水量 (来自存储):', waterRemaining.value);
  }
  uni.setStorageSync('waterRemaining', waterRemaining.value);
});

onShow(() => {
  const plannedAmountFromStorage = uni.getStorageSync('plannedAmount');
  const mealAmountsFromStorage = uni.getStorageSync('mealAmounts');
  if (plannedAmountFromStorage) {
    plannedAmount.value = parseInt(plannedAmountFromStorage) || 0;
  }
  if (mealAmountsFromStorage) {
    mealAmounts.value = mealAmountsFromStorage.map(amount => parseInt(amount) || 0);
  }
  const storedWater = uni.getStorageSync('waterRemaining');
  const newRemaining = Number.isFinite(parseFloat(storedWater)) ? parseFloat(storedWater) : waterRemaining.value;
  waterRemaining.value = newRemaining;
  console.log('onShow 同步水量:', waterRemaining.value);
  uni.setStorageSync('waterRemaining', waterRemaining.value);
});

onMounted(() => {
  initMQTT();
});

onUnmounted(() => {
  if (mqttClient.value && mqttClient.value.connected) {
    mqttClient.value.end();
  }
});
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
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  transition: opacity 0.3s;
}

.action-button.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.action-icon {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  margin-bottom: 10px;
}

.action-text {
  font-size: 14px;
  color: #333;
}

.remaining-water {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  transition: color 0.3s;
}
</style>