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
          @input="restrictInput"
        />
      </view>
      <text class="manual-feed-text" v-if="manualDispensed > 0">
        今日已手动出粮: {{ manualDispensed }} 斤
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
      <view class="action-button" @click="handleDispense" :class="{ 'disabled': isDispensing }">
        <image class="action-icon" src="/static/feed/goose.png" mode="aspectFit"></image>
        <text class="action-text">{{ isDispensing ? '出粮中...' : '立即出粮' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { onMounted, onUnmounted } from 'vue';
import mqtt from 'mqtt/dist/mqtt.js';

const manualDispenseAmount = ref('');
const manualDispensed = ref(0);
const plannedAmount = ref(0);
const timeSlots = ref(['00:00', '06:00', '12:00', '18:00', '24:00']);
const mealAmounts = ref([0, 0, 0, 0, 0]);
const isFed = ref([false, false, false, false, false]);
const fedAmounts = ref([0, 0, 0, 0, 0]);
const isDispensing = ref(false);

// 初始化剩余饲料量
const storedFood = uni.getStorageSync('foodRemaining');
const foodRemaining = ref(Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : 1000);

// 饲料状态
const foodStatus = computed(() => {
  if (foodRemaining.value > 500) return '充足';
  if (foodRemaining.value > 200) return '正常';
  return '不足';
});

const foodStatusStyle = computed(() => {
  if (foodRemaining.value > 500) return 'color: #52c41a;';
  if (foodRemaining.value > 200) return 'color: #faad14;';
  return 'color: #f5222d;';
});

// MQTT 配置
const mqttConfig = {
  url: 'wxs://bemfa.com:9504/wss',
  options: {
    clientId: '6fc94297b1a4771e713523fd16d19702',
    keepalive: 60,
    clean: true,
    protocolVersion: 4,
  },
  topic: 'food'
};

// 响应式数据
const deviceStatus = ref('连接中...');
let client = ref(null);
let reconnectTimer = ref(null);
let pendingDispense = ref(null); // 跟踪出粮请求
let lastMessage = ref(null); // 去重记录

// 生命周期
onMounted(() => {
  initMQTT();
});

onUnmounted(() => {
  disconnectMQTT();
});

const initMQTT = () => {
  client.value = mqtt.connect(mqttConfig.url, mqttConfig.options);

  client.value.on('connect', () => {
    deviceStatus.value = '已连接';
    console.log('✅ MQTT连接成功');
    client.value.subscribe(mqttConfig.topic, { qos: 1 }, (err) => {
      if (err) {
        console.error('订阅food主题失败:', err);
        uni.showToast({ title: '订阅food主题失败', icon: 'none' });
      } else {
        console.log('订阅food主题成功');
      }
    });
  });

  client.value.on('message', (topic, message) => {
    const messageStr = message.toString().trim();
    console.log(`调试: 收到MQTT消息 - 主题: ${topic}, 内容: ${messageStr}`);
    
    if (!messageStr) {
      console.error('收到空MQTT消息');
      return;
    }

    try {
      const data = JSON.parse(messageStr);

      // 去重检查
      if (lastMessage.value === messageStr) {
        console.log('忽略重复消息:', messageStr);
        return;
      }
      lastMessage.value = messageStr;

      // 处理出粮响应
      if (pendingDispense.value && data.status === 'success' && data.num === -1) {
        const { inputAmount, resolve } = pendingDispense.value;
        console.log('handleDispense 收到MQTT响应:', data);
        resolve({ feedAmount: inputAmount });
        pendingDispense.value = null;
      } else if (data.status === 'error') {
        console.error('硬件错误:', data.message);
        if (pendingDispense.value) {
          pendingDispense.value.reject(new Error(data.message || '硬件错误'));
          pendingDispense.value = null;
        }
      }
    } catch (error) {
      console.error('解析MQTT消息失败:', error.message, '原始消息:', messageStr);
    }
  });

  client.value.on('error', (err) => {
    deviceStatus.value = '连接异常';
    console.error('MQTT错误:', err);
    handleReconnect();
  });

  client.value.on('close', () => {
    deviceStatus.value = '连接断开';
    console.log('MQTT连接断开');
    handleReconnect();
  });
};

const handleReconnect = () => {
  if (!reconnectTimer.value) {
    reconnectTimer.value = setInterval(() => {
      if (!client.value.connected) {
        deviceStatus.value = '尝试重连...';
        console.log('尝试重连...');
        initMQTT();
      }
    }, 5000);
  }
};

const disconnectMQTT = () => {
  if (client.value) {
    client.value.end();
    client.value = null;
  }
  if (reconnectTimer.value) {
    clearInterval(reconnectTimer.value);
    reconnectTimer.value = null;
  }
};

const sendFeedCommand = (num) => {
  console.log('进入 sendFeedCommand，num:', num);
  
  if (!client.value || !client.value.connected) {
    deviceStatus.value = '未连接，无法发送';
    console.log('MQTT客户端未连接，无法发送');
    uni.showToast({ title: '设备未连接', icon: 'none' });
    return false;
  }

  const payload = { num, status: 'on' };
  console.log(`准备发布MQTT消息: ${JSON.stringify(payload)}`);

  if (client.value.connected) {
    client.value.publish(
      mqttConfig.topic,
      JSON.stringify(payload),
      { qos: 1 },
      (err) => {
        if (err) {
          console.error('发送失败:', err);
          deviceStatus.value = '发送失败';
          uni.showToast({ title: '发送指令失败', icon: 'none' });
          return false;
        } else {
          console.log('消息发送成功:', payload);
          deviceStatus.value = '消息已发送';
          return true;
        }
      }
    );
    return true;
  } else {
    console.log('客户端连接已断开，无法发送消息');
    deviceStatus.value = '连接断开，消息未发送';
    uni.showToast({ title: '设备未连接', icon: 'none' });
    return false;
  }
};

// 限制输入
const restrictInput = (event) => {
  let value = event.detail.value;
  value = value.replace(/[^0-9.]/g, '');
  const parts = value.split('.');
  if (parts.length > 2) value = parts[0] + '.' + parts[1];
  if (parts[1] && parts[1].length > 1) value = parts[0] + '.' + parts[1].slice(0, 1);
  if (value.startsWith('0') && value.length > 1 && !value.startsWith('0.')) value = value.replace(/^0+/, '');
  manualDispenseAmount.value = value;
};

// 重置每日数据
const resetDailyData = () => {
  const today = new Date().toDateString();
  const lastReset = uni.getStorageSync('foodLastReset') || '';
  if (lastReset !== today) {
    console.log('重置每日出粮数据');
    manualDispensed.value = 0;
    isFed.value = [false, false, false, false, false];
    fedAmounts.value = [0, 0, 0, 0, 0];
    uni.setStorageSync('foodLastReset', today);
  }
};

const feedProgress = computed(() => {
  return timeSlots.value.map((_, index) => {
    if (mealAmounts.value[index] === 0) return 0;
    if (isFed.value[index]) return 100;
    return Math.min((fedAmounts.value[index] / (mealAmounts.value[index] * 100)) * 100, 100);
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

  return 0;
});

const goToPlanFoodPage = () => {
  uni.navigateTo({
    url: '/pages/planFood/planFood'
  });
};

const handleDispense = async () => {
  if (isDispensing.value) {
    uni.showToast({ title: '出粮进行中，请稍候', icon: 'none', duration: 1500 });
    return;
  }

  const inputAmount = parseFloat(manualDispenseAmount.value);
  if (!inputAmount || inputAmount <= 0 || isNaN(inputAmount)) {
    uni.showToast({ title: '请输入有效的正数出粮斤数', icon: 'none', duration: 1500 });
    return;
  }

  if (inputAmount > foodRemaining.value) {
    uni.showToast({
      title: `饲料不足 (需要: ${inputAmount} 斤, 剩余: ${foodRemaining.value} 斤)`,
      icon: 'none',
      duration: 2000
    });
    return;
  }

  const sendAmount = Math.floor(inputAmount / 100);
  if (sendAmount <= 0) {
    uni.showToast({ title: '出粮量过小，至少 100 斤', icon: 'none', duration: 1500 });
    return;
  }

  isDispensing.value = true;
  uni.showLoading({ title: '出粮中...', mask: true });

  try {
    if (!client.value.connected) {
      console.log('MQTT客户端未连接，尝试重连');
      initMQTT();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!client.value.connected) {
        throw new Error('MQTT客户端无法连接');
      }
    }

    const sent = sendFeedCommand(sendAmount);
    if (!sent) {
      throw new Error('发送指令失败');
    }

    const { feedAmount } = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('MQTT响应超时');
        pendingDispense.value = null;
        reject(new Error('MQTT响应超时'));
      }, 20000); // 延长超时时间到 20 秒

      pendingDispense.value = {
        inputAmount,
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      };
    });

    manualDispensed.value += feedAmount;
    foodRemaining.value = Math.max(foodRemaining.value - feedAmount, 0);
    manualDispenseAmount.value = '';
    uni.setStorageSync('foodRemaining', foodRemaining.value);
    uni.$emit('updateFood', { used: feedAmount, remaining: foodRemaining.value });

    uni.hideLoading();
    isDispensing.value = false;
    uni.showToast({
      title: `出粮成功 ${feedAmount} 斤${foodRemaining.value < 200 ? '，饲料不足，请补充！' : ''}`,
      icon: 'success',
      duration: 2000
    });
  } catch (error) {
    uni.hideLoading();
    isDispensing.value = false;
    uni.showToast({
      title: `出粮失败: ${error.message || '网络或设备错误'}`,
      icon: 'none',
      duration: 2000
    });
    console.error('出粮指令发送失败:', error);
  }
};

