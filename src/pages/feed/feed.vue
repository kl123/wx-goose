<template>
  <view class="container">
    <view class="card-container">
      <view class="card" v-for="(area, index) in areas" :key="index" @click="handleCardClick(area)">
        <text class="card-name">{{ area.name }}</text>
        <text class="card-remaining">剩余: {{ area.remaining }}kg</text>
        <image class="card-icon" :src="area.icon" mode="aspectFit"></image>
      </view>
    </view>

    <view class="action-container">
      <view class="action-card" @click="navigateTo('feedWater')">
        <image class="action-icon" src="/static/logo.png" mode="aspectFit"></image>
        <text class="action-name">喂水</text>
      </view>
      <view class="action-card" @click="navigateTo('feedFood')">
        <image class="action-icon" src="/static/logo.png" mode="aspectFit"></image>
        <text class="action-name">喂食</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const areas = ref([
  { name: '蓄水池', icon: '/static/logo.png', remaining: 120 },
  { name: '喂水区', icon: '/static/logo.png', remaining: 80 },
  { name: '饲料池', icon: '/static/logo.png', remaining: 200 },
  { name: '饲料区', icon: '/static/logo.png', remaining: 150 },
]);

const handleCardClick = (area) => {
  if (area.name === '蓄水池') {
    uni.showModal({
      title: '抽水到喂水区',
      editable: true,
      placeholderText: '输入水量',
      success: (res) => {
        if (res.confirm) {
          const amount = parseFloat(res.content);
          if (!isNaN(amount) && amount > 0) {
            if (area.remaining >= amount) {
              area.remaining -= amount;
              const feedingArea = areas.value.find(a => a.name === '喂水区');
              if (feedingArea) {
                feedingArea.remaining += amount;
                console.log(`从${area.name}抽水${amount}kg到喂水区，蓄水池剩余${area.remaining}kg，喂水区剩余${feedingArea.remaining}kg`);
              }
            } else {
              uni.showToast({
                title: '蓄水池水量不足',
                icon: 'none',
              });
            }
          } else {
            uni.showToast({
              title: '请输入有效的水量',
              icon: 'none',
            });
          }
        }
      },
    });
  } else if (area.name === '饲料池') {
    uni.showModal({
      title: '加饲料到饲料区',
      editable: true,
      placeholderText: '输入饲料量',
      success: (res) => {
        if (res.confirm) {
          const amount = parseFloat(res.content);
          if (!isNaN(amount) && amount > 0) {
            if (area.remaining >= amount) {
              area.remaining -= amount;
              const feedingArea = areas.value.find(a => a.name === '饲料区');
              if (feedingArea) {
                feedingArea.remaining += amount;
                console.log(`从${area.name}加饲料${amount}kg到饲料区，饲料池剩余${area.remaining}kg，饲料区剩余${feedingArea.remaining}kg`);
              }
            } else {
              uni.showToast({
                title: '饲料池饲料不足',
                icon: 'none',
              });
            }
          } else {
            uni.showToast({
              title: '请输入有效的饲料量',
              icon: 'none',
            });
          }
        }
      },
    });
  }
};

const navigateTo = (page) => {
  uni.navigateTo({
    url: `/pages/feed/${page}`
  });
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.card-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
}

.card {
  width: 38%;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  aspect-ratio: 3 / 2; /* 长方形卡片 */
  display: flex;
  flex-direction: column;
  position: relative;
}

.card-name {
  font-size: 18px;
  font-weight: bold;
  position: absolute;
  top: 10px;
  right: 10px;
}

.card-remaining {
  font-size: 14px;
  color: #666;
  position: absolute;
  bottom: 10px;
  left: 10px;
}

.card-icon {
  width: 30px;
  height: 30px;
  position: absolute;
  top: 10px;
  left: 10px;
}

.action-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 20px;
}

.action-card {
  width: 28%;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1; /* 方形卡片 */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.action-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%; /* 圆形图片 */
}

.action-name {
  font-size: 16px;
  margin-top: 10px;
}
</style>