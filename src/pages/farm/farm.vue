<template>
  <view class="container">
    <view class="energy-balls">
      <view 
        v-for="(item, index) in environmentData" 
        :key="index" 
        class="energy-ball" 
        :style="{ backgroundColor: item.color }"
      >
        <text class="label">{{ item.label }}</text>
        <text class="value">{{ item.value }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

// 环境数据
const environmentData = ref([
  { label: '温度', value: '--', color: '#4CAF50' },
  { label: '湿度', value: '--', color: '#4CAF50' },
  { label: 'CO2浓度', value: '--', color: '#4CAF50' }
]);

// 预设阈值
const thresholds = {
  temperature: { min: 18, max: 28 },
  humidity: { min: 40, max: 60 },
  co2: { min: 300, max: 1000 }
};

//连接后台前的测试数据
const testtemperature = 25;
const testhumidity = 50;
const testco2 = 100;

// 获取数据
const fetchData = async () => {
  // try {
  //   const response = await axios.get('https://your-api-endpoint.com/environment-data');
  //   const data = response.data;

  //   // 更新数据
  //   environmentData.value[0].value = `${data.temperature}°C`;
  //   environmentData.value[1].value = `${data.humidity}%`;
  //   environmentData.value[2].value = `${data.co2}ppm`;

  //   // 检查阈值
  //   checkThresholds(data);
  // } catch (error) {
  //   console.error('Error fetching environment data:', error);
  // }
  
	environmentData.value[0].value = `${testtemperatureperature}°C`;
    environmentData.value[1].value = `${testhumidityidity}%`;
    environmentData.value[2].value = `${testco2}ppm`;
  
    // 检查阈值
    checkThresholds(data);
};

// 检查阈值并更新颜色
const checkThresholds = (data) => {
  environmentData.value[0].color = getColor(testtemperatureperature, thresholds.temperature);
  environmentData.value[1].color = getColor(testhumidityidity, thresholds.humidity);
  environmentData.value[2].color = getColor(testco2, thresholds.co2);
};

// 根据阈值获取颜色
const getColor = (value, threshold) => {
  if (value < threshold.min || value > threshold.max) {
    return '#FF5252'; // 超出阈值显示红色
  }
  return '#4CAF50'; // 正常范围内显示绿色
};

// 页面加载时开始定时获取数据
onMounted(() => {
  fetchData();
  setInterval(fetchData, 5000); // 每5秒更新一次数据
});
</script>

<style>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
}

.energy-balls {
  display: flex;
  justify-content: space-around;
  width: 80%;
}

.energy-ball {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  font-size: 14px;
  text-align: center;
}

.label {
  font-weight: bold;
}

.value {
  margin-top: 5px;
}
</style>