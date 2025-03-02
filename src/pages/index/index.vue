<template>
  <view class="container">
    <!-- 固定搜索栏 -->
    <view class="fixed-top">
      <uni-search-bar 
        @confirm="search" 
        :focus="true" 
        v-model="searchValue" 
        @blur="blur" 
        @focus="focus" 
        @input="input"
        @cancel="cancel" 
        @clear="clear"
        placeholder="请输入搜索内容">
      </uni-search-bar>
    </view>

    <!-- 分类栏 -->
    <scroll-view class="category-scroll" scroll-x="true">
      <view 
        class="category-item" 
        v-for="(category, index) in categories" 
        :key="index"
        :class="{ 'active': activeCategory === index }"
        @tap="selectCategory(index)">
        {{ category }}
      </view>
      <view class="category-item more" @click="goToCategoryPage">
        更多
      </view>
    </scroll-view>

    <!-- 可滑动内容区域 -->
    <scroll-view class="content-scroll" scroll-y="true">
      
      <!-- 轮播图 -->
      <swiper 
        class="banner-swiper" 
        :autoplay="true" 
        :interval="3000" 
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

      <!-- 功能区 -->
      <view class="function-area">
        <view class="function-item" v-for="(item, index) in functionItems" :key="index">
          <image class="function-icon" :src="item.icon" mode="aspectFill"></image>
          <text class="function-text">{{ item.text }}</text>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="product-list">
        <view class="product-item" v-for="(product, index) in filteredProducts" :key="index" @tap="onGoToGoodsPage">
          <image class="product-image" :src="product.image" mode="aspectFill"  ></image>
          <view class="product-info">
            <text class="product-name">{{ product.description }}</text>
            <br/>
            <text class="product-price">￥{{ product.price }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app';
import { ref, computed } from 'vue';
import { getProductListAPI } from '../../services/goods';

// 搜索栏相关逻辑
const searchValue = ref('');
const search = () => {
  console.log('搜索:', searchValue.value);
  // 预留搜索接口
};
const blur = () => console.log('失去焦点');
const focus = () => console.log('获得焦点');
const input = () => console.log('输入中');
const cancel = () => {
  searchValue.value = '';
  console.log('取消搜索');
};
const clear = () => {
  searchValue.value = '';
  console.log('清空搜索');
};

// 分类数据
const categories = ref(['推荐', '热门分类1', '热门分类2', '鞋类', '手表', '包']);
const activeCategory = ref(0);

// 商品数据
const products = ref([]
//   [
//   { name: '李宁赤兔8PRO蛇年限', price: '89', image: "/static/logo.png", category: '推荐' },
//   { name: 'X3COMMUNE瓦罗兰特RO', price: '182', image: '/static/goose.jpg', category: '推荐' },
//   { name: '运动鞋', price: '120', image: '/static/product3.jpg', category: '鞋类' },
//   { name: '智能手表', price: '299', image: '/static/product4.jpg', category: '手表' },
//   { name: '背包', price: '150', image: '/static/product5.jpg', category: '包' },
//   // 更多商品...
// ]
);

// 功能区数据
const functionItems = ref([
      { icon: '/static/icon/有奖签到.png', text: '每日签到' },
      { icon: '/static/icon/折扣.png', text: '疯狂折扣' },
      { icon: '/static/icon/领券中心.png', text: '天天领券' },
      { icon: '/static/icon/积分兑换.png', text: '积分兑换' },
      { icon: '/static/icon/品牌专区.png', text: '品牌专区' }
    ]);

// 轮播图数据
const bannerList = ref([
  '/static/logo.png',
  '/static/goose.jpg',
]);

// 根据选中的分类过滤商品
const filteredProducts = computed(() => {
  if (activeCategory.value === 0) {
    return products.value;
  }
  const categoryName = categories.value[activeCategory.value];
  return products.value.filter(product => product.category === categoryName);
});

// 选择分类
const selectCategory = (index) => {
  activeCategory.value = index;
};

// 跳转到分类页面
const goToCategoryPage = () => {
  uni.navigateTo({
    url: '/pages/category/index'
  });
};

// 跳转到商品详情页
const onGoToGoodsPage = () => {
  uni.navigateTo({
    url: '/pages/goods/goods'
  });
};

const getProductList =async () => {
    const res = await getProductListAPI();
    console.log(res);
    products.value = res.data;
}

onLoad(() => {
  getProductList()  
})
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.fixed-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  z-index: 1000;
  padding-bottom: 10px; /* 为分类栏留出空间 */
}

.category-scroll {
  white-space: nowrap;
  padding: 10px 0;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  width: 100%; /* 确保宽度占满 */
  overflow: hidden; /* 防止内容溢出 */
  position: fixed;
  top: 50px; /* 根据搜索栏高度调整 */
  left: 0;
  right: 0;
  z-index: 999; /* 确保分类栏在内容上方 */
}

.category-item {
  display: inline-block;
  margin-top: 2px;
  padding: 0 15px;
  font-size: 14px;
  color: #333;
  position: relative;
  transition: font-size 0.3s ease;
  white-space: nowrap; /* 防止文字换行 */
}

.category-item.active {
  font-size: 16px;
  font-weight: bold;
  color: #000;
}

.category-item.active::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px; /* 加粗小横线 */
  background-color: #00bcd4; /* 青色 */
  border-radius: 2px; /* 圆角效果 */
}

.category-item.more {
  color: #00bcd4;
}

.content-scroll {
  flex: 1;
  margin-top: 100px; /* 根据搜索栏和分类栏高度调整 */
}

/* 轮播图样式 */
.banner-swiper {
  width: 100%;
  height: 200px; /* 固定高度 */
  margin-bottom: 10px; /* 与下方内容的间距 */
}

.banner-image {
  width: 100%;
  height: 100%;
  border-radius: 8px; /* 圆角 */
}

.product-list {
  display: flex;
  flex-wrap: wrap;
  padding: 10px;
}

.product-item {
  width: 48%;
  margin: 1%;
  background-color: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 150px;
}

.product-info {
  padding: 10px;
}

.product-name {
  font-size: 14px;
  color: #333;
}

.product-price {
  font-size: 16px;
  color: #e4393c;
  font-weight: bold;
}

/* 功能区样式 */
.function-area {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  padding: 20px 0;
  background-color: #ffffff;
}

.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.function-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
}

.function-text {
  font-size: 12px;
  color: #333;
}
</style>