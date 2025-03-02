<template>
  <view class="my">my2</view>
  <button
    size="mini"
    type="primary"
    plain="false"   
    @click="getData"
  >
  测试请求  
  </button>
  <view>测试请求2</view>
  <button
    size="mini"
    type="primary"
    plain="false"   
    @click="getProductList"
  >
  测试请求  
  </button>
  <view>登录页面</view>
  <button
    size="mini"
    type="primary"
    plain="false"   
    @click="onGoToLogin"
  >
  跳转  
  </button>


</template>

<script setup>
import { useUserStore } from '../../stores/user';
import { http } from '../../utils/http';
import { getProductLisByIdstAPI, getProductListAPI } from '../../services/goods';
import { ref } from 'vue';

const userStore = useUserStore();

const getData = async () => {
  // const res = await http({
  //   method:'GET',
  //   url:'http://127.0.0.1:8084/products',
  //   header:{}
  // })

  const res =await getProductListAPI();
  console.log('获取数据成功',res)                                                                                          
}

const getProductList = async () => {
  
  const ids = {
    Ids:[11,12]
  }
  const res = await getProductLisByIdstAPI(ids);
  console.log('获取数据成功',res)                                                                                          
}


const onGoToLogin = () => {
  uni.navigateTo({
    url:'/pages/login/login'
  })
}
 
</script>

<style scoped></style>