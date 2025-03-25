import { useUserStore } from "../stores/user";

const baseURL = "http://localhost:8084/wechat";


//添加拦截器
const httpInterceptor =  {
    //拦截前触发
    invoke(option){
        //1.非http开头需拼接地址
        if(!option.url.startsWith("http")){
            option.url = baseURL + option.url;
        }
        //2.请求超时，默认60s
        option.timeout =  60000;
        //3.添加小程序端请求头标识
        option.header = {
            ...option.header,
            'source-clinet': 'miniapp'
        }
        //4.添加token请求头标识
        const userStore = useUserStore();
        if(userStore.token){
            option.header.Authorization = userStore.token;
        }
        console.log(option);


    }
}

uni.addInterceptor('request', httpInterceptor)
uni.addInterceptor('uploadFile', httpInterceptor)

//请求函数
export const http = (option) => {
    //1.返回Promise对象
    return new Promise((resolve, reject) => {
        uni.request({
            ...option,
            //2.请求成功
            success: (res) => {
                //状态码2xx,axios就是这样设计的
                if(res.statusCode >= 200 && res.statusCode < 300){
                    //2.1提取核心数据res.data
                    resolve(res.data)    
                }else if(res.statusCode === 401){
                    //401错误 -> 清理用户信息,跳转到登录页
                    const userStore = useUserStore();
                    userStore.clear();
                    uni.navigateTo({
                        url: '/pages/login/login'
                    })
                    reject(res)
                }else{
                    //其他错误,根据后端错误信息轻提示
                    uni.showToast({
                        icon: 'none',
                        title: res.data.msg  || '请求错误'
                    })
                }
                
                
                
            },
            //响应失败
            fail: (err) => {
                uni.showToast({
                    icon: 'none',
                    title: '网络错误,换个网络试试'
                })
                reject(err)
            }
        })
    })
}