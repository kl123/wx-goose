<template>
    <view class="lottie-container">
      <canvas :canvas-id="canvasId" :id="canvasId" style="width:300px;height:300px;"></canvas>
    </view>
  </template>
  
  <script>
  import lottie from 'lottie-miniprogram';
  
  export default {
    data() {
      return {
        canvasId: 'lottieCanvas' + Math.floor(Math.random() * 10000),
        animation: null,
      }
    },
    mounted() {
      this.loadAnimation();
    },
    methods: {
      loadAnimation() {
        const query = wx.createSelectorQuery().in(this);
        query.select(`#${this.canvasId}`).fields({ node: true, size: true });
        query.exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            console.error('获取 canvas 节点失败');
            return;
          }
  
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
  
          // 设置设备像素比以保证清晰度
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
  
          lottie.setup(canvas);
          this.animation = lottie.loadAnimation({
            container: canvas,
            renderer: 'canvas',
            loop: true,
            autoplay: true,
            path: '../static/cat.json', // 确保路径正确指向您的JSON文件
          });
        });
      }
    }
  }
  </script>
  
  <style scoped>
  .lottie-container {
    width: 100%;
    height: 300px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  </style>