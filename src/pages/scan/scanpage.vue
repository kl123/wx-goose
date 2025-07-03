<template>
	<scroll-view class="container">
		<!-- 体重秤实时结果页面 -->

		<!-- 输入物品编码 -->
		<view v-if="codeGet" class="input-section">
			<image class="function-icon" :src="'/static/icon/ComfyUI_00065_02.png'" mode="aspectFill"></image>

			<input id="num-input" placeholder="请输入大鹅编码" v-model="itemCode" />
			<view class="iconfont icon-saoma" @click="scanQRCode">扫描二维码获取编号</view>
			<button class="button-style" @click="postCode">确认</button>
			<view class="weighBtn" @click="Toweigh">
				<image src="/src/static/icon/称重设置.png" style="height: 30px;width: 30px;"></image>
				<view>使用体重称更新体重</view>
			</view>

		</view>

		<!-- 拍摄或上传照片 -->
		<view v-if="photoGet" class="photo-part">
			<view class="eIdBox">
				<view class="eId">编号：{{ itemCode }}</view>
				<button class="mini-btn" type="default" size="mini" @click="modifyNum">修改编号</button>
			</view>

			<view class="weight">
				<view>历史体重：{{ weightHistory }}</view>
				<view>本次结果：{{ result }}</view>
			</view>


			<view class="photo-section">
				<view class="photo1">
					<view class="photo1-box1">
						<image :src="photo1" mode="aspectFit"
							style="width: 370rpx;height:500rpx;background-color: #eeeeee;"></image>
					</view>
					<view class="photo1-Button-box">
						<button type="primary" plain="true" size="mini" @click="takePhoto(1)">拍摄照片1</button>
						<button type="primary" plain="true" size="mini" @click="chooseImage(1)">从图库选择照片1</button>
					</view>
				</view>
				<view class="photo2">
					<view class="photo1-box1">
						<image :src="photo2" mode="aspectFit"
							style="width: 370rpx;height:500rpx;background-color: #eeeeee;"></image>
					</view>
					<view class="photo2-Button-box">
						<button type="primary" plain="true" size="mini" @click="takePhoto(2)">拍摄照片2</button>
						<button type="primary" plain="true" size="mini" @click="chooseImage(2)">从图库选择照片2</button>
					</view>
				</view>
			</view>
			<button type="primary" @click="submit">提交</button>
		</view>

		<!-- 显示结果 -->
		<view v-if="result" class="result-section">
			<text>分析结果: {{ result }}</text>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref,
		defineComponent
	} from 'vue';

	import {
		storeToRefs
	} from 'pinia'
	import {
		useUserStore
	} from '@/stores/user'
	import {
		onLoad
	} from '@dcloudio/uni-app'

	const userStore = useUserStore()
	const {
		token
	} = storeToRefs(userStore)

	const itemCode = ref(''); // 物品编码
	const photo1 = ref(''); // 照片1
	const photo2 = ref(''); // 照片2
	const result = ref(''); // 分析结果
	const weightHistory = ref('0000'); // 历史体重
	const codeGet = ref(true);
	const photoGet = ref(false);

	onLoad(() => {
		if (token.value) {
			console.log('已登录，Token:', token.value)
			// 发起需要 Token 的请求
			// fetchDataWithToken(token.value)
		} else {
			uni.showToast({
				title: '请先登录',
				icon: 'none'
			})
			setTimeout(() => uni.navigateTo({
				url: '/pages/login/login'
			}), 1500)
		}
	})

	// 体重秤页面
	const Toweigh = () => {
		uni.navigateTo({
			url: '/pages/scan/weigh'
		});
	}

	// 扫描二维码
	const scanQRCode = () => {
		wx.scanCode({
			success: (res) => {
				itemCode.value = res.result;
				codeGet.value = !codeGet.value;
				photoGet.value = !photoGet.value;
			},
			fail: (err) => {
				console.error('扫描失败', err);
			}
		});
	};

	// 拍摄照片
	const takePhoto = (photoNumber) => {
		wx.chooseImage({
			count: 1,
			sizeType: ['original', 'compressed'],
			sourceType: ['camera'],
			success: (res) => {
				if (photoNumber === 1) {
					photo1.value = res.tempFilePaths[0];
				} else if (photoNumber === 2) {
					photo2.value = res.tempFilePaths[0];
				}
			},
			fail: (err) => {
				console.error('拍摄照片失败', err);
			}
		});
	};

	// 确认输入的编号
	const postCode = () => {
		codeGet.value = !codeGet.value;
		photoGet.value = !photoGet.value;
	};

	// 修改编号（返回扫码界面）
	const modifyNum = () => {
		codeGet.value = !codeGet.value;
		photoGet.value = !photoGet.value;
	};

	// 从图库选择照片
	const chooseImage = (photoNumber) => {
		wx.chooseImage({
			count: 1,
			sizeType: ['original', 'compressed'],
			sourceType: ['album'],
			success: (res) => {
				if (photoNumber === 1) {
					photo1.value = res.tempFilePaths[0];
				} else if (photoNumber === 2) {
					photo2.value = res.tempFilePaths[0];
				}
			},
			fail: (err) => {
				console.error('选择照片失败', err);
			}
		});
	};

	// 处理大鹅图片估计体重
	//   POST /products/ImageContour
	//   接口ID：268399450
	//   接口地址：https://app.apifox.com/link/project/5753061/apis/api-268399450

	// 提交数据
	const submit = () => {
		if (!itemCode.value || !photo1.value || !photo2.value) {
			wx.showToast({
				title: '请填写完整信息',
				icon: 'none'
			});
			return;
		}

		// 上传照片到服务器
		const uploadTasks = [
			uploadFile(photo1.value),
			uploadFile(photo2.value)
		];

		Promise.all(uploadTasks).then((uploadResults) => {
			const photo1Url = uploadResults[0];
			const photo2Url = uploadResults[1];

			// 发送数据到后台
			wx.request({
				url: '____________________________',
				method: 'POST',
				data: {
					itemCode: itemCode.value,
					photo1: photo1Url,
					photo2: photo2Url
				},
				success: (res) => {
					result.value = res.data.result;
				},
				fail: (err) => {
					console.error('提交失败', err);
				}
			});
		});
	};

	// 上传文件到服务器
	const uploadFile = (filePath) => {
		return new Promise((resolve, reject) => {
			wx.uploadFile({
				url: 'https://your-backend-url.com/upload',
				filePath: filePath,
				name: 'file',
				success: (res) => {
					resolve(res.data.url); // 假设返回的数据中包含图片的URL
				},
				fail: (err) => {
					reject(err);
				}
			});
		});
	};
	
	// 调用api接口上传图片
	
	const submitEstimation = async () => {
	      try {
	        // 验证图片路径
	        if (!photo1.value || !photo2.value) {
	          throw new Error('请上传完整的图片');
	        }
	
	        构造上传参数
	        const formData = {
	          sideImage: photo1.value.replace('file://', ''), // 去除协议前缀
	          backImage: photo2.value.replace('file://', ''),
	          gooseId: itemCode.value
	        };
			
	// 		const formData = {
	// 		  sideImage: {
	// 		    uri: photo1.value.replace('file://', ''),
	// 		    name: 'side.jpg',
	// 		    type: 'image/jpeg'
	// 		  },
	// 		  backImage: {
	// 		    uri: photo2.value.replace('file://', ''),
	// 		    name: 'back.jpg',
	// 		    type: 'image/jpeg'
	// 		  },
	// 		  gooseId: itemCode.value
	// 		};
	
	        // 发起文件上传请求
	        const [error, res] = await uni.uploadFile({
	          url: 'https://app.apifox.com/link/project/5753061/apis/api-268399450',
	          filePaths: [formData.sideImage, formData.backImage], // 需要上传的文件路径数组
	          name: 'file', // 后端接收文件的字段名（需确认）
	          formData: {
	            gooseId: formData.gooseId
	          },
	          header: {
	            'Authorization': `Bearer ${token.value}`
	          }
	        });
	
	        // 处理响应
	        if (error) throw error;
	        const result = JSON.parse(res.data);
	        
	        if (result.code === 0) {
	          console.log('体重估计成功:', result.data);
	          return result.data;
	        } else {
	          throw new Error(result.msg || '未知错误');
	        }
	
	      } catch (err) {
	        console.error('体重估计失败:', err);
	        throw err;
	      }
	    };
