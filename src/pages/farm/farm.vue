<template>
	<view class="container">
		<!-- 设置按钮 -->
		<view class="settings-button" @click="openSettings">
			<uni-icons type="gear" size="24" color="#333"></uni-icons>
		</view>

		<!-- 连接状态 -->
		<view class="status">当前状态：{{ deviceStatus }}</view>
		
		<!-- 数据更新时间 -->
		<!-- <view class="update-time">{{ updateTime }}</view> -->

		<!-- 能量球显示信息 -->
		<view class="energy-balls" :style="{ transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg)` }"
			@mousedown="startDrag" @mousemove="onDrag" @mouseup="endDrag" @mouseleave="endDrag" @touchstart="startDrag"
			@touchmove="onDrag" @touchend="endDrag">
			<view v-for="(item, index) in environmentData" :key="index" class="energy-ball" :class="item.colorClass"
				:style="getBallStyle(index)">
				<text class="label">{{ item.label }}</text>
				<text class="value">{{ item.value }}</text>
			</view>
		</view>

		<!-- 提示 -->
		<view class="breathing-light">
			<view :class="['light-band', { 'manual-mode': isManualMode }]"></view>
			<view class="text">{{breathText.auto}}</view>
		</view>

		<!-- 手动模式开关 -->
		<view class="mode-switch">
			<text>手动模式</text>
			<switch :checked="isManualMode" @change="toggleMode" />
		</view>

		<!-- 设备控制按钮 -->
		<view class="control-buttons">
			<button type="primary" :disabled="!isManualMode" @click="toggleSprinkler">
				{{ isSprinklerOn ? '关闭洒水器' : '启动洒水器' }}
			</button>
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
						<text> 至 </text>
						<uni-number-box v-model="thresholds.co2.max" :min="0" :max="2000"></uni-number-box>
					</view>
				</view>
				<button class="save-button" @click="saveSettings">保存</button>
			</view>
		</uni-popup>

	</view>
</template>

