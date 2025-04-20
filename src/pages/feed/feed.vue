<template>
  <view class="container">
    <view class="card-container">
      <view class="card" v-for="(area, index) in areas" :key="index" @click="handleCardClick(area)">
        <text class="card-name">{{ area.name }}</text>
        <text class="card-remaining" :style="area.style">剩余: {{ area.remaining.toFixed(1) }}{{ area.unit }}</text>
        <image class="card-icon" :src="area.icon" mode="aspectFit"></image>
      </view>
    </view>

    <!-- 新增出水/进水控制模块 -->
    <view class="water-control-container">
      <view class="control-module" :style="status1 === 'on' ? 'background-color: #e6f7ff; border-color: #1890ff;' : ''">
        <text class="control-title">出水控制</text>
        <view class="control-buttons">
          <button 
            class="control-button" 
            :class="status1 === 'on' ? 'active-button' : ''"
            @click="handleWaterControl('status1', 'on')"
          >开</button>
          <button 
            class="control-button" 
            :class="status1 === 'off' ? 'active-button' : ''"
            @click="handleWaterControl('status1', 'off')"
          >关</button>
        </view>
        <text class="control-status">{{ status1 === 'on' ? '出水开' : '出水关' }}</text>
      </view>
      
      <view class="control-module" :style="status2 === 'on' ? 'background-color: #e6f7ff; border-color: #1890ff;' : ''">
        <text class="control-title">进水控制</text>
        <view class="control-buttons">
          <button 
            class="control-button" 
            :class="status2 === 'on' ? 'active-button' : ''"
            @click="handleWaterControl('status2', 'on')"
          >开</button>
          <button 
            class="control-button" 
            :class="status2 === 'off' ? 'active-button' : ''"
            @click="handleWaterControl('status2', 'off')"
          >关</button>
        </view>
        <text class="control-status">{{ status2 === 'on' ? '进水开' : '进水关' }}</text>
      </view>
    </view>

    <view class="action-container">
      <view class="action-card" @click="navigateTo('feedWater')">
        <image class="action-icon" src="/static/feed/feedWater.png" mode="aspectFit"></image>
        <text class="action-name">喂水</text>
      </view>
      <view class="action-card" @click="navigateTo('feedFood')">
        <image class="action-icon" src="/static/feed/feedFood.png" mode="aspectFit"></image>
        <text class="action-name">喂食</text>
      </view>
    </view>
    
    <view class="disease-card" @click="navigateTo('disease')">
      <image class="disease-icon" src="/static/feed/disease.png" mode="aspectFit"></image>
      <text class="disease-name">疾病记录</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { onMounted, onUnmounted } from 'vue';
import mqtt from 'mqtt/dist/mqtt';

// MQTT 配置
const config = {
  url: 'wxs://bemfa.com:9504/wss',
  options: {
      clientId: '6fc94297b1a4771e713523fd16d19702',
      keepalive: 30,  // 从60秒改为30秒更频繁的心跳
      clean: true,
      protocolVersion: 4,
      reconnectPeriod: 1000,  // 更快速重连
      connectTimeout: 5000,
      resubscribe: true  // 确保重连后重新订阅
    },
  foodTopic: 'food',
  waterTopic: 'water',
  leaveTopic: 'leave',
  waterChangeTopic: 'waterchange' // 新增出水进水控制主题
};

let client = ref(null);
const isProcessing = ref(false);
const lastMessages = ref(new Map());

// 新增出水进水状态
const status1 = ref('off'); // 出水状态
const status2 = ref('off'); // 进水状态

// 初始化水量和饲料量
const storedWater = uni.getStorageSync('waterRemaining');
const initialWater = Number.isFinite(parseFloat(storedWater)) ? parseFloat(storedWater) : 40;
const storedFood = uni.getStorageSync('foodRemaining');
const initialFood = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : 1000;

const areas = ref([
  { name: '蓄水池', icon: '/static/feed/蓄水池.png', remaining: 60, unit: '%', style: '' },
  { name: '喂水区', icon: '/static/feed/喂水区.png', remaining: initialWater, unit: '%', style: '' },
  { name: '饲料池', icon: '/static/feed/饲料池.png', remaining: 400, unit: '斤', style: '' },
  { name: '饲料区', icon: '/static/feed/饲料区.png', remaining: initialFood, unit: '斤', style: '' }
]);

// 动态样式
const updateAreaStyles = () => {
  areas.value.forEach(area => {
    if (area.name === '喂水区' || area.name === '蓄水池') {
      area.style = area.remaining > 50 ? 'color: #52c41a;' : area.remaining > 20 ? 'color: #faad14;' : 'color: #f5222d;';
    } else if (area.name === '饲料区' || area.name === '饲料池') {
      area.style = area.remaining > 500 ? 'color: #52c41a;' : area.remaining > 200 ? 'color: #faad14;' : 'color: #f5222d;';
    }
  });
  areas.value = [...areas.value];
};

