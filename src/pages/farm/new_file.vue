<template>
	<view class="container">
		<!-- 操作模块列表 -->
		<view class="module-group">
			<view v-for="(item, index) in modules" :key="item.title" class="module-item"
			:style="[backgroundStyles[index], { transitionDelay: `${index * 50}ms` }]"
			:class="{ 'slide-out': isAnimating }" @click="startAnimation">
			<view class="module-left">
				<view class="icon-placeholder"></view>
				<view class="icon-placeholder"></view>
			</view>
			<text class="module-title">{{ item.title }}</text>
			<view v-if="item.type === 'arrow'" class="arrow-right">→</view>
			<switch v-if="item.type === 'switch'" :checked="item.value" />
			</view>
		</view>
		

		<!-- 操作按钮组 -->
		<view class="action-group" :class="{ 'slide-in': showActions }">
			<view class="back-btn" @click="resetAnimation">‹ 返回</view>
			<button class="confirm-btn" @click="handleConfirm">确认操作</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted
	} from 'vue';

	const modules = ref([
		{
			title: '智能监控模式',
			type: 'switch',
			value: false
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
		[ '#C8E6C9','#E8F5E9'], // 薄荷绿+嫩芽绿
		[ '#BBDEFB','#E3F2FD'], // 天空蓝+浅灰蓝
		[ '#FFECB3','#FFF8E1'], // 日光黄+香槟金
		[ '#E1BEE7','#F3E5F5'], // 浅藕荷+淡紫
		[ '#B2DFDB','#E0F2F1'] // 灰绿+水绿色
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

	const startAnimation = () => {
		if (isAnimating.value) return;
		isAnimating.value = true;

		// 按钮延迟出现
		setTimeout(() => {
			showActions.value = true;
		}, modules.value.length * 50 + 200);
	};

	const resetAnimation = () => {
		isAnimating.value = false;
		showActions.value = false;
	};
</script>

<style lang="scss">
	.container {
		padding: 24rpx;
		background: #fff;
	}
	
	.module-group{
		position: fixed;
				bottom: 24rpx;
				left: 24rpx;
				right: 24rpx;
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
		

		// 移除模糊效果
		-webkit-backdrop-filter: none;

		&:active {
			transform: scale(0.98) translateY(2rpx);
		}

		&.slide-out {
			opacity: 0;
			transform: translateY(-100%);
			pointer-events: none;
		}

		.module-left {
			display: flex;
			gap: 16rpx;
			margin-right: 32rpx;

			.icon-placeholder {
				width: 48rpx;
				height: 48rpx;
				background: #e9ecef;
				border-radius: 8rpx;
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

		/* 更新图标样式 */
		.icon-placeholder {
			background: rgba(129, 199, 132, 0.1); // 主色10%透明度
			border: 1rpx solid rgba(129, 199, 132, 0.2);
		}
	}

	.action-group {
		position: fixed;
		bottom: -200rpx;
		left: 0;
		width: 100%;
		padding: 40rpx;
		background: rgba(255, 255, 255, 0.95);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

		&.slide-in {
			bottom: 0;
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
	}
</style>