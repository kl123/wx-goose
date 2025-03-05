<template>
	<view class="container">
		<text>传感器数据: {{ sensorData }}</text>
		<button @click="fetchSensorData">获取数据</button>
	</view>
</template>

<script setup>
	import { ref, onMounted, onUnmounted } from 'vue';

	const sensorData = ref('');

	// 巴法云 API 配置
	const apiUrl = 'https://apis.bemfa.com/va/getmsg';
	const uid = '6fc94297b1a4771e713523fd16d19702'; // 替换为你的用户 ID
	const topic = 'Goose'; // 替换为你的设备主题
	
	// 定时器 ID
	let intervalId = null;

	// 获取传感器数据
	const fetchSensorData = async () => {
		try {
			const response = await uni.request({
				url: apiUrl,
				method: 'GET',
				data: {
					uid: uid,
					topic: topic,
					type: 1, // 请求类型
					
				},
			});

			if (response.statusCode === 200) {
				const result = response.data;
				const msgDict = JSON.parse(result.data[0].msg);
				sensorData.value = msgDict.temperature; // 假设返回的数据是字符串
				console.log('传感器数据:', sensorData.value);
			} else {
				console.error('请求失败:', response.statusCode, response.data);
			}
		} catch (error) {
			console.error('请求出错:', error);
		}
	};
	
	// 组件挂载时启动定时器
	onMounted(() => {
	  fetchSensorData(); // 立即请求一次数据
	  intervalId = setInterval(fetchSensorData, 5000); // 每秒请求一次
	});
	
	// 组件卸载时清除定时器
	onUnmounted(() => {
	  if (intervalId) {
	    clearInterval(intervalId);
	  }
	});
	
	// 解析msg字符串为对象
	const parseMsg = (msgStr) => {
	  return JSON.parse(msgStr);
	}
	

</script>

<style>
	.container {
		padding: 20px;
		text-align: center;
	}
</style>