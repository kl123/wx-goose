<template>
  <view class="container">
    <view class="card-container">
      <view class="card" v-for="(area, index) in areas" :key="index" @click="handleCardClick(area)">
        <text class="card-name">{{ area.name }}</text>
        <text class="card-remaining" :style="area.style">剩余: {{ area.remaining }}{{ area.unit }}</text>
        <image class="card-icon" :src="area.icon" mode="aspectFit"></image>
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
    keepalive: 60,
    clean: true,
    protocolVersion: 4,
    reconnectPeriod: 1000,
    connectTimeout: 5000
  },
  foodTopic: 'food',
  waterTopic: 'water',
  leaveTopic: 'leave'
};

let client = ref(null);

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
  areas.value = [...areas.value]; // 触发响应式更新
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
      
      client.value.subscribe([config.leaveTopic, config.waterTopic, config.foodTopic], { qos: 1 }, (err) => {
        if (err) {
          console.error('订阅失败:', err);
          uni.hideLoading();
          reject(err);
        } else {
          console.log(`成功订阅主题: ${config.leaveTopic}, ${config.waterTopic}, ${config.foodTopic}`);
          resolve(true);
        }
      });
    });

    client.value.on('message', (topic, message) => {
      console.log('收到MQTT消息:', topic, message.toString());
      try {
        const data = JSON.parse(message.toString());
        if (topic === config.waterTopic && data.status === 'on' && data.num) {
          console.log('水量指令:', data.num);
        } else if (topic === config.foodTopic && data.status === 'on' && data.num) {
          console.log('饲料指令:', data.num);
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
    const timeout = setTimeout(() => {
      console.error('MQTT发布超时:', topic);
      uni.showToast({ title: '指令发送超时', icon: 'none' });
      client.value.reconnect();
      reject(new Error('MQTT发布超时'));
    }, 5000);

    client.value.publish(topic, JSON.stringify(data), { qos: 1 }, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error('发送指令失败:', err);
        uni.showToast({ title: '发送指令失败', icon: 'none' });
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
                uni.showToast({ title: '抽水失败: ' + error.message, icon: 'none' });
              }
            } else {
              uni.showToast({ title: '蓄水池水量不足', icon: 'none' });
            }
          } else {
            uni.showToast({ title: '请输入0-100之间的有效百分比', icon: 'none' });
          }
        }
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
                uni.showToast({ title: '加饲料失败: ' + error.message, icon: 'none' });
              }
            } else {
              uni.showToast({ title: '饲料池饲料不足', icon: 'none' });
            }
          } else {
            uni.showToast({ title: '请输入有效的饲料量', icon: 'none' });
          }
        }
      }
    });
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
  // 监听水量和饲料量更新
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