<script setup>
	import {
		ref,
		onMounted,
		onUnmounted
	} from 'vue';
	import axios from 'axios';
	import mqtt from 'mqtt/dist/mqtt.js' // 必须引入dist目录下的文件

	// 环境球3d旋转
	// 旋转角度
	const rotateY = ref(0);
	const rotateX = ref(0);
	const BallrotateY = ref(0);

	// 拖拽状态
	const isDragging = ref(false);
	const startX = ref(0);
	const startY = ref(0);
	const startRotateY = ref(0);
	const startRotateX = ref(0);
	const startBallRotateY = ref(0);

	// 惯性旋转状态
	const inertiaSpeed = ref(0); // 惯性速度
	const isInertia = ref(false); // 是否处于惯性旋转状态

	// 自动旋转
	const isAuto = ref(true);
	const autoSpeed = 0.1;
	let autoRotateInterval = null; // 自动旋转的定时器

	// 开始拖拽
	const startDrag = (event) => {
		isAuto.value = false; // 停止自动旋转
		clearInterval(autoRotateInterval); // 清除自动旋转定时器

		isDragging.value = true;
		isInertia.value = false; // 停止惯性旋转
		const clientX = event.touches ? event.touches[0].clientX : event.clientX;
		const clientY = event.touches ? event.touches[0].clientY : event.clientY;
		startX.value = clientX;
		startY.value = clientY;
		startRotateY.value = rotateY.value;
		startRotateX.value = rotateX.value;
		startBallRotateY.value = BallrotateY.value;
	};

	// 拖拽中
	const onDrag = (event) => {
		if (!isDragging.value) return;
		const clientX = event.touches ? event.touches[0].clientX : event.clientX;
		const clientY = event.touches ? event.touches[0].clientY : event.clientY;
		const deltaX = clientX - startX.value;
		const deltaY = clientY - startY.value;

		// 根据鼠标移动距离调整旋转角度
		rotateY.value = startRotateY.value + deltaX * 0.5;
		rotateX.value = startRotateX.value;
		BallrotateY.value = startBallRotateY.value - deltaX * 0.5;

		// 更新惯性速度
		inertiaSpeed.value = deltaX * 0.05;
	};

	// 结束拖拽
	const endDrag = () => {
		isDragging.value = false;
		if (Math.abs(inertiaSpeed.value) > 0.1) {
			isInertia.value = true;
			inertiaRotate(); // 开始惯性旋转
		} else {
			startAutoRotate(); // 如果没有惯性旋转，直接启动自动旋转
		}
	};

	// 惯性旋转
	const inertiaRotate = () => {
		if (!isInertia.value) return;

		// 更新旋转角度
		rotateY.value += inertiaSpeed.value;
		BallrotateY.value -= inertiaSpeed.value

		// 减速
		inertiaSpeed.value *= 0.95;

		// 停止条件
		if (Math.abs(inertiaSpeed.value) < 0.1) {
			isInertia.value = false;
			startAutoRotate(); // 惯性旋转结束后启动自动旋转
		} else {
			setTimeout(inertiaRotate, 1000 / 60); // 使用setTimeout模拟requestAnimationFrame
		}
	};

	// 启动自动旋转
	const startAutoRotate = () => {
		isAuto.value = true;
		autoRotateInterval = setInterval(() => {
			if (isAuto.value) {
				rotateY.value += autoSpeed;
				BallrotateY.value -= autoSpeed;
			}
		}, 1000 / 60); // 60 FPS
	};

	// 停止自动旋转
	const stopAutoRotate = () => {
		isAuto.value = false;
		clearInterval(autoRotateInterval);
	};

	// 动态计算每个球的 transform
	const getBallStyle = (index) => {
		const angle = index * 72; // 每个球之间的角度差为 72 度
		return {
			transform: `rotateY(${angle}deg) translateZ(130px) rotateY(-${angle}deg) rotateY(${BallrotateY.value}deg)`
		};
	};

	// 在程序开始时启动自动旋转
	onMounted(() => {
		startAutoRotate();
	});


	// 环境球内容部分
	// 环境数据
	const environmentData = ref([{
			label: '温度',
			value: '--',
			colorClass: 'energy-ball-normal'
		},
		{
			label: '湿度',
			value: '--',
			colorClass: 'energy-ball-normal'
		},
		{
			label: '光照强度',
			value: '--',
			colorClass: 'energy-ball-normal'
		},
		{
			label: '氨气浓度',
			value: '--',
			colorClass: 'energy-ball-normal'
		},
		{
			label: 'CO2浓度',
			value: '--',
			colorClass: 'energy-ball-normal'
		}
	]);

	// 预设阈值
	const thresholds = ref({
		temperature: {
			min: 18,
			max: 28
		},
		humidity: {
			min: 40,
			max: 60
		},
		co2: {
			min: 300,
			max: 1000
		}
	});

	// // 模拟测试数据
	// const mockData = {
	// 	temperature: 25, // 温度
	// 	humidity: 55, // 湿度
	// 	co2: 800 // CO2浓度
	// };

	// 检查阈值并更新颜色
	const checkThresholds = (data) => {
		environmentData.value[0].colorClass = getColorClass(data.temperature, thresholds.value.temperature);
		environmentData.value[1].colorClass = getColorClass(data.humidity, thresholds.value.humidity);
		environmentData.value[2].colorClass = getColorClass(data.co2, thresholds.value.co2);
	};

	// 根据阈值获取颜色
	const getColorClass = (value, threshold) => {
		if (value < threshold.min || value > threshold.max) {
			return 'energy-ball-warning'; // 超出阈值显示红色
		}
		return 'energy-ball-normal'; // 正常范围内显示绿色
	};

	// // 获取数据
	// const fetchData = async () => {
	// 	try {
	// 		const response = await axios.get('https://your-api-endpoint.com/environment-data');
	// 		const data = response.data;

	// 		// 更新数据
	// 		environmentData.value[0].value = `${data.temperature}°C`;
	// 		environmentData.value[1].value = `${data.humidity}%`;
	// 		environmentData.value[2].value = `${data.co2}ppm`;

	// 		// 检查阈值
	// 		checkThresholds(data);
	// 	} catch (error) {
	// 		console.error('Error fetching environment data:', error);
	// 	}
	// };

	// // 模拟数据更新
	// const updateMockData = () => {
	// 	// 更新数据
	// 	environmentData.value[0].value = `${mockData.temperature}°C`;
	// 	environmentData.value[1].value = `${mockData.humidity}%`;
	// 	environmentData.value[2].value = `${mockData.co2}ppm`;

	// 	// 检查阈值
	// 	checkThresholds(mockData);
	// };

	// 页面加载时开始定时获取数据
	// onMounted(() => {
	// 	// fetchData();
	// 	// setInterval(fetchData, 5000); // 每5秒更新一次数据
	// 	updateMockData();
	// 	// setInterval(() => {
	// 	// 	// 模拟数据变化
	// 	// 	mockData.temperature = Math.floor(Math.random() * (30 - 15 + 1)) + 15; // 15°C ~ 30°C
	// 	// 	mockData.humidity = Math.floor(Math.random() * (70 - 30 + 1)) + 30; // 30% ~ 70%
	// 	// 	mockData.co2 = Math.floor(Math.random() * (1200 - 200 + 1)) + 200; // 200ppm ~ 1200ppm
	// 	// 	updateMockData();
	// 	// }, 5000); // 每5秒更新一次数据
	// });

	onUnmounted(() => {
		clearInterval(autoRotateInterval);
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

	//手动操作提示词
	const breathText = {
		auto: '自动化运行中',
		manual: '手动操作中'
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
		topic: 'Goose' // 订阅的主题名
	}

	// 响应式数据
	const deviceStatus = ref('连接中...')
	const updateTime = ref('从未更新') // 新增：用于记录数据更新时间
	let client = ref(null)
	let reconnectTimer = ref(null)

	// 生命周期
	onMounted(() => {
		initMQTT()
	})

	onUnmounted(() => {
		disconnectMQTT()
	})

	// MQTT初始化
	const initMQTT = () => {
		client.value = mqtt.connect(config.url, config.options)

		// 连接成功
		client.value.on('connect', () => {
			deviceStatus.value = '已连接'
			client.value.subscribe(config.topic, {
				qos: 1
			}, (err) => {
				if (!err) console.log('订阅成功')
			})
		})

		// 接收消息
		client.value.on('message', (topic, message) => {
			const result = JSON.parse(message);
			environmentData.value[0].value = `${result.temperature}°C`;
			environmentData.value[1].value = `${result.humidity}%`;
			environmentData.value[2].value = `${result.light_intensity}lx`;
			// updateTime.value = new Date().toLocaleString()
			checkThresholds(result);
			// console.log('收到数据:', result.value)
		})

		// 错误处理
		client.value.on('error', (err) => {
			deviceStatus.value = '连接异常'
			console.error('MQTT错误:', err)
			handleReconnect()
		})
	}

	// 断线重连
	const handleReconnect = () => {
		if (!reconnectTimer.value) {
			reconnectTimer.value = setInterval(() => {
				if (!client.value.connected) {
					deviceStatus.value = '尝试重连...'
					initMQTT()
				}
			}, 5000)
		}
	}

	// 断开连接
	const disconnectMQTT = () => {
		if (client.value) {
			client.value.end()
			client.value = null
		}
		if (reconnectTimer.value) {
			clearInterval(reconnectTimer.value)
			reconnectTimer.value = null
		}
	}




	// 手动模式状态
	const isManualMode = ref(false);

	// 洒水器状态
	const isSprinklerOn = ref(false);

	// 切换手动模式
	const toggleMode = (event) => {
		isManualMode.value = event.detail.value;
		if (!isManualMode.value) {
			// 切换回自动模式时，关闭洒水器
			breathText.auto = "自动运行中"
			isSprinklerOn.value = false;
		} else {
			breathText.auto = '手动'
		}
	};

	// 切换洒水器状态
	const toggleSprinkler = () => {
		isSprinklerOn.value = !isSprinklerOn.value;
		// 这里可以调用后端接口控制洒水器
		console.log(`洒水器已${isSprinklerOn.value ? '启动' : '关闭'}`);
	};
</script>
<style>
	.container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background-color: #f0f0f0;
		position: relative;
		perspective: 1000px;
	}

	/* 设置阙值按钮 */
	.settings-button {
		position: absolute;
		top: 20px;
		left: 20px;
		z-index: 10;
	}

	.status {
		color: #666;
		position: absolute;
		top: 20px;
		z-index: 10;
	}


	/* 手动模式开关 */
	.mode-switch {
		margin-top: 20px;
		display: flex;
		align-items: center;
	}

	/* 手动模式开关文本 */
	.mode-switch text {
		margin-right: 10px;
		font-size: 16px;
	}

	/* 环境球的星环容器 */
	.energy-balls {
		position: relative;
		width: 200px;
		height: 200px;
		transform-style: preserve-3d;
		/* 启用 3D 空间 */
		transition: transform 0.1s linear;
		display: flex;
		justify-content: space-around;
		/* 平滑过渡 */
	}

	.energy-ball {
		position: absolute;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		color: white;
		font-size: 14px;
		text-align: center;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
		transform-style: preserve-3d;
		/* 阴影增强立体感 */
	}

	.energy-ball-normal {
		background: linear-gradient(135deg, #47a44a, #8ad58c);
	}

	.energy-ball-warning {
		background: linear-gradient(135deg, #FF5252, #FF8A80);
	}

	/* 设置每个球的位置 */
	.energy-ball:nth-child(1) {
		transform: rotateY(0deg) translateZ(150px) rotateY(0deg)
	}

	.energy-ball:nth-child(2) {
		transform: rotateY(172deg) translateZ(150px) rotateY(-172deg);
	}

	.energy-ball:nth-child(3) {
		transform: rotateY(144deg) translateZ(150px) rotateY(-144deg);
	}
	
	.energy-ball:nth-child(4) {
		transform: rotateY(216deg) translateZ(150px) rotateY(-216deg);
	}
	
	.energy-ball:nth-child(5) {
		transform: rotateY(288deg) translateZ(150px) rotateY(-288deg);
	}

	/* 硬件的开关 */
	.control-button {
		background-color: #4CAF50;
		color: white;
		border: none;
		border-radius: 5px;
		padding: 10px 20px;
		font-size: 16px;
	}

	.control-button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
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
		width: 80%;
		max-width: 300px;
	}

	.popup-title {
		font-size: 18px;
		font-weight: bold;
		margin-bottom: 20px;
		display: block;
		text-align: center;
	}

	.setting-item {
		margin-bottom: 15px;
	}

	.item {
		display: flex;
		padding: 10px;

	}

	.setting-item text {
		display: block;
		margin-bottom: 5px;
		font-size: 14px;
		font-weight: bold;
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

	/* 呼吸灯 */
	.breathing-light {
		position: relative;
		width: 100%;
		height: 50px;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.breathing-light .light-band.manual-mode {
		background: linear-gradient(180deg, rgba(240, 240, 240, 0.2), rgba(255, 89, 111, 0.8), rgba(240, 240, 240, 0.2)) !important;
		animation: none;
		opacity: 1;
		transform: scaleX(1);
	}

	.light-band {
		position: absolute;
		border-radius: 25px;
		width: 100%;
		height: 100%;
		background: linear-gradient(180deg, rgba(240, 240, 240, 0.2), rgba(62, 204, 255, 0.8), rgba(240, 240, 240, 0.2));
		animation: breathe 3s infinite ease-in-out;
	}

	.text {
		position: relative;
		z-index: 1;
		color: black;
		font-size: 16px;
		font-weight: bold;
	}

	@keyframes breathe {

		0%,
		100% {
			opacity: 0.2;
			transform: scaleX(0.9);
		}

		50% {
			opacity: 1;
			transform: scaleX(1.1);
		}
	}
</style>