</script>

<style>
	page {
		background-color: #ddffe4;
	}

	input {
		width: 100%;
		padding: 10px;
		border: 1px solid #ccc;
		margin-bottom: 10px;
	}

	.weighBtn {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 15px;
	}

	/* 定义按钮的基本样式 */
	.button-style {
		/* 设置背景颜色为水蓝色 */
		background-color: #b3dcff;
		/* 水蓝色，也可以使用rgb(0, 255, 255) */
		padding: 1px 50px;
		font-size: 16px;
		text-decoration: none;
		display: inline-block;
		border-radius: 12px;
		border: none;
		transition: background-color 0.3s ease;
	}

	.button-style:hover {
		/* 鼠标悬停时的背景颜色，稍微加深一点以提供视觉反馈 */
		background-color: #00ced1;
		/* 更深一点的水蓝色 */
	}

	.container {
		text-align: center;
	}

	.input-section {
		margin-top: 25%;
		margin-bottom: 5%;
		display: inline-block;
	}

	.function-icon {
		width: 170rpx;
		height: 170rpx;
	}

	#num-input {
		margin-top: 10%;
		margin-bottom: 18px;
		width: 415rpx;
		border-radius: 14px;
		/* 圆角半径 */
		padding: 10px;
		/* 内边距 */
		border: 1px solid #000000;
		/* 边框样式 */
	}

	.iconfont {
		margin-top: 5%;
		margin-bottom: 15%;
		font-family: "iconfont" !important;
		font-size: 17px;
		font-style: normal;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* 页面2 */
	.photo-part {
		margin-top: 10%;
		margin-bottom: 2%;
		/* display: inline-block; */
	}

	/* 编号区 */
	.eIdBox {
		margin-left: auto;
		margin-right: auto;
		flex-direction: row;
		justify-content: center;
		text-align: center;
		width: 600rpx;
		/* background-color: antiquewhite; */
	}

	/* 编号 */
	.eId {
		margin-bottom: 5px;
		display: flex;
		/* background-color: aqua; */
		justify-content: center;
		align-items: center;
	}

	/* 修改按钮 */
	.eId-button-style {
		/* 设置背景颜色为水蓝色 */
		background-color: #b3dcff;
		/* 水蓝色，也可以使用rgb(0, 255, 255) */
		padding: 0px 20px;
		font-size: 16px;
		text-decoration: none;
		display: flex;
		border-radius: 12px;
		border: none;
		transition: background-color 0.3s ease;
	}

	/* 照片 */
	.photo-section {
		margin-top: 10%;
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
		padding: 2px 0;
	}

	.photo1-box1 {
		/* background-color: grey; */
		height: 500rpx;
		margin-bottom: 3%;
	}

	.photo2-box1 {
		/* background-color: grey; */
		height: 500rpx;
		margin-bottom: 3%;
	}
</style>