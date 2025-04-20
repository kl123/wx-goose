<template>
  <view class="container">
    <view class="card-container">
      <view class="card" v-for="(area, index) in areas" :key="index" @click="handleCardClick(area)">
        <text class="card-name">{{ area.name }}</text>
        <text class="card-remaining" :style="area.style">剩余: {{ area.remaining.toFixed(1) }}{{ area.unit }}</text>
        <image class="card-icon" :src="area.icon" mode="aspectFit"></image>
      </view>
    </view>

    <!-- 出水/进水控制模块 -->
    <view class="one">
      <view class="left">
        <view class="label">出水装置</view>
        <view class="btn">
          <button class="open" :class="{ active: outWaterStatus === 'on' }" @click="changeState_out('on')">开</button>
          <button class="switch" :class="{ active: outWaterStatus === 'off' }" @click="changeState_out('off')">关</button>
        </view>
      </view>
      <view class="right">
        <view class="label">进水装置</view>
        <view class="btn">
          <button class="open" :class="{ active: inWaterStatus === 'on' }" @click="changeState_in('on')">开</button>
          <button class="switch" :class="{ active: inWaterStatus === 'off' }" @click="changeState_in('off')">关</button>
        </view>
      </view>
    </view>

    <view class="action-container">
      <view class="action-card" @click="navigateTo('feedFood')">
        <image class="action-icon" src="/static/feed/feedFood.png" mode="aspectFit"></image>
        <text class="action-name">喂食</text>
      </view>
    </view>
    
    <view class="disease-card" @click="navigateTo('disease')">
      <image class="disease-icon" src="/static/feed/disease.png" mode="aspectFit"></image>
      <text class="disease-name">疾病记录</text>
    </view>

    <view class="status-bar">
      设备状态: {{ deviceStatus }} | 最后更新: {{ updateTime }}
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import mqtt from 'mqtt/dist/mqtt';

// 控制状态
const outWaterStatus = ref("off");
const inWaterStatus = ref("off");
const deviceStatus = ref('连接中...');
const updateTime = ref('从未更新');
let client = ref(null);
let reconnectTimer = ref(null);

// 初始化饲料量
const storedFood = uni.getStorageSync('foodRemaining');
const initialFood = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : 1000;

const areas = ref([
  { name: '饲料池', icon: '/static/feed/饲料池.png', remaining: 400, unit: '斤', style: '' },
  { name: '饲料区', icon: '/static/feed/饲料区.png', remaining: initialFood, unit: '斤', style: '' }
]);

// 动态样式
const updateAreaStyles = () => {
  areas.value.forEach(area => {
    if (area.name === '饲料区' || area.name === '饲料池') {
      area.style = area.remaining > 500 ? 'color: #52c41a;' : area.remaining > 200 ? 'color: #faad14;' : 'color: #f5222d;';
    }
  });
  areas.value = [...areas.value];
};

// MQTT配置
const config = {
  url: 'wxs://bemfa.com:9504/wss',
  options: {
    clientId: '6fc94297b1a4771e713523fd16d19702',
    keepalive: 60,
    clean: true,
    protocolVersion: 4,
    reconnectPeriod: 2000,
    connectTimeout: 8000
  },
  foodTopic: 'food',
  waterTopic: 'water',
  leaveTopic: 'leave'
};

// 出水进水控制
function changeState_out(status) {
  outWaterStatus.value = status;
  sendWaterStatusMessage(outWaterStatus.value, inWaterStatus.value);
}

function changeState_in(status) {
  inWaterStatus.value = status;
  sendWaterStatusMessage(outWaterStatus.value, inWaterStatus.value);
}