// 新增出水进水控制处理
// 新增出水进水控制处理
const handleWaterControl = async (type, value) => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  
  // 先更新本地状态，提供即时反馈
  if (type === 'status1') {
    status1.value = value;
  } else if (type === 'status2') {
    status2.value = value;
  }
  
  try {
    // 发送MQTT指令（不再等待响应）
    sendControlCommand(config.waterChangeTopic, {
      status1: status1.value,
      status2: status2.value
    }).catch(err => {
      console.error('发送指令失败（静默处理）:', err);
    });
    
    uni.showToast({
      title: `${type === 'status1' ? '出水' : '进水'}${value === 'on' ? '开启' : '关闭'}操作已发送`,
      icon: 'success'
    });
  } catch (error) {
    console.error('控制失败:', error);
    // 不再自动恢复状态，因为可能已经成功
    uni.showToast({
      title: `${type === 'status1' ? '出水' : '进水'}操作发送完成`,
      icon: 'none'
    });
  } finally {
    isProcessing.value = false;
  }
};

// 初始化 MQTT
const initMQTT = () => {
  return new Promise((resolve, reject) => {
    if (client.value && client.value.connected) {
      console.log('MQTT已连接，无需重复初始化');
      resolve(true);
      return;
    }

    uni.showLoading({ title: '连接设备中...', mask: true });
    
    client.value = mqtt.connect(config.url, config.options);

    client.value.on('connect', () => {
      console.log('✅ MQTT连接成功');
      uni.hideLoading();
      uni.showToast({ title: '设备连接成功', icon: 'success', duration: 1000 });
      
      client.value.subscribe([config.leaveTopic, config.waterTopic, config.foodTopic, config.waterChangeTopic], { qos: 1 }, (err) => {
        if (err) {
          console.error('订阅失败:', err);
          uni.hideLoading();
          reject(err);
        } else {
          console.log(`成功订阅主题: ${config.leaveTopic}, ${config.waterTopic}, ${config.foodTopic}, ${config.waterChangeTopic}`);
          resolve(true);
        }
      });
    });

    client.value.on('message', (topic, message) => {
      console.log('收到MQTT消息:', topic, message.toString());
      try {
        const data = JSON.parse(message.toString());
        const messageKey = `${topic}:${JSON.stringify(data)}`;
        if (lastMessages.value.get(messageKey) === data.num) {
          console.log('忽略重复消息:', messageKey);
          return;
        }
        lastMessages.value.set(messageKey, data.num);

        if (topic === config.waterTopic && data.status === 'on' && data.num) {
          console.log('水量指令:', data.num);
        } else if (topic === config.foodTopic && data.status === 'on' && data.num) {
          console.log('饲料指令:', data.num);
          const amount = data.num * 100;
          const feedingArea = areas.value.find(a => a.name === '饲料区');
          const poolArea = areas.value.find(a => a.name === '饲料池');
          if (feedingArea && poolArea && poolArea.remaining >= amount) {
            poolArea.remaining -= amount;
            feedingArea.remaining += amount;
            uni.setStorageSync('foodRemaining', feedingArea.remaining);
            updateAreaStyles();
            console.log('根据MQTT消息更新饲料量:', { pool: poolArea.remaining, feeding: feedingArea.remaining });
          }
        } else if (topic === config.waterChangeTopic) {
          // 处理出水进水状态更新
          if (data.status1 !== undefined) {
            status1.value = data.status1;
            console.log('更新出水状态:', data.status1);
          }
          if (data.status2 !== undefined) {
            status2.value = data.status2;
            console.log('更新进水状态:', data.status2);
          }
        }
      } catch (error) {
        console.error('解析MQTT消息失败:', error);
      }
    });

    client.value.on('error', (err) => {
      console.error('❌ MQTT连接错误:', err);
      uni.hideLoading();
      uni.showToast({ title: '设备连接失败', icon: 'none' });
      reject(err);
    });

    client.value.on('reconnect', () => {
      console.log('正在尝试重新连接MQTT...');
    });

    client.value.on('close', () => {
      console.log('MQTT连接断开');
    });
  });
};

