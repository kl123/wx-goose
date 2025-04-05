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
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import mqtt from 'mqtt/dist/mqtt';

// 巴法云配置
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
  leaveTopic: 'leave' // 新增leave主题
};

let client = ref(null);
const areas = ref([
  { name: '蓄水池', icon: '/static/feed/蓄水池.png', remaining: 60, unit: '%' },
  { name: '喂水区', icon: '/static/feed/喂水区.png', remaining: 40, unit: '%' },
  { name: '饲料池', icon: '/static/feed/饲料池.png', remaining: 400, unit: '斤' },
  { name: '饲料区', icon: '/static/feed/饲料区.png', remaining: 300, unit: '斤' },
]);

// 初始化MQTT连接
const initMQTT = () => {
  client.value = mqtt.connect(config.url, config.options);

  client.value.on('connect', () => {
    console.log('✅ MQTT连接成功');
    uni.showToast({ title: '设备连接成功', icon: 'success' });
    
    // 订阅leave主题
    client.value.subscribe(config.leaveTopic, { qos: 1 }, (err) => {
      if (!err) console.log(`成功订阅主题: ${config.leaveTopic}`);
    });
  });

  // 处理接收到的消息
  client.value.on('message', (topic, message) => {
    console.log('MQTT消息:', topic, message.toString());
    
    if (topic === config.leaveTopic) {
      try {
        const msgStr = message.toString();
        let waterNum;
        
        // 兼容处理
        if (msgStr.includes('waterNum')) {
          if (msgStr.startsWith('{')) {
            waterNum = JSON.parse(msgStr).waterNum;
          } else {
            waterNum = parseInt(msgStr.split('waterNum=')[1]) || 0;
          }
        }
        
        if (waterNum >= 0 && waterNum <= 100) {
          const reservoir = areas.value.find(a => a.name === '蓄水池');
          if (reservoir) {
            reservoir.remaining = waterNum;
            console.log('水量已更新:', waterNum);
            
            // 微信小程序特殊处理
            uni?.$emit?.('waterUpdated', waterNum);
          }
        }
      } catch (e) {
        console.error('处理消息异常:', e);
      }
    }
  });

  client.value.on('error', (err) => {
    console.error('❌ MQTT连接错误:', err);
    uni.showToast({ title: '设备连接失败', icon: 'none' });
  });
};

// 发送控制指令
const sendControlCommand = (topic, data) => {
  if (!client.value || !client.value.connected) {
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
                
                // 发送巴法云控制指令
                sendControlCommand(config.waterTopic, {
                  num: Math.floor(amount / 10), // 每10%发送1
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
                
                // 发送巴法云控制指令
                const num = Math.floor(amount / 100); // 每100斤发送1
                if(num > 0) {
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
  uni.navigateTo({
    url: `/pages/feed/${page}`
  });
};

// 生命周期钩子
onMounted(() => {
  initMQTT();
});

onUnmounted(() => {
  if (client.value) {
    client.value.end();
  }
});
</script>

<style scoped>
/* 样式保持不变 */
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
</style>