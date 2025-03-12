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
		<!-- <view class="breathing-light">
			<view :class="['light-band', { 'manual-mode': isManualMode }]"></view>
			<view class="text">{{breathText.auto}}</view>
		</view> -->

		<!-- 手动模式开关 -->
		<!-- <view class="mode-switch">
			<text>手动模式</text>
			<switch :checked="isManualMode" @change="toggleMode" />
		</view> -->


		<!-- 设备控制按钮 -->
		<!-- <view class="control-buttons">
			<button type="primary" :disabled="!isManualMode" @click="toggleSprinkler">
				{{ isSprinklerOn ? '关闭洒水器' : '启动洒水器' }}
			</button>
		</view> -->

		<!-- 操作模块列表 -->
		<view class="module-group">
			<view v-for="(item, index) in modules" :key="item.title" class="module-item"
				:style="[backgroundStyles[index], { transitionDelay: `${index * 50}ms` }]"
				:class="{ 'slide-out': isAnimating }" @click="startAnimation(index)">
				<view class="module-left">
					<view class="icon-placeholder"
						:class="findEquipByTitle(item.title)?.isOpen ? 'greenlet' : 'redlet'"></view>
					<view class="icon-placeholder"
						:class="findEquipByTitle(item.title)?.isOpen ? 'bluelet' : 'graylet'"></view>
				</view>
				<text class="module-title">{{ item.title }}</text>
				<view v-if="item.type === 'arrow'" class="arrow-right">→</view>
				<switch v-if="item.type === 'switch'" :checked="item.value" @change="(e) => toggleMode(e, index)" />
			</view>
		</view>



		<!-- 操作按钮组 -->
		<!-- <view class="action-group" :class="{ 'slide-in': showActions }">
			<view class="back-btn" @click="resetAnimation">‹ 返回</view>
			<button class="confirm-btn" @click="handleConfirm">确认操作</button>
		</view> -->

		<view v-if="choiceModudle.length > 0" v-for="item in choiceModudle" :key="item.title" class="action-group"
			:class="{'slide-in': showActions}">

			<view class="ctr-title">
				<text v-if="item.isOpen === true">{{item.title}}:运行中</text>
				<text v-if="item.isOpen === false">{{item.title}}:未运行</text>
			</view>
			<view class="back-btn" @click="resetAnimation">‹ 返回</view>
			<button v-if="item.type === 'offon'" class="offOnBtn" @click="offOnEquip(item)">开启</button>
			<view v-if="item.type === 'set'" class="setNum">设置温度：{{item.value}}</view>
			<view v-if="item.type === 'set'" class="setBtn">
				<button @click="upTemp(item)">升温</button>
				<button @click="downTemp(item)">降温</button>
			</view>
		</view>

		<!-- <view v-if="choiceModudle"class="action-group" :class="{ 'slide-in': showActions }">WIN!</view> -->

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
				<view class="setting-item">
					<text>光照阈值 (lx)</text>
					<view class="item">
						<uni-number-box v-model="thresholds.light.min" :min="0" :max="100"></uni-number-box>
						<text>至</text>
						<uni-number-box v-model="thresholds.light.max" :min="0" :max="100"></uni-number-box>
					</view>
				</view>
				<view class="setting-item">
					<text>氨气阈值 (%)</text>
					<view class="item">
						<uni-number-box v-model="thresholds.nh3.min" :min="0" :max="100"></uni-number-box>
						<text>至</text>
						<uni-number-box v-model="thresholds.nh3.max" :min="0" :max="100"></uni-number-box>
					</view>
				</view>
				<!-- <button class="exit-settingBut" @click="exitSetting">取消</button> -->
				<button class="save-button" @click="saveSettings">保存</button>
			</view>
		</uni-popup>

	</view>
</template>

