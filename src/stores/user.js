import { defineStore } from "pinia"
import { ref } from "vue";

export const useUserStore = defineStore('user', () => {
    
  const username = ref('');
  const phone = ref('');
  const token = ref('');
  

  const setUsername = (newUsername) => {
    username.value = newUsername;
  }

  const setPhone = (newPhone) => {
    phone.value = newPhone;
  }

  const setToken = (newToken) => {
    token.value = newToken;
  }


 const clear = () => {
    username.value = '';
    phone.value = '';
    token.value = '';
 }


    return {username, phone, token, setUsername, setPhone, setToken}
  },
  {
    //小程序端配置
    persist:{
        storage:{
            getItem(key){
                return uni.getStorageSync(key)
            },
            setItem(key, value){
                return uni.setStorageSync(key, value)
            }
        }
    }
  })