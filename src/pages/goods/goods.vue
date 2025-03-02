<template>
  <view>
    <!-- 滑动容器 -->
    <scroll-view class="main-scroll" scroll-y>
      <!-- 轮播图 -->
      <view class="image-container">
        <swiper
          class="banner-swiper"
          :autoplay="false"
          :duration="500"
          circular="true"
          indicator-dots="true"
          indicator-color="rgba(255, 255, 255, 0.5)"
          indicator-active-color="#00bcd4"
        >
          <swiper-item v-for="(item, index) in bannerList" :key="index">
            <image class="banner-image" :src="item" mode="aspectFill"></image>
          </swiper-item>
        </swiper>
      </view>

      <!-- 商品信息卡片 -->
      <uni-card title="$95" :isFull="true" extra="***一分钟前购买">
        <template v-slot:title>
          <view style="margin-top: 15px;">
            <text style="font-size: 28px; font-weight: bold;">
              <text style="font-size: 60%;">￥</text>95
            </text>
          </view>
        </template>
        <text>这是一个通栏卡片，通栏没有外边距，左右会贴合父元素。</text>
      </uni-card>

      <!-- 商品详情区域 -->
      <view class="detail-content">
        <text class="detail-title">商品详情</text>
        <br>
        <text class="detail-text">
          这里是商品的详细描述内容，可以包括商品的材质、尺寸、使用方法等信息。
          这里是商品的详细描述内容，可以包括商品的材质、尺寸、使用方法等信息。
          这里是商品的详细描述内容，可以包括商品的材质、尺寸、使用方法等信息。
        </text>
        <image
          class="detail-image"
          src="/static/detail-example.jpg"
          mode="widthFix"
        ></image>
      </view>
    </scroll-view>

    <!-- 购买栏 -->
    <uni-goods-nav
      :options="navOptions"
      :buttonGroup="buttonGroup"
      @click="onNavClick"
      @buttonClick="onButtonClick"
      class="goods-nav"
    />
  </view>
</template>

<script setup>
import { ref } from "vue";

// 轮播图数据
const bannerList = ref(["/static/logo.png", "/static/goose.jpg"]);

// 购买栏配置
const navOptions = ref([
  {
    icon: "shop",
    text: "店铺",
  },
  {
    icon: "cart",
    text: "购物车",
    info: 2, // 购物车数量
  },
]);

const buttonGroup = ref([
  {
    text: "加入购物车",
    backgroundColor: "#ffa200",
    color: "#fff",
  },
  {
    text: "立即购买",
    backgroundColor: "#00bcd4",
    color: "#fff",
  },
]);

// 购买栏点击事件
const onNavClick = (e) => {
  console.log("点击了导航按钮:", e);
};

const onButtonClick = (e) => {
  console.log("点击了操作按钮:", e);
};
</script>

<style scoped>
/* 滑动容器 */
.main-scroll {
  height: calc(100vh - 50px); /* 减去购买栏的高度 */
  background-color: #f8f8f8;
}

/* 轮播图样式 */
.banner-swiper {
  width: 100%;
  height: 350px; /* 固定高度 */
  margin-bottom: 10px; /* 与下方内容的间距 */
}

.banner-image {
  width: 100%;
  height: 100%;
  border-radius: 8px; /* 圆角 */
}

/* 商品信息卡片 */
.uni-card {
  margin: 20px 0; /* 增加卡片的外边距 */
}

/* 商品详情区域 */
.detail-content {
  padding: 16px;
  background-color: #fff;
}

.detail-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.detail-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.detail-image {
  width: 100%;
  border-radius: 8px;
}

/* 购买栏样式 */
.goods-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50px; /* 购买栏高度 */
  z-index: 999;
  background-color: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}
</style>