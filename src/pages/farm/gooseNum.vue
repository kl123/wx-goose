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
		onMounted
	} from 'vue';

	const ImagePath = ref('');
	const counts = ref([0, 0, 0]);
	const imageUrls = ref();
	const isget = ref(0)


	// const testImg  = "http://127.0.0.1:8080/exp30/3.31-3.jpg"
	// console.log(`this is ${testImg}`)

	const getYolo = () => {
		isget.value = 1;
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
	
	.img-notice{
		width: 100%;
		text-align: center;
	}
	.img-loading{
		width: 100%;
		text-align: center;
	}
	
	.abord{
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