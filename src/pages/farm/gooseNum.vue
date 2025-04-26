<template>
	<view class="container">
		<!-- 主容器垂直水平居中 -->
		<view class="main-content">
			<!-- 图片展示区域 -->
			<view class="image-gallery">
				<image :src="ImagePath" mode="aspectFit" class="result-image" />
			</view>

			<!-- 图片空白时提示 -->
			<view v-if="!isget" class="img-notice"> 点击获取查看当前鹅厂状况</view>
			<view v-if="isget" class="img-loading"> 请稍后……</view>

			<view>
				<!-- 图片列表 -->
				<block v-for="(item, index) in imgList" :key="index" class="image-gallery">
					<image :src="item.url" mode="aspectFill" class="result-image" 
						@click="clickImg({ currentTarget: { dataset: { index } } })"></image>
					<text>{{ item.time }}</text>
				</block>
			</view>

			<!-- 数据统计展示 -->
			<view class="abord">
				<view class="stats-container">
					<view class="stat-item">
						<h3 class="label">大鹅</h3>
						<text class="count">{{ counts?.[0] }}</text>
					</view>
					<view class="stat-item">
						<h3 class="label">小鹅</h3>
						<text class="count">{{ counts?.[1] }}</text>
					</view>
					<view class="stat-item">
						<h3 class="label">鹅蛋</h3>
						<text class="count">{{ counts?.[2] }}</text>
					</view>
				</view>

				<!-- 操作按钮 -->
				<button type="primary" class="action-btn" @click="getYolo">获取</button>
			</view>
		</view>
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

	const ImagePath = ref('');
	const counts = ref([0, 0, 0]);
	const imageUrls = ref();
	const isget = ref(0)
	// 巴法云配置（需替换为实际参数）
	const config = {
		url: 'wxs://bemfa.com:9504/wss', // 微信小程序必须用wx协议头
		options: {
			clientId: '6fc94297b1a4771e713523fd16d19702', // 从巴法云控制台获取
			keepalive: 60, // 心跳间隔
			clean: true,
			protocolVersion: 4,
		},
		topic: 'Machine', // 订阅的主题名
	}
	// 响应式数据
	const deviceStatus = ref('连接中...')
	const updateTime = ref('从未更新') // 新增：用于记录数据更新时间
	let client = ref(null)
	let reconnectTimer = ref(null)
	// 生命周期
	onMounted(() => {
		getPicture();
		initMQTT()
	})
	onUnmounted(() => {
		disconnectMQTT()
	})
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
	// 发送消息方法
	const sendMessage = (sendTopic, message) => {
		console.log(`进入了发送函数`)
		if (!client.value || !client.value.connected) {
			deviceStatus.value = '未连接，无法发送'
			return
		}
		console.log(`通过了校验可以发送`)
		const payload = {
			// value: Math.floor(Math.random() * 100) // 示例：发送随机数
			// 这里可以添加更多需要传输的数据字段
			value: message
		}
		console.log(`发送的目标是：${sendTopic}`)
		console.log(`准备的数据是${payload.value}`)
		client.value.publish(
			sendTopic,
			// config.tempTopic,
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

	const uid = "6fc94297b1a4771e713523fd16d19702"; // 用户密钥，巴法云控制台获取
	const myTopic = "goose"; // 图片上传的主题，图片云控制台创建
	const num = 1; // 获取的图片数量，可随意
	const imgList = ref([]); // 存储图片地址和时间，用于前端展示
	const picArr = ref([]); // 存储图片的地址，用于图片点击预览

	const getPicture = () => {
		wx.request({
			url: 'https://images.bemfa.com/cloud/v1/get/', // 获取图片接口
			data: {
				uid: uid, // uid字段
				topic: myTopic, // topic字段
				num: num // num字段
			},
			header: {
				'content-type': "application/x-www-form-urlencoded"
			},
			success(res) {
				console.log(res); // 打印获取结果
				const imgArr = []; // 定义空数组，用于临时存储图片地址和时间
				const arr = []; // 定义空数组，用于临时存储图片地址

				for (let i = 0; i < res.data.data.length; i++) { // 遍历获取的结果数组
					const url = res.data.data[i].url; // 提取图片地址
					const time = formatTime(url.substring(url.lastIndexOf("-") + 1, url.lastIndexOf(
					"."))); // 提取图片时间
					imgArr.push({
						url,
						time
					}); // 将存储图片地址和时间存入临时数组
					arr.push(url); // 将存储图片地址存入临时数组
				}

				imgList.value = imgArr; // 将临时存储图片地址和图片时间的数组赋值给用于图片预览的数组
				picArr.value = arr; // 将临时存储图片地址的数组赋值给用于图片预览的数组

				console.log(imgList.value); // 打印赋值结果
			}
		});
	};
	// 点击预览函数
	const clickImg = (e) => {
	  const nowIndex = e.currentTarget.dataset.index; // 获取索引值
	  console.log(nowIndex); // 打印数组索引值
	  wx.previewImage({ // 图片预览接口
	    current: picArr.value[nowIndex], // 当前图片地址
	    urls: picArr.value // 图片地址数组
	  });
	};
	
	// 时间戳转时间函数
	const formatTime = (time) => {
	  const date = new Date(parseInt(time) * 1000 + 8 * 3600 * 1000);
	  return date.toJSON().substr(0, 19).replace('T', ' ');
	};


	// const testImg  = "http://127.0.0.1:8080/exp30/3.31-3.jpg"
	// console.log(`this is ${testImg}`)

	const getYolo = () => {
		isget.value = 1;
		const jsonDate = {
			"status": "off",
		};
		sendMessage(config.topic, jsonDate);

		fetchData();
	}


	const fetchData = async () => {
		try {
			const res = await uni.request({
				url: 'http://localhost:8084/wechat/detect',
				method: 'GET'
			});
			console.log(res)
			// 正确获取响应数据
			ImagePath.value = res.data.imagePath;
			counts.value = res.data.counts;
			isget.value = 0;

			ImagePath.value = ImagePath.value.replace('E:\\Git\\yolov5\\runs\\detect', 'http://127.0.0.1:8080/')
				.replace(/\\/g, '/')
			ImagePath.value = ImagePath.value + '/微信图片_20250329180726.jpg';
			console.log(`sucess get YOLO`)
			console.log(ImagePath.value)

			console.log(counts)
			console.log(`value:`, counts.value)
			console.log(`value:`, counts.value[0])
			// // 数据校验
			// if (!path || !Array.isArray(cnts)) {
			// 	throw new Error('Invalid response data');
			// }

			// imagePath.value = path;
			// counts.value = cnts;

			// 转换路径（修改为更可靠的转换方式）
			// const formattedPath = path
			// 	.replace(/\\/g, '/')
			// 	.replace('E:/Git/yolov5/runs/detect', 'http://localhost:8084/exp');

			// 生成图片URL（增加容错）

		} catch (err) {
			uni.showToast({
				title: '数据加载失败',
				icon: 'none'
			});
			console.error('请求异常:', err);
		}
	}

	// onMounted(() => {
	// 	fetchData();
	// });
</script>

<style>
	.container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;

		box-sizing: border-box;
	}

	.img-notice {
		width: 100%;
		text-align: center;
	}

	.img-loading {
		width: 100%;
		text-align: center;
	}

	.abord {
		transform: translateY(150px);
		justify-content: center;
		align-items: center;
	}

	.main-content {
		width: 100%;

	}

	.image-gallery {
		position: fixed;
		top: 20px;

		width: 100%;
		margin-bottom: 40rpx;
	}

	.result-image {
		width: 100%;
		height: 780rpx;
		border-radius: 16rpx;
	}

	.stats-container {
		display: flex;
		justify-content: space-around;
		margin-bottom: 60rpx;
		padding: 0 40rpx;
	}

	.stat-item {
		text-align: center;
	}

	.label {
		font-size: 35rpx;
		color: #666;
		display: block;
		margin-bottom: 18rpx;
	}

	.count {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}

	.action-btn {
		width: 80%;
		margin: 0 auto;
		background-color: #07c160;
		border-radius: 48rpx;
		font-size: 32rpx;
	}
</style>