// 发送控制指令
// 发送控制指令
const sendControlCommand = (topic, data) => {
  return new Promise((resolve, reject) => {
    if (!client.value) {
      console.error('MQTT客户端未初始化');
      uni.showToast({ title: '设备未初始化', icon: 'none' });
      reject(new Error('MQTT客户端未初始化'));
      return;
    }

    if (!client.value.connected) {
      console.error('MQTT客户端未连接');
      uni.showToast({ title: '设备未连接', icon: 'none' });
      client.value.reconnect();
      reject(new Error('MQTT客户端未连接'));
      return;
    }

    console.log('准备发布MQTT消息:', { topic, data });
    
    // 缩短超时时间（从8秒改为3秒）
    const timeout = setTimeout(() => {
      console.log('MQTT发布超时，但可能已发送成功:', topic);
      // 不再reject，而是resolve，因为消息可能已经发送成功
      resolve(true);
    }, 3000);

    client.value.publish(topic, JSON.stringify(data), { qos: 1 }, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error('发送指令失败:', err);
        reject(err);
      } else {
        console.log('指令发送成功:', data);
        resolve(true);
      }
    });
  });
};

// 处理卡片点击
const handleCardClick = async (area) => {
  if (isProcessing.value) {
    console.log('操作进行中，请稍后');
    return;
  }
  isProcessing.value = true;

  try {
    if (area.name === '蓄水池') {
      uni.showModal({
        title: '抽水到喂水区',
        editable: true,
        placeholderText: '输入水量百分比(0-100)',
        success: async (res) => {
          if (res.confirm) {
            const amount = parseFloat(res.content);
            if (!isNaN(amount) && amount > 0 && amount <= 100) {
              if (area.remaining >= amount) {
                try {
                  await sendControlCommand(config.waterTopic, { num: Math.floor(amount / 10), status: 'on' });
                  area.remaining -= amount;
                  const feedingArea = areas.value.find(a => a.name === '喂水区');
                  if (feedingArea) {
                    feedingArea.remaining = Math.min(feedingArea.remaining + amount, 100);
                    uni.setStorageSync('waterRemaining', feedingArea.remaining);
                    updateAreaStyles();
                    uni.showToast({ title: `抽水 ${amount}% 成功`, icon: 'success' });
                  }
                } catch (error) {
                  console.error('抽水失败:', error);
                  if (error.message === 'MQTT发布超时') {
                    uni.showToast({ title: `抽水 ${amount}% 已记录，设备响应可能延迟`, icon: 'success' });
                    area.remaining -= amount;
                    const feedingArea = areas.value.find(a => a.name === '喂水区');
                    if (feedingArea) {
                      feedingArea.remaining = Math.min(feedingArea.remaining + amount, 100);
                      uni.setStorageSync('waterRemaining', feedingArea.remaining);
                      updateAreaStyles();
                    }
                  } else {
                    uni.showToast({ title: '抽水失败: ' + error.message, icon: 'none' });
                  }
                }
              } else {
                uni.showToast({ title: '蓄水池水量不足', icon: 'none' });
              }
            } else {
              uni.showToast({ title: '请输入0-100之间的有效百分比', icon: 'none' });
            }
          }
          isProcessing.value = false;
        },
        fail: () => {
          isProcessing.value = false;
        }
      });
    } else if (area.name === '饲料池') {
      uni.showModal({
        title: '加饲料到饲料区',
        editable: true,
        placeholderText: '输入饲料量(斤)',
        success: async (res) => {
          if (res.confirm) {
            const amount = parseFloat(res.content);
            if (!isNaN(amount) && amount > 0) {
              if (area.remaining >= amount) {
                try {
                  const num = Math.floor(amount / 100);
                  if (num > 0) {
                    await sendControlCommand(config.foodTopic, { num, status: 'on' });
                  }
                  area.remaining -= amount;
                  const feedingArea = areas.value.find(a => a.name === '饲料区');
                  if (feedingArea) {
                    feedingArea.remaining += amount;
                    uni.setStorageSync('foodRemaining', feedingArea.remaining);
                    updateAreaStyles();
                    uni.showToast({ title: `加饲料 ${amount} 斤成功`, icon: 'success' });
                  }
                } catch (error) {
                  console.error('加饲料失败:', error);
                  if (error.message === 'MQTT发布超时') {
                    uni.showToast({ title: `加饲料 ${amount} 斤已记录，设备响应可能延迟`, icon: 'success' });
                    area.remaining -= amount;
                    const feedingArea = areas.value.find(a => a.name === '饲料区');
                    if (feedingArea) {
                      feedingArea.remaining += amount;
                      uni.setStorageSync('foodRemaining', feedingArea.remaining);
                      updateAreaStyles();
                    }
                  } else {
                    uni.showToast({ title: '加饲料失败: ' + error.message, icon: 'none' });
                  }
                }
              } else {
                uni.showToast({ title: '饲料池饲料不足', icon: 'none' });
              }
            } else {
              uni.showToast({ title: '请输入有效的饲料量', icon: 'none' });
            }
          }
          isProcessing.value = false;
        },
        fail: () => {
          isProcessing.value = false;
        }
      });
    } else {
      isProcessing.value = false;
    }
  } catch (error) {
    console.error('操作失败:', error);
    isProcessing.value = false;
  }
};

