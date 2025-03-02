import { http } from "../utils/http"

/**
 * 获取商品列表数据
 * @param {*} params 
 * @returns 
 */
export const getProductListAPI = () => {
    return http({
        method: "GET",
        url: "/products",
        header:{} 
    })
}

/**
 * 获取商品列表数据
 * @param {*} data 
 * @returns 
 */
export const getProductLisByIdstAPI = ({Ids}) => {
    return http({
        method: "POST",
        url: "/products/SelectProductsByIds",
        data:{Ids}
    })
}