const handleFeedIconClick = async (index) => {
  if (!isFed.value[index]) {
    const feedAmount = 100;
    
    if (foodRemaining.value < feedAmount) {
      console.log('定时出粮饲料不足:', { feedAmount, remaining: foodRemaining.value });
      uni.showToast({ 
        title: `饲料不足 (需要:${feedAmount} 斤 剩余:${foodRemaining.value} 斤)`,
        icon: 'none'
      });
      return;
    }
    
    try {
      console.log('发送定时出粮指令:', 1);
      const sent = sendFeedCommand(1);
      if (!sent) {
        throw new Error('发送指令失败');
      }

      fedAmounts.value[index] += feedAmount;
      if (fedAmounts.value[index] >= mealAmounts.value[index] * 100) {
        isFed.value[index] = true;
      }
      
      foodRemaining.value = Math.max(foodRemaining.value - feedAmount, 0);
      
      if (!Number.isFinite(foodRemaining.value)) {
        console.error('更新后饲料量无效，重置为0');
        foodRemaining.value = 0;
      }
      
      uni.setStorageSync('foodRemaining', foodRemaining.value);
      
      console.log('发送 updateFood 事件:', { used: feedAmount, remaining: foodRemaining.value });
      uni.$emit('updateFood', {
        used: feedAmount,
        remaining: foodRemaining.value
      });
      
      console.log('定时出粮成功:', { feedAmount, foodRemaining: foodRemaining.value });
      const toastMessage = foodRemaining.value < 200 
        ? `定时出粮 ${feedAmount} 斤，饲料不足，请补充！`
        : `定时出粮 ${feedAmount} 斤`;
      uni.showToast({ 
        title: toastMessage,
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('定时出粮流程错误:', error.message);
      uni.showToast({
        title: '出粮失败: ' + error.message,
        icon: 'none',
        duration: 2000
      });
    }
  } else {
    console.log('时间点已喂食:', index);
    uni.showToast({ 
      title: '当前时间点已喂食完成', 
      icon: 'none' 
    });
  }
};

onLoad((options) => {
  if (options.remaining) {
    const parsedRemaining = parseFloat(options.remaining);
    foodRemaining.value = Number.isFinite(parsedRemaining) ? parsedRemaining : 1000;
    console.log('初始化饲料量 (来自导航):', foodRemaining.value);
  } else {
    const storedFood = uni.getStorageSync('foodRemaining');
    foodRemaining.value = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : 1000;
    console.log('初始化饲料量 (来自存储):', foodRemaining.value);
  }
  uni.setStorageSync('foodRemaining', foodRemaining.value);
  resetDailyData();
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
  const storedFood = uni.getStorageSync('foodRemaining');
  const newRemaining = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : foodRemaining.value;
  foodRemaining.value = newRemaining;
  console.log('onShow 同步饲料量:', foodRemaining.value);
  uni.setStorageSync('foodRemaining', foodRemaining.value);
  resetDailyData();
});
</script>

<style scoped>
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