// MQTT初始化
const initMQTT = () => {
  client.value = mqtt.connect(config.url, config.options);

  client.value.on('connect', () => {
    deviceStatus.value = '已连接';
    updateTime.value = new Date().toLocaleTimeString();
    client.value.subscribe([config.waterTopic, config.foodTopic], { qos: 1 }, (err) => {
      if (err) {
        console.error('订阅失败:', err);
      } else {
        console.log('订阅成功');
      }
    });
  });

  client.value.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      updateTime.value = new Date().toLocaleTimeString();
      
      if (topic === config.waterTopic) {
        if (data.status1 !== undefined) {
          outWaterStatus.value = data.status1;
        }
        if (data.status2 !== undefined) {
          inWaterStatus.value = data.status2;
        }
      } else if (topic === config.foodTopic && data.status === 'on' && data.num) {
        const amount = data.num * 100;
        const feedingArea = areas.value.find(a => a.name === '饲料区');
        const poolArea = areas.value.find(a => a.name === '饲料池');
        if (feedingArea && poolArea && poolArea.remaining >= amount) {
          poolArea.remaining -= amount;
          feedingArea.remaining += amount;
          uni.setStorageSync('foodRemaining', feedingArea.remaining);
          updateAreaStyles();
        }
      }
    } catch (error) {
      console.error('解析MQTT消息失败:', error);
    }
  });

  client.value.on('error', (err) => {
    deviceStatus.value = '连接异常';
    console.error('MQTT错误:', err);
    handleReconnect();
  });

  client.value.on('close', () => {
    deviceStatus.value = '连接断开';
    handleReconnect();
  });
};

const handleReconnect = () => {
  if (!reconnectTimer.value) {
    reconnectTimer.value = setInterval(() => {
      if (!client.value?.connected) {
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

const sendWaterStatusMessage = (status_1, status_2) => {
  if (!client.value || !client.value.connected) {
    deviceStatus.value = '未连接，无法发送';
    return;
  }

  const payload = {
    status1: status_1,
    status2: status_2
  };

  if (client.value.connected) {
    client.value.publish(
      config.waterTopic,
      JSON.stringify(payload),
      { qos: 1 },
      (err) => {
        if (err) {
          console.error('发送失败:', err);
          deviceStatus.value = '发送失败';
        } else {
          deviceStatus.value = '消息已发送';
          updateTime.value = new Date().toLocaleTimeString();
        }
      }
    );
  } else {
    deviceStatus.value = '连接断开，消息未发送';
  }
};

// 处理卡片点击
const handleCardClick = async (area) => {
  if (area.name === '饲料池') {
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
                uni.showToast({ title: '加饲料失败', icon: 'none' });
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

const sendControlCommand = (topic, data) => {
  return new Promise((resolve, reject) => {
    if (!client.value?.connected) {
      reject(new Error('MQTT客户端未连接'));
      return;
    }

    client.value.publish(topic, JSON.stringify(data), { qos: 1 }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

// 导航
const navigateTo = (page) => {
  if (page === 'feedFood') {
    const foodArea = areas.value.find(a => a.name === '饲料区');
    uni.navigateTo({
      url: `/pages/feed/${page}?remaining=${foodArea.remaining}`
    });
  } else {
    uni.navigateTo({
      url: `/pages/feed/${page}`
    });
  }
};

onMounted(() => {
  initMQTT();
  uni.$on('updateFood', (data) => {
    const foodArea = areas.value.find(a => a.name === '饲料区');
    if (foodArea && Number.isFinite(data.remaining)) {
      foodArea.remaining = data.remaining;
      uni.setStorageSync('foodRemaining', foodArea.remaining);
      updateAreaStyles();
    }
  });
});

onShow(() => {
  const storedFood = uni.getStorageSync('foodRemaining');
  const foodArea = areas.value.find(a => a.name === '饲料区');
  if (foodArea) {
    foodArea.remaining = Number.isFinite(parseFloat(storedFood)) ? parseFloat(storedFood) : initialFood;
  }
  updateAreaStyles();
});

onUnmounted(() => {
  uni.$off('updateFood');
  disconnectMQTT();
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

/* 出水进水控制模块样式 */
.one {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 15px;
}

.left, .right {
  width: 48%;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.label {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}

.btn {
  display: flex;
  justify-content: space-around;
}

.open, .switch {
  width: 45%;
  height: 32px;
  line-height: 32px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background-color: #fff;
}

.open.active {
  background-color: #1890ff;
  color: #fff;
}

.switch.active {
  background-color: #ff4d4f;
  color: #fff;
}

.action-container {
  display: flex;
  justify-content: center;
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

.status-bar {
  width: 100%;
  padding: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  margin-top: 15px;
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>