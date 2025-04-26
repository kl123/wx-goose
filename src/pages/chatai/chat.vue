<template>
	<view class="container">
		<!-- 聊天消息区域 -->
		<scroll-view scroll-y class="chat-container" :scroll-into-view="'msg-' + (messages.length-1)"
			:scroll-with-animation="true">
			<view v-for="(msg, index) in messages" :key="index" :id="'msg-' + index" class="message-row"
				:class="msg.role">
				<view class="message-bubble">
					<text class="message-content">{{ msg.content }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 输入区域 -->
		<view class="input-area">
			<input v-model="inputMsg" class="input-box" placeholder="请输入问题..." @confirm="sendMessage"
				:disabled="loading" />
			<button class="send-btn" @tap="sendMessage" :disabled="loading">发送</button>
			<button class="new-chat-btn" @tap="newChat">新对话</button>
		</view>

		<!-- 加载状态 -->
		<view v-if="loading" class="loading">思考中...</view>
	</view>
</template>

<script>
	const API_KEY = 'sk-f3a0f016d9d34dd98ac8a0a61c04fb09';
	const PRODUCTS = [{
			name: "战斗鹅",
			price: 50,
			description: "认主人、会护院、可散步遛弯、送牵引绳",
			service: "附赠《大鹅驯养指南》（喂食/洗澡/互动教程）",
			notice: "备注：仅限同城配送或自提，支持视频选鹅"
		},
		{

			name: "优质白鹅",
			description: "纯天然放养，肉质鲜嫩，适合炖汤或烧烤。",
			price: 299.00,
			stock: 50,
			category: "家禽",
			weight: "3.5kg/只",

		},
		{

			name: "生态灰鹅",
			description: "绿色生态养殖，富含蛋白质，口感细腻。",
			price: 349.00,
			stock: 30,
			category: "家禽",

			weight: "4.0kg/只",

		},
		{

			name: "精选鹅蛋",
			description: "新鲜鹅蛋，营养丰富，适合煎炒或煮食。",
			price: 59.90,
			stock: 200,
			category: "蛋类",

			weight: "12枚/盒",

		},
		{

			name: "冷冻鹅肉块",
			description: "真空包装，方便储存，适合家庭烹饪。",
			price: 129.00,
			stock: 80,
			category: "冷冻食品",

			weight: "1.5kg/袋",
		},
		{
			product_id: "G005",
			name: "腊味鹅腿",
			description: "传统工艺腌制，风味独特，开袋即食。",
			price: 89.00,
			stock: 60,
			category: "熟食",

			weight: "2只装",
		}
	] // 保持原商品数据

	export default {
		data() {
			return {
				inputMsg: '',
				messages: uni.getStorageSync('chatHistory') || [],
				context: [],
				loading: false,
				products: PRODUCTS
			}
		},
		methods: {
			async sendMessage() {
				if (!this.inputMsg.trim()) return;

				const userMsg = {
					role: 'user',
					content: this.inputMsg
				};
				this.messages.push(userMsg);
				this.context.push(this.inputMsg);

				try {
					this.loading = true;
					const aiResponse = await this.getAIResponse();
					const aiMsg = {
						role: 'assistant',
						content: aiResponse
					};
					this.messages.push(aiMsg);
					this.context.push(aiResponse);
				} catch (e) {
					console.error(e);
					this.messages.push({
						role: 'assistant',
						content: '网络异常，请稍后再试'
					});
				} finally {
					this.loading = false;
					this.inputMsg = '';
					this.saveHistory();
				}
			},
			// 其他方法保持不变...

			async sendMessage() {
				const userMsg = {
					role: 'user',
					content: this.inputMsg
				};
				this.updateChat(userMsg);

				const response = await this.getAIResponse();
				const aiMsg = {
					role: 'assistant',
					content: response
				};
				this.updateChat(aiMsg);

				this.saveHistory();
			},
			async getAIResponse() {
				const prompt = [
					"你是一个智能导购助手，当前商品信息：",
					JSON.stringify(this.products),
					"请根据以下对话记录进行回复：",
					...this.context.slice(-3), // 保持最近3条上下文
					`当前用户问题：${this.inputMsg}`,
					"注意：请以纯文本形式回复，不要使用Markdown格式，也不要包含任何特殊符号（如*、#等）。并尽量模仿客服语气"
				].join('\n');


				const res = await uni.request({
					url: 'https://api.deepseek.com/v1/chat/completions',
					method: 'POST',
					header: {
						'Authorization': `Bearer ${API_KEY}`,
						'Content-Type': 'application/json'
					},
					data: {
						messages: [{
							role: "user",
							content: prompt
						}],
						model: "deepseek-chat",
						temperature: 0.7,
						max_tokens: 1000,
						stream: false
					}
				});



				return res.data.choices[0].message.content || "请换个方式描述您的需求";
			},
			updateChat(message) {
				this.messages.push(message);
				this.context.push(message.content);
				this.inputMsg = '';
			},
			newChat() {
				this.context = [];
				uni.removeStorageSync('chatHistory');
			},
			saveHistory() {
				uni.setStorageSync('chatHistory', this.messages);
			}
		}
	}
</script>

<style lang="scss">
	.container {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.chat-container {
		flex: 1;
		
		background-color: #f5f5f5;
	}

	.message-row {
		margin: 20rpx 20rpx 60rpx 20rpx;
		display: flex;

		&.user {
			justify-content: flex-end;

			.message-bubble {
				background-color: #07c160;
				color: white;
			}
		}

		&.assistant {
			justify-content: flex-start;

			.message-bubble {
				background-color: white;
				border: 1px solid #ddd;
			}
		}
	}

	.message-bubble {
		max-width: 70%;
		padding: 20rpx 30rpx;
		border-radius: 12rpx;
		word-break: break-word;
	}

	.input-area {
		position: fixed;
		width: 100%;
		bottom: 0%;
		padding: 20rpx;
		background: white;
		display: flex;
		align-items: center;
		box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);

		.input-box {
			flex: 1;
			border: 1rpx solid #ddd;
			border-radius: 40rpx;
			padding: 16rpx 30rpx;
			margin-right: 20rpx;
		}

		button {
			margin-left: 10rpx;
			padding: 0 30rpx;
			height: 70rpx;
			line-height: 70rpx;
			border-radius: 40rpx;

			&.send-btn {
				background: #07c160;
				color: white;
			}

			&.new-chat-btn {
				background: #f0f0f0;
			}
		}
	}

	.loading {
		position: fixed;
		bottom: 150rpx;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 15rpx 40rpx;
		border-radius: 40rpx;
	}
</style>