// 导航
const navigateTo = (page) => {
  if (page === 'feedWater') {
    const waterArea = areas.value.find(a => a.name === '喂水区');
    console.log('导航到 feedWater，水量:', waterArea.remaining);
    uni.navigateTo({
      url: `/pages/feed/${page}?remaining=${waterArea.remaining}`
    });
  } else if (page === 'feedFood') {
    const foodArea = areas.value.find(a => a.name === '饲料区');
    console.log('导航到 feedFood，饲料量:', foodArea.remaining);
    uni.navigateTo({
      url: `/pages/feed/${page}?remaining=${foodArea.remaining}`
    });
  } else {
    uni.navigateTo({
      url: `/pages/feed/${page}`
    });
  }
};

onMounted(async () => {
  uni.$on('updateWater', (data) => {
    console.log('收到 updateWater 事件:', data);
    const waterArea = areas.value.find(a => a.name === '喂水区');
    if (waterArea && Number.isFinite(data.remaining)) {
      waterArea.remaining = data.remaining;
      uni.setStorageSync('waterRemaining', waterArea.remaining);
      updateAreaStyles();
      console.log('更新喂水区水量:', waterArea.remaining);
    } else {
      console.error('无效的水量数据:', { waterArea, data });
    }
  });

  uni.$on('updateFood', (data) => {
    console.log('收到 updateFood 事件:', data);
    const foodArea = areas.value.find(a => a.name === '饲料区');
    if (foodArea && Number.isFinite(data.remaining)) {
      foodArea.remaining = data.remaining;
      uni.setStorageSync('foodRemaining', foodArea.remaining);
      updateAreaStyles();
      console.log('更新饲料区饲料量:', foodArea.remaining);
    } else {
      console.error('无效的饲料量数据:', { foodArea, data });
    }
  });

  try {
    await initMQTT();
  } catch (err) {
    console.error('MQTT初始化失败:', err);
    setTimeout(() => initMQTT(), 3000);
  }
});

onShow(() => {
  const storedWater = uni.getStorageSync('waterRemaining');
  const waterArea = areas.value.find(a => a.name === '喂水区');
  if (waterArea) {
    waterArea.remaining = Number.isFinite(parseFloat(storedWater)) ? parseFloat(storedWater) : initialWater;
    console.log('onShow 同步喂水区水量:', waterArea.remaining);
  }

  const storedFood = uni.getStorageSync('foodRemaining');
  const foodArea = areas.value.find(a => a.name === '饲料区');
  if (foodArea) {
    foodArea.remaining = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : initialFood;
    console.log('onShow 同步饲料区饲料量:', foodArea.remaining);
  }

  updateAreaStyles();
});

onUnmounted(() => {
  uni.$off('updateWater');
  uni.$off('updateFood');
  if (client.value && client.value.connected) {
    client.value.end();
  }
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.card-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
}

.card {
  width: 38%;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  aspect-ratio: 3 / 2;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.2s;
}

.card:hover {
  transform: scale(1.02);
}

.card-name {
  font-size: 18px;
  font-weight: bold;
  position: absolute;
  top: 10px;
  right: 10px;
}

.card-remaining {
  font-size: 14px;
  position: absolute;
  bottom: 10px;
  left: 10px;
}

.card-icon {
  width: 30px;
  height: 30px;
  position: absolute;
  top: 10px;
  left: 10px;
}

/* 新增出水进水控制模块样式 */
.water-control-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 10px;
}

.control-module {
  width: 48%;
  background-color: #f9f9f9;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s;
}

.control-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.control-buttons {
  display: flex;
  width: 100%;
  justify-content: space-around;
  margin-bottom: 8px;
}

.control-button {
  width: 45%;
  height: 32px;
  line-height: 32px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background-color: #fff;
  color: #333;
}

.active-button {
  background-color: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.control-status {
  font-size: 14px;
  color: #666;
}

.action-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 20px;
}

.action-card {
  width: 28%;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.action-card:hover {
  transform: scale(1.02);
}

.action-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.action-name {
  font-size: 16px;
  margin-top: 10px;
}

.disease-card {
  width: 90%;
  height: 80px;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 15px;
  margin-top: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}

.disease-card:hover {
  transform: scale(1.02);
}

.disease-icon {
  width: 40px;
  height: 40px;
  margin-right: 15px;
}

.disease-name {
  font-size: 20px;
  font-weight: bold;
}
</style>