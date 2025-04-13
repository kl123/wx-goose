<template>
  <view class="container">
    <view class="card-container">
      <view class="card" v-for="(area, index) in areas" :key="index" @click="handleCardClick(area)">
        <text class="card-name">{{ area.name }}</text>
        <text class="card-remaining">剩余: {{ area.remaining }}{{ area.unit }}</text>
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

const config = {
  url: 'wxs://bemfa.com:9504/wss',
  options: {
    clientId: '6fc94297b1a4771e713523fd16d19702',
    keepalive: 60,
    clean: true,
    protocolVersion: 4,
  },
  foodTopic: 'food',
  waterTopic: 'water',
  leaveTopic: 'leave'
};

let client = ref(null);

// 初始化水量，确保为有效数值
const storedWater = uni.getStorageSync('waterRemaining');
const initialWater = Number.isFinite(parseFloat(storedWater)) ? parseFloat(storedWater) : 40;

const areas = ref([
  { name: '蓄水池', icon: '/static/feed/蓄水池.png', remaining: 60, unit: '%' },
  { 
    name: '喂水区', 
    icon: '/static/feed/喂水区.png', 
    remaining: initialWater, 
    unit: '%' 
  },
  { name: '饲料池', icon: '/static/feed/饲料池.png', remaining: 400, unit: '斤' },
  { name: '饲料区', icon: '/static/feed/饲料区.png', remaining: 300, unit: '斤' },
]);

const initMQTT = () => {
  return new Promise((resolve, reject) => {
    uni.showLoading({ title: '连接设备中...', mask: true });
    
    client.value = mqtt.connect(config.url, config.options);

    client.value.on('connect', () => {
      console.log('✅ MQTT连接成功');
      uni.hideLoading();
      uni.showToast({ title: '设备连接成功', icon: 'success' });
      
      client.value.subscribe(config.leaveTopic, { qos: 1 }, (err) => {
        if (err) {
          console.error('订阅失败:', err);
          reject(err);
        } else {
          console.log(`成功订阅主题: ${config.leaveTopic}`);
          resolve(true);
        }
      });
    });

    client.value.on('error', (err) => {
      console.error('❌ MQTT连接错误:', err);
      uni.hideLoading();
      uni.showToast({ title: '设备连接失败', icon: 'none' });
      reject(err);
    });

    client.value.on('message', (topic, message) => {
      console.log('MQTT消息:', topic, message.toString());
    });
  });
};

const sendControlCommand = (topic, data) => {
  if (!client.value || !client.value.connected) {
    console.error('MQTT客户端未连接');
    uni.showToast({
      title: '设备未连接',
      icon: 'none'
    });
    return;
  }

  client.value.publish(topic, JSON.stringify(data), { qos: 1 }, (err) => {
    if (err) {
      console.error('发送指令失败:', err);
      uni.showToast({
        title: '发送指令失败',
        icon: 'none'
      });
    } else {
      console.log('指令发送成功:', data);
    }
  });
};

const handleCardClick = (area) => {
  if (area.name === '蓄水池') {
    uni.showModal({
      title: '抽水到喂水区',
      editable: true,
      placeholderText: '输入水量百分比(0-100)',
      success: (res) => {
        if (res.confirm) {
          const amount = parseFloat(res.content);
          if (!isNaN(amount) && amount > 0 && amount <= 100) {
            if (area.remaining >= amount) {
              area.remaining -= amount;
              const feedingArea = areas.value.find(a => a.name === '喂水区');
              if (feedingArea) {
                feedingArea.remaining = Math.min(feedingArea.remaining + amount, 100);
                uni.setStorageSync('waterRemaining', feedingArea.remaining);
                sendControlCommand(config.waterTopic, {
                  num: Math.floor(amount / 10),
                  status: "on"
                });
              }
            } else {
              uni.showToast({
                title: '蓄水池水量不足',
                icon: 'none',
              });
            }
          } else {
            uni.showToast({
              title: '请输入0-100之间的有效百分比',
              icon: 'none',
            });
          }
        }
      },
    });
  } else if (area.name === '饲料池') {
    uni.showModal({
      title: '加饲料到饲料区',
      editable: true,
      placeholderText: '输入饲料量(斤)',
      success: (res) => {
        if (res.confirm) {
          const amount = parseFloat(res.content);
          if (!isNaN(amount) && amount > 0) {
            if (area.remaining >= amount) {
              area.remaining -= amount;
              const feedingArea = areas.value.find(a => a.name === '饲料区');
              if (feedingArea) {
                feedingArea.remaining += amount;
                const num = Math.floor(amount / 100);
                if (num > 0) {
                  sendControlCommand(config.foodTopic, {
                    num: num,
                    status: "on"
                  });
                }
              }
            } else {
              uni.showToast({
                title: '饲料池饲料不足',
                icon: 'none',
              });
            }
          } else {
            uni.showToast({
              title: '请输入有效的饲料量',
              icon: 'none',
            });
          }
        }
      },
    });
  }
};

const navigateTo = (page) => {
  const waterArea = areas.value.find(a => a.name === '喂水区');
  if (page === 'feedWater') {
    console.log('导航到 feedWater，水量:', waterArea.remaining);
    uni.navigateTo({
      url: `/pages/feed/${page}?remaining=${waterArea.remaining}`
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
    if (waterArea && Number.isFinite(data.used)) {
      const newRemaining = Math.max(waterArea.remaining - data.used, 0);
      console.log('计算新水量:', { old: waterArea.remaining, used: data.used, new: newRemaining });
      waterArea.remaining = newRemaining;
      uni.setStorageSync('waterRemaining', newRemaining);
      areas.value = [...areas.value]; // 触发响应式更新
      console.log('更新喂水区水量:', waterArea.remaining);
    } else {
      console.error('无效的水量数据:', { waterArea, used: data.used });
    }
  });

  try {
    await initMQTT();
  } catch (err) {
    console.error('MQTT初始化失败:', err);
    setTimeout(() => initMQTT(), 5000);
  }
});

onShow(() => {
  const storedWater = uni.getStorageSync('waterRemaining');
  const waterArea = areas.value.find(a => a.name === '喂水区');
  if (waterArea) {
    const newRemaining = Number.isFinite(parseFloat(storedWater)) ? parseFloat(storedWater) : waterArea.remaining;
    waterArea.remaining = newRemaining;
    console.log('onShow 同步喂水区水量:', waterArea.remaining);
    areas.value = [...areas.value];
  }
});

onUnmounted(() => {
  uni.$off('updateWater');
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
  color: #666;
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