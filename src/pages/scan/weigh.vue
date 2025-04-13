<template>
	<view class="container">
		<view class="status">当前状态：{{ deviceStatus }}</view>

		<view class="card">
			<!-- 鹅ID -->
			<view v-if="gooseData" class="id-text">{{ gooseData.ID }}</view>

			<!-- 更新时间 -->
			<view class="time-text">更新时间：{{ gooseData.type === 'noupdate' ? '' : formatTime(new Date(updateTime)) }}</view>

			<!-- 出入库状态 -->
			<view v-if="gooseData.type !== 'noupdate'" :class="['status-tag', gooseData.type === 'OUT' ? 'out' : 'in']" :style="{ 
          backgroundColor: gooseData.type === 'OUT' ? '#ffe6d5' : '#d5ffe6',
          borderColor: gooseData.type === 'OUT' ? '#ff4400' : '#00cc66'
        }">
				{{ gooseData.type === 'OUT' ? '出库' : '入库' }}
			</view>
			
			<view v-if="gooseData.type === 'noupdate'" :class="['status-tag',]" :style="{
			  backgroundColor: '#ededed',
			  borderColor: '#b8b8b8'
			}">
					等待中
			</view>

			<!-- 体重数据 -->
			<view class="weight-box">
				<text class="weight-value">{{ gooseData.Weight }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		ref,
		onMounted,
		onUnmounted
	} from 'vue';
	import mqtt from 'mqtt/dist/mqtt.js'

	export default {
		setup() {
			// 响应式数据
			const deviceStatus = ref('连接中...');
			const loading = ref(true); // 初始化为 true，表示加载中
			const updateTime = ref('从未更新');
			const gooseData = ref({
				ID: "000000",
				Weight: "0000 kg",
				type: "noupdate"
			});
			let client = ref(null);
			let reconnectTimer = ref(null);

			// 巴法云配置
			const config = {
				url: 'wxs://bemfa.com:9504/wss', // 微信小程序必须用 wx 协议头
				options: {
					clientId: '6fc94297b1a4771e713523fd16d19702', // 替换为实际值
					keepalive: 60, // 心跳间隔
					clean: true,
					protocolVersion: 4,
				},
				topic: 'IDcard', // 订阅的主题名
			};

			// 格式化时间
			const formatTime = (date) => {
				const pad = (n) => n.toString().padStart(2, '0');
				return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
			};

			// MQTT 初始化
			const initMQTT = () => {
				client.value = mqtt.connect(config.url, config.options);

				// 连接成功
				client.value.on('connect', () => {
					deviceStatus.value = '已连接';
					client.value.subscribe(config.topic, {
						qos: 1
					}, (err) => {
						if (!err) console.log('订阅成功');
					});
					loading.value = false; // 加载完成
				});

				// 接收消息
				client.value.on('message', (topic, message) => {
					const result = JSON.parse(message.toString());
					gooseData.value = result;
					updateTime.value = new Date(); // 更新时间为当前时间
				});

				// 错误处理
				client.value.on('error', (err) => {
					deviceStatus.value = '连接异常';
					console.error('MQTT错误:', err);
					handleReconnect();
				});
			};

			// 断线重连
			const handleReconnect = () => {
				if (!reconnectTimer.value) {
					reconnectTimer.value = setInterval(() => {
						if (!client.value.connected) {
							deviceStatus.value = '尝试重连...';
							initMQTT();
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

			// 生命周期钩子
			onMounted(() => {
				initMQTT();
			});

			onUnmounted(() => {
				disconnectMQTT();
			});

			// 返回模板中使用的变量和方法
			return {
				deviceStatus,
				loading,
				gooseData,
				updateTime,
				formatTime,
			};
		}
	};
</script>

<style>
	.container {
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #f5f5f5;
	}


	.status {
		color: #666;
		position: absolute;
		top: 20px;
		z-index: 10;
	}

	.card {
		position: absolute;
		right: 50%;
		top: 50%;
		background: white;
		
		border-radius: 20rpx;
		padding: 60rpx 40rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
		transform: translateY(-60%) translateX(50%);
		text-align: center;
		width: 80%;
	}

	.id-text {
		font-size: 36rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 28rpx;
	}

	.time-text {
		font-size: 24rpx;
		color: #999;
		margin-bottom: 40rpx;
	}

	.status-tag {
		padding: 16rpx 40rpx;
		border-radius: 40rpx;
		font-size: 28rpx;
		font-weight: 500;
		margin-bottom: 50rpx;
		display: inline-block;
		border-width: 2rpx;
		border-style: solid;
	}

	.out {
		color: #ff4400 !important;
	}

	.in {
		color: #00cc66 !important;
	}

	.weight-box {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.weight-value {
		font-size: 60rpx;
		font-weight: 700;
		color: #e54d42;
		position: relative;
	}

	.weight-value::after {
		content: '';
		position: absolute;
		width: 120%;
		height: 20rpx;
		background: linear-gradient(90deg, #fadbd8, #e54d42, #fadbd8);
		bottom: -10rpx;
		left: -10%;
		border-radius: 20rpx;
		opacity: 0.6;
	}

	.loading {
		font-size: 28rpx;
		color: #666;
	}
</style>