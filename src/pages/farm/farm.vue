<template>
  <view class="container">
	  <!-- 设置按钮 -->
	      <view class="settings-button" @click="openSettings">
	        <uni-icons type="gear" size="24" color="#333"></uni-icons>
	      </view>
	  
	  
	<!-- 能量球显示信息 -->
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
	
	<!-- 设置弹窗 -->
	    <uni-popup ref="popup" type="dialog">
	      <view class="settings-popup">
	        <text class="popup-title">设置阈值</text>
	        <view class="setting-item">
	          <text>温度阈值 (°C)</text>
			  <view class="item">
	          <uni-number-box v-model="thresholds.temperature.min" :min="0" :max="50"></uni-number-box>
	          <text>至</text>
	          <uni-number-box v-model="thresholds.temperature.max" :min="0" :max="50"></uni-number-box>
			  </view>
	        </view>
	        <view class="setting-item">
	          <text>湿度阈值 (%)</text>
			  <view class="item">
	          <uni-number-box v-model="thresholds.humidity.min" :min="0" :max="100"></uni-number-box>
	          <text>至</text>
	          <uni-number-box v-model="thresholds.humidity.max" :min="0" :max="100"></uni-number-box>
			  </view>
			</view>
	        <view class="setting-item">
	          <text>CO2阈值 (ppm)</text>
			  <view class="item">
	          <uni-number-box v-model="thresholds.co2.min" :min="0" :max="2000"></uni-number-box>
	          <text>至</text>
	          <uni-number-box v-model="thresholds.co2.max" :min="0" :max="2000"></uni-number-box>
			  </view>
	        </view>
	        <button class="save-button" @click="saveSettings">保存</button>
	      </view>
	    </uni-popup>
	
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

// 模拟测试数据
const mockData = {
  temperature: 25, // 温度
  humidity: 55,    // 湿度
  co2: 800         // CO2浓度
};

// 获取数据
const fetchData = async () => {
  try {
    const response = await axios.get('https://your-api-endpoint.com/environment-data');
    const data = response.data;

    // 更新数据
    environmentData.value[0].value = `${data.temperature}°C`;
    environmentData.value[1].value = `${data.humidity}%`;
    environmentData.value[2].value = `${data.co2}ppm`;

    // 检查阈值
    checkThresholds(data);
  } catch (error) {
    console.error('Error fetching environment data:', error);
  }
};

// 模拟数据更新
const updateMockData = () => {
  // 更新数据
  environmentData.value[0].value = `${mockData.temperature}°C`;
  environmentData.value[1].value = `${mockData.humidity}%`;
  environmentData.value[2].value = `${mockData.co2}ppm`;

  // 检查阈值
  checkThresholds(mockData);
};

// 检查阈值并更新颜色
const checkThresholds = (data) => {
  environmentData.value[0].color = getColor(data.temperature, thresholds.temperature);
  environmentData.value[1].color = getColor(data.humidity, thresholds.humidity);
  environmentData.value[2].color = getColor(data.co2, thresholds.co2);
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
  // fetchData();
  // setInterval(fetchData, 5000); // 每5秒更新一次数据
  updateMockData();
  setInterval(() => {
      // 模拟数据变化
      mockData.temperature = Math.floor(Math.random() * (30 - 15 + 1)) + 15; // 15°C ~ 30°C
      mockData.humidity = Math.floor(Math.random() * (70 - 30 + 1)) + 30;    // 30% ~ 70%
      mockData.co2 = Math.floor(Math.random() * (1200 - 200 + 1)) + 200;      // 200ppm ~ 1200ppm
      updateMockData();
    }, 5000); // 每5秒更新一次数据
});

// 打开设置弹窗
const popup = ref(null);
const openSettings = () => {
  popup.value.open();
};

// 保存设置
const saveSettings = () => {
  popup.value.close();
  // 保存后重新检查阈值
  checkThresholds(mockData);
};
</script>
<style>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
  position: relative;
}

.settings-button {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
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

.settings-popup {
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  width: 600rpx;
  /* max-width: 300px; */
}

.popup-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  display: block;
  text-align: center;
}

.settings-popup text{
	font-weight: bold;
}

.setting-item {
  margin-bottom: 15px;
}

.setting-item text {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
}

.item{
	padding: 10px;
	display: flex;
}

.save-button {
  margin-top: 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px;
  width: 100%;
  font-size: 16px;
}
</style>