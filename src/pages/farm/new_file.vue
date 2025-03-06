<template>
	<view class="container">
		<view class="status">当前状态：{{ deviceStatus }}</view>
		<view class="data-box">
			<text>接收到的数据：{{ receivedData }}</text>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		onMounted,
		onUnmounted
	} from 'vue'
	import mqtt from 'mqtt/dist/mqtt.js' // 必须引入dist目录下的文件

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
	const receivedData = ref('暂无数据')
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

			// receivedData.value = message.toString()
			// console.log('收到数据:', receivedData.value)
			const result = JSON.parse(message);
			receivedData.value = result.temperature;

			console.log('Temperature:', receivedData.value.toString());

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
</script>

<style>
	.container {
		padding: 20rpx;
	}

	.status {
		color: #666;
		margin-bottom: 30rpx;
	}

	.data-box {
		background: #f5f5f5;
		padding: 20rpx;
		border-radius: 10rpx;
	}
</style>