<script setup>
	import {
		ref,
		onMounted,
		computed,
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
		},
		light: {
			min: 100,
			max: 200
		},
		nh3: {
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
		environmentData.value[2].colorClass = getColorClass(data.light_intensity, thresholds.value.co2);
		// environmentData.value[3].colorClass = getColorClass(data.co2, thresholds.value.co2);
		// environmentData.value[4].colorClass = getColorClass(data.co2, thresholds.value.co2);
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
		topic: 'Goose', // 订阅的主题名
		settopic: 'Num'
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

	// 新增发送消息方法
	const sendMessage = (message) => {
		if (!client.value || !client.value.connected) {
			deviceStatus.value = '未连接，无法发送'
			return
		}

		const payload = {
			// value: Math.floor(Math.random() * 100) // 示例：发送随机数
			// 这里可以添加更多需要传输的数据字段
			value: message
		}

		client.value.publish(
			config.settopic,
			JSON.stringify(payload.value), {
				qos: 1
			},
			(err) => {
				if (err) {
					console.error('发送失败:', err)
					deviceStatus.value = '发送失败'
				} else {
					deviceStatus.value = '消息已发送'
					console.log('消息发送成功:', payload)
				}
			}
		)
	}



	// 手动模式状态
	const isAutoMode = ref(true);

	// 洒水器状态
	const equip = ref([{
			title: '智能除氨气',
			isOpen: false,
			type: 'offon',
			colorClass: 'redlet',
			colorClass2: 'redlet'
		},
		{
			title: '通风透气',
			isOpen: false,
			type: 'offon',
			colorClass: 'redlet',
			colorClass2: 'redlet'
		},
		{
			title: '鹅棚保暖',
			isOpen: false,
			value: 25,
			type: 'set',
			colorClass: 'redlet',
			colorClass2: 'redlet'
		},
		{
			title: '雾化降温',
			isOpen: false,
			value: 25,
			type: 'set',
			colorClass: 'redlet',
			colorClass2: 'redlet'
		},
		{
			title: '智能监控模式',
			isOpen: isAnimating,
			type: 'no',
			colorClass: 'redlet',
			colorClass2: 'redlet'
		},
	]);

	// 切换手动模式
	// Composition API 写法


	const toggleMode = (event, index) => {
		const newValue = event.detail.value;
		modules.value[index].value = newValue;
		isAutoMode.value = newValue;

	};

	// 切换洒水器状态
	const toggleSprinkler = () => {
		isSprinklerOn.value = !isSprinklerOn.value;
		// 这里可以调用后端接口控制洒水器
		console.log(`洒水器已${isSprinklerOn.value ? '启动' : '关闭'}`);
	};

	const handleConfirm = () => {
		const jsonDate = {
			"sunlimit": 250,
			"fan": "off"
		};
		sendMessage(jsonDate);
	}

	const modules = ref([{
			title: '智能监控模式',
			type: 'switch',
			value: true
		},
		{
			title: '智能除氨气',
			type: 'arrow'
		},
		{
			title: '通风透气',
			type: 'arrow'
		},
		{
			title: '鹅棚保暖',
			type: 'arrow'
		},
		{
			title: '雾化降温',
			type: 'arrow'
		}
	]);

	// 新增渐变色配置
	// 修改渐变色配置，使用完整HEX格式
	// 更新后的渐变色配置
	const colorGradients = [
		['#C8E6C9', '#E8F5E9'], // 薄荷绿+嫩芽绿
		['#BBDEFB', '#E3F2FD'], // 天空蓝+浅灰蓝
		['#FFECB3', '#FFF8E1'], // 日光黄+香槟金
		['#E1BEE7', '#F3E5F5'], // 浅藕荷+淡紫
		['#B2DFDB', '#E0F2F1'] // 灰绿+水绿色
	];



	// 计算渐变背景样式
	const backgroundStyles = computed(() =>
		modules.value.map((_, index) => ({
			background: `linear-gradient(135deg, 
	        ${colorGradients[index][0]} 20%, 
	        ${colorGradients[index][1]} 80%)`,
			boxShadow: `0 4rpx 12rpx ${colorGradients[index][1]}20`
		}))
	);

	const isAnimating = ref(false);
	const showActions = ref(false);

	const selectedModuleIndex = ref(-1); //选择的模块
	const choiceModudle = ref([]);

	const startAnimation = (index) => {
		// 阻止模式切换框的点击反应
		selectedModuleIndex.value = index;
		console.log(`点击了功能 ${index}`)
		if (modules.value[index].type !== 'arrow') return;

		// 智能模式开启时拦截其他模块点击
		if (modules.value[0].value && index !== 0) {
			uni.showToast({
				title: '正在智能操控中',
				icon: 'none',
				duration: 1500
			});
			return;
		}

		if (isAnimating.value) return;
		choiceModudle.value = equip.value.filter(item => item.title === modules.value[index].title)
		// choiceModudle.value = computed(() => equip.value[index]);
		console.log(choiceModudle.value);
		console.log(
			`测试具体值：isOpen=${choiceModudle.value[0].isOpen};title=${choiceModudle.value[0].title};type=${choiceModudle.value[0].type}`
		)
		isAnimating.value = true;

		// 按钮延迟出现
		setTimeout(() => {
			showActions.value = true;
		}, modules.value.length * 50 + 200);
	};
	
	// const offOnEquip = (item) => {
		
	// }

	const findEquipByTitle = (title) => {
		for (const item of equip.value) {
			if (item.title === title) {
				return item;
			}
		}

		return null; // 未找到时返回 null
	}

	// 检查开关并更新提示
	// const checkisOpen = (equip) => {
	// 	// environmentData.value[0].colorClass = getColorClass(data.temperature, thresholds.value.temperature);
	// 	// environmentData.value[1].colorClass = getColorClass(data.humidity, thresholds.value.humidity);
	// 	// environmentData.value[2].colorClass = getColorClass(data.light_intensity, thresholds.value.co2);
	// 	equip.value[0].colorClass = equipGetColorClass()

	// };

	// 根据阈值获取颜色
	// const equipGetColorClass = (value, threshold) => {
	// 	if (value < threshold.min || value > threshold.max) {
	// 		return 'energy-ball-warning'; // 超出阈值显示红色
	// 	}
	// 	return 'energy-ball-normal'; // 正常范围内显示绿色
	// };

	const resetAnimation = () => {
		isAnimating.value = false;
		showActions.value = false;
	};
</script>
<style lang="scss">
	.container {
		display: flex;
		flex-direction: column;

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
		margin-top: 150px;
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

	.exit-settingBut {
		margin-top: 20px;
		background-color: #4CAF50;
		color: white;
		border: none;
		border-radius: 5px;
		padding: 10px;
		width: 100%;
		font-size: 16px;
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

	/* //手动功能 */
	.module-group {
		position: fixed;
		bottom: 12rpx;
		left: 24rpx;
		right: 24rpx;
	}

	.greenlet {
		background-color: #2E7D32;
		background: #2E7D32;
	}

	.redlet {
		background-color: #FF5252;
		background: #FF5252;
	}

	.bluelet {
		background: blue;
	}

	.graylet {
		background: #e9ecef;
	}

	.module-item {
		transform: translateY(0);
		display: flex;
		align-items: center;
		padding: 32rpx;
		margin-bottom: 24rpx;
		border-radius: 12rpx;
		transition: all 0.4s ease-in-out, background 0.3s ease;
		backdrop-filter: none;
		border: 1rpx solid rgba(255, 255, 255, 0.2);
		opacity: 1;

		&:active {
			transform: scale(0.98) translateY(2rpx);
		}

		&.slide-out {
			opacity: 0;
			transform: translateX(-100%);
			pointer-events: none;
		}

		.module-left {
			display: flex;
			gap: 16rpx;
			margin-right: 32rpx;

			.icon-placeholder {
				width: 25rpx;
				height: 25rpx;
				// background: #e9ecef;
				// background: #2E7D32;
				border-radius: 50%;
			}
		}

		.module-title {
			flex: 1;
			color: #2E7D32; // 深墨绿色
			font-size: 32rpx;
			font-weight: 600;
			text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
		}

		.arrow-right {
			color: rgba(0, 0, 0, 0.5);
			font-size: 40rpx;
		}

		// /* 更新图标样式 */
		// .icon-placeholder {
		// 	background: rgba(129, 199, 132, 0.1); // 主色10%透明度
		// 	border: 1rpx solid rgba(129, 199, 132, 0.2);
		// }
	}

	.action-group {
		position: fixed;
		bottom: 0;
		left: 100%;
		height: 650rpx;
		width: 100%;
		padding: 40rpx;
		background: rgba(255, 255, 255, 0.95);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		text-align: center;

		&.slide-in {
			left: 0;
		}

		.back-btn {
			position: absolute;
			left: 32rpx;
			top: 32rpx;
			font-size: 36rpx;
			color: #66BB6A
		}

		.confirm-btn {
			width: 60%;
			margin: 40rpx auto 0;
			background: #e63946;
			color: white;
		}

		.ctr-title {
			position: absolute;

			top: 36rpx;
			left: 50%;

			transform: translateX(-50%);
		}

		.offOnBtn {
			position: absolute;
			left: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			width: 100rpx;
			/* 圆形尺寸 */
			height: 100rpx;
			border-radius: 50%;
			/* 圆形 */
			background: #66BB6A;
			/* 绿色背景 */
			z-index: 1;
			/* 确保在其他绝对定位元素之上 */
		}

		.setNum {
			position: absolute;
			left: 50%;
			right: 50%;
			width: 100px;
			transform: translateY(50rpx);

		}

		.setBtn {
			position: absolute;
			left: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			width: 100rpx;
		}

	}
</style>