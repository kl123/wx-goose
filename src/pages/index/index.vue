<template>
  <view class="one">
    <view :class="['left', { 'border-on': outWaterStatus === 'on' }]">
	  <image src="/src/static/feed/排水.png" style="height: 80px;width: 80px;"></image>
      <view class="label">排水装置</view>
      <view class="btn">
        <button class="open" @click="changeState_out('on')">开</button>
        <button class="switch" @click="changeState_out('off')">关</button>
      </view>
    </view>
    <view :class="['right', { 'border-in': inWaterStatus === 'on' }]">
		<image src="/src/static/feed/进水.png" style="height: 80px;width: 80px;"></image>
      <view class="label">进水装置</view>
      <view class="btn">
        <button class="open" @click="changeState_in('on')">开</button>
        <button class="switch" @click="changeState_in('off')">关</button>
      </view>
    </view>
  </view>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
	import mqtt from 'mqtt/dist/mqtt';
  // 用于绑定开关状态
  const outWaterStatus = ref("off"); // 出水装置的开关状态
  const inWaterStatus = ref("off");  // 进水装置的开关状态

  function changeState_out(status) {
    outWaterStatus.value = status;
    console.log(outWaterStatus.value);
    sendWaterStatusMessage(outWaterStatus.value, inWaterStatus.value);
  }

  function changeState_in(status) {
    inWaterStatus.value = status;
    console.log(inWaterStatus.value);
    sendWaterStatusMessage(outWaterStatus.value, inWaterStatus.value);
  }

  // 巴法云配置（需替换为实际参数）
  const config = {
    url: 'wxs://bemfa.com:9504/wss', // 微信小程序必须用wx协议头
    options: {
      clientId: '6fc94297b1a4771e713523fd16d19702', // 从巴法云控制台获取
      keepalive: 60, // 心跳间隔
      clean: true,
      protocolVersion: 4,
    },
    topic: 'water', // 订阅的主题名，修改为 'water'
  };

  // 响应式数据
  const deviceStatus = ref('连接中...');
  const updateTime = ref('从未更新'); // 新增：用于记录数据更新时间
  let client = ref(null);
  let reconnectTimer = ref(null);

  // 生命周期
  onMounted(() => {
    initMQTT();
  });

  onUnmounted(() => {
    disconnectMQTT();
  });

  const initMQTT = () => {
    client.value = mqtt.connect(config.url, config.options);

    // 连接成功
    client.value.on('connect', () => {
      deviceStatus.value = '已连接';
      client.value.subscribe(config.topic, {
        qos: 1,
      }, (err) => {
        if (err) {
          console.error('订阅失败:', err);
        } else {
          console.log('订阅成功');
        }
      });
    });

    // 接收消息
    client.value.on('message', (topic, message) => {
      const result = JSON.parse(message);
      if (result.status1 != undefined) {
        outWaterStatus.value = result.status1; // 更新出水装置状态
      }
      if (result.status2 != undefined) {
        inWaterStatus.value = result.status2; // 更新进水装置状态
      }
      console.log('收到数据:', result); // 可以在控制台查看收到的消息
    });

    // 错误处理
    client.value.on('error', (err) => {
      deviceStatus.value = '连接异常';
      console.error('MQTT错误:', err);
      handleReconnect();
    });
  };

const handleReconnect = () => {
  if (!reconnectTimer.value) {
    reconnectTimer.value = setInterval(() => {
      if (!client.value.connected) {
        deviceStatus.value = '尝试重连...';
        console.log('尝试重连...');
        initMQTT();  // 尝试重新连接
      }
    }, 5000);
  }
};


  // 断开连接
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

  // 向主题发送消息方法
  const sendWaterStatusMessage = (status_1, status_2) => {
    console.log('进入了发送函数');
    
    // 如果客户端未连接，先输出日志并返回
    if (!client.value || !client.value.connected) {
      deviceStatus.value = '未连接，无法发送';
      console.log('MQTT 客户端未连接，无法发送');
      return;
    }
  
    const payload = {
      status1: status_1, // 出水装置状态
      status2: status_2, // 进水装置状态
    };
    
    console.log(`发送的目标是：${config.topic}`);
    console.log(`准备的数据是：${JSON.stringify(payload)}`);
  
    // 在发布之前再做一次连接状态检查
    if (client.value.connected) {
      client.value.publish(
        config.topic,
        JSON.stringify(payload),
        { qos: 1 },
        (err) => {
          if (err) {
            console.error('发送失败:', err);
            deviceStatus.value = '发送失败';
            console.log('错误详细:', err);
          } else {
            deviceStatus.value = '消息已发送';
            console.log('消息发送成功:', payload);
          }
        }
      );
    } else {
      console.log('客户端连接已断开，无法发送消息');
      deviceStatus.value = '连接断开，消息未发送';
    }
  };


</script>

<style scoped>
  .one {
    display: flex;
    justify-content: space-between;
    width: 100%;
    height: 200px;
  }

  .left, .right {
    width: 48%;
    height: 100%;
    background-color: #f0f0f0; /* 修改为浅灰色 */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
	transition: border 0.3s ease;  /* 平滑过渡效果 */
  }
  .left.border-on {
    border: 2px solid #00ff00;  /* 边框颜色设置为绿色 */
	background-color: #e6ffe6;
  }
  .right.border-in{
	border: 2px solid #00ff00;  /* 边框颜色设置为绿色 */
	background-color: #e6ffe6;
  }

  .label {
    margin-bottom: 10px;
    font-size: 16px;
    color: #333;
  }

  .open {
    height: 40px;
    width: 80px;
    border-radius: 5px;
    border: 1px #cfe8fc solid;
    margin-right: 10px;
  }

  .switch {
    height: 40px;
    width: 80px;
    border-radius: 5px;
    border: 1px #cfe8fc solid;
  }

  .btn {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
</style>
