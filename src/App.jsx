import { useState  , useEffect } from 'react'; // useEffect 可以監視 State 改變的樣態
import axios from "axios";
import Swal from 'sweetalert2'; // 錯誤訊息吐司

// App.jsx
import "./assets/style.css";

// ==== API 設定 ====
const API_BASE = import.meta.env.VITE_API_BASE; // (從不上傳的 env 讀取)
const API_PATH = import.meta.env.VITE_API_PATH;

const loginUrl = `${API_BASE}/admin/signin`; // 登入，post
const checkLoginUrl = `${API_BASE}/api/user/check`; // 確認是否登入，post
const getProductsUrl = `${API_BASE}/api/${API_PATH}/products/all`;  // 取得產品列表

// ==== 錯誤訊息吐司參數 ====
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});


// vv ===== 狀態管理 ==== vv
function App() {

  // 1. 表單資訊初始化
  const [formData, setFormData ] = useState({
    username: "", // 此處參數需跟 api 完全相同
    password: ""
  });

  // 2. 是否為登入狀態
  const [isAuth, setIsAuth] = useState(false); // 預設未登入

  // 3. 取得使用者輸入值(處理多個  input 欄位，有name屬性的)
      // # 資料流：使用者輸入 A > 偵測到 INPUT 改變，觸發 onChange 事件 > 呼叫此函數
      // ##      >  e.target 解構並提取輸入值 > 下達更新指令 setFormData
      // ###     > React 運算與重新渲染，走到 return 的 JSX 區域，將更新後的資料繪製到瀏覽器
  const handleInputChange = (e) => {
    const {name, value} = e.target;

    // 更新指令 Update Request
    setFormData((preData) => ({ // 括弧內是尚未更改的值(react 猿聲寫法)
      ...preData,
      [name]:value

    })) // 用函式取值
  };
  
  // 4. 按下送出後，觸發登入 API，同時觸發取得產品 api
      // ## 成功的話，會觸發 setIsAuth 將登入狀態改為 true
  const onSubmit = async (e) => {
    try {
      e.preventDefault(); // 阻止預設是建
      const response = await axios.post(loginUrl, formData)
      // console.log('登入成功')
      // console.log(response.data)

      // 從 response 中解構取得 api 回傳的 token 和到期日
      const { expired, token} = response.data;

      // 設定 Cookie，名稱可自訂 (Application >> Cookie 會多一列 hexToken)
      document.cookie = `hexToken=${token};expires=${new Date(expired)};`;

      // 修改實體建立時所指派的預設配置
      // 登入成功的話，會自動記錄在 axios header 裡面 
      axios.defaults.headers.common['Authorization'] = token;
      
      // 【是否為登入狀態】要設置為 true
      setIsAuth(true)

      // 觸發取得產品 api，才能讓一進入產品列表初始值就帶入 api 返還結果
      getProducts()

      Toast.fire({
              icon: "success",
              title: '登入成功',
              position: 'bottom-end', // 'bottom-right', 'bottom-left', (預設) 'top-end', 'top-left' 
              showConfirmButton: false, // 不需要確認按鈕
              timer: 2000 // 3秒後自動消失
          });


    } catch (error) {
      // 【是否為登入狀態】登入失敗要設置為 false
      setIsAuth(false)

      showErrorMsg(error, "登入失敗")
    }
  };

  // 5. 執行【是否已登入】驗證 ( 搭配轉圈圈)
  const checkLogin = async (e) => {

    // 使用者一點擊後，馬上啟動 setIsCheckLoading (會跳驗證中的轉圈圈)
    setIsCheckLoading(true);

    try {
      const response = await axios.post(checkLoginUrl)

      // 停止轉圈圈
      setIsCheckLoading(false);

      // console.log(response.data)
      if (response.data.success){
        const isConfirmed = await showConfirmWindows(
                '目前登入狀態：已登入',
                '',
                '確認', // 點此才會讓isConfirmed成立
                'success'
            );

            // 使用者確認後才執行api，退出則啥也沒發生
            if (isConfirmed){
                return;
            }
      } 
    } catch (error) {
      showErrorMsg(error, "驗證失敗")
      // 停止轉圈圈
      setIsCheckLoading(false);
    } 
  };

  // 5-1.紀錄【是否已登入】按鈕的讀取中狀態，初始預設為否(沒在驗證中)
  const [isCheckLoading, setIsCheckLoading] = useState(false)

  // 6. 產品資料狀態
  const [products, setProducts] = useState([]); // 產品列表返還是陣列，會去接 getProducts 的產物

  // 7. 使用者選擇的產品詳細資訊
  const [tempProduct, setTempProduct] = useState(); // 一開始預設沒有選到產品

  // 8. 取得產品列表
  const getProducts = async () => {
    try {
      const response = await axios.get(getProductsUrl);

      // 定義新資料以免覆蓋
      const originalProducts = response.data.products

      // 將資料依照類別排序 
      const sortedProduct = sortProduct(originalProducts)
      
      // 丟回去給 setProducts
      setProducts(sortedProduct)

    } catch (error) {
      showErrorMsg(error, "取得產品失敗")
    }
  };

  // 8-1 排序產品資料(依照類別)
  const sortProduct = (products) => {
    const categoryOrder = ['肉類', '蔬菜類', '水果類'];

    // 使用 [...products] 建立一個新陣列再排序，是 React 的好習慣 (避免修改到原始參考)
    const newSortedArray = [...products].sort((a, b) => {
      // 找出兩個物件在排序表中的索引
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);

      // 如果找不到類別 (indexOf 回傳 -1)，把它排到最後面
      // (這行是防止如果有沒定義到的類別，不會跑到最前面)
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      // 比較索引值
      return indexA - indexB; // 簡寫：小減大 (升冪排序)
    })

    return newSortedArray;
  };

  // 9. 清空狀態 (讓彈跳視窗消失)
  const closeModal = () => {
    setTempProduct(null)
  }

  // 97.捕捉錯誤訊息統一邏輯
  const showErrorMsg = (error , titleMsg) => {
      let errorMessage = '發生未預期的錯誤';

      // 檢查是否有伺服器回傳的錯誤響應
      if (error.response) {
      // 伺服器有回傳的話，嘗試取出 error.response.data.message
      errorMessage = error.response.data.message || `API 錯誤 (狀態碼: ${error.response.status})`;
      } else if (error.request) {
      // 請求已發出但沒有收到回應 (例如：網路中斷)
      errorMessage = '網路錯誤或伺服器無回應';
      } else {
      // 發生了在設定請求時觸發的錯誤
      errorMessage = error.message;
      }
    
      Toast.fire({
              icon: "error",
              title: titleMsg,
              text: errorMessage
          });
      throw error;
  }
  
  // 98.確認視窗
  const showConfirmWindows = async (title, text, confirmText = "確認", icon = "info") => {
    // 因為Swal.fire()是非同步，因此必須使用async

    const confirmWindow = await Swal.fire({
        title: title, // 確認視窗標題
        text: text, // 確認視窗文字
        icon: icon,
        showCancelButton: false,
        confirmButtonColor: "green",
        // cancelButtonColor: "gray",
        confirmButtonText: confirmText,
        // cancelButtonText: "取消",

        // // 自定義的屬性
        // customClass: {
        //     // 為確認按鈕附加一個自訂的 CSS 類別
        //     confirmButton: 'custom-confirm-button'
        // }
    });
    return confirmWindow.isConfirmed;
  };

  // 99. 確認狀態是否改變 (登入狀態)
  useEffect(() => {
    console.log(`偵測到 isAuth 變動，最新的值是: ${isAuth}`);
  }, [isAuth]); // 陣列裡放想監聽的變數
    
  

  // ^^ ===== 狀態管理定義結束 ==== ^^

  // vv ==== 建立 html 渲染、綁定元素 ==== vv

  return (
    <>
      {!isAuth ? (
        //  =================================
        //【未登入】 (也就是 (!isAuth) = True )
        //  =================================

        <div className='container login'>
          <div className="login-section">
            <h1 className='text-white mb-5'>🍗 吃飽了嗎 🥗</h1>
            
            <form
              className="form-floating"
              onSubmit={(e) => onSubmit(e)} // 觸發登入事件
            >
              <div className="form-floating  mb-3 ">
                <input 
                  type="email" 
                  value={formData.username} 
                  className="form-control " 
                  name="username" 
                  id="username" 
                  placeholder="name@example.com" 
                  onChange={(e) => handleInputChange(e)}
                  required
                />
                <label htmlFor="username">Email 信箱</label>
              </div>
              <div className="form-floating mb-4">
                <input 
                  type="password" 
                  value={formData.password} 
                  className="form-control" 
                  name="password" 
                  id="password" 
                  placeholder="Password" 
                  onChange={(e) => handleInputChange(e)}
                  required
                />
                <label htmlFor="password">密碼</label>
              </div>
              <h2 className='fs-6 text-light mb-3'>飯前請先登入</h2>
              <button 
                type='submit' 
                className='btn btn-warning mt-2 px-4 fw-bold'
              >登入</button>
            </form>
          </div>
        </div>) : ( /* 已登入的左括號 */

        //  =================================
        // 【已登入】 (也就是 (!isAuth) = False )
        //  =================================

        <div className="container"> 

          {/* =================================
          產品列表區
          ================================= */}
          
          <div className='d-flex justify-content-end align-items-center mt-5 '>
            {/* 驗證結果回傳前出現轉圈圈 spinner */}
            {isCheckLoading && (
              <div className="d-flex align-items-center me-3 text-white">
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">
                    Loading...
                  </span>
                </div>
                <span className='fs-6'>驗證中，請稍後...</span>
              </div>
            )}           
            {/* 確認是否登入按鈕 */}
                <button
                  className="btn btn-success px-2 px-md-4 mb-2 sub-title-text"
                  type="button"
                  onClick={checkLogin}
                >確認是否登入</button>
          </div>

          {/* 產品列表表格區 */}
          <div className="row">
            <div className="col-12">
              <h2 className="mb-3 double-text fw-bold text-dark title-text">產品列表</h2>
              <table className="table table-striped table-hover  ">
                <thead className='table-success'>
                  <tr className='table-text'>
                    <th scope="col" className='align-middle'>商品名稱</th>
                    <th scope="col" className='align-middle'>類別</th>
                    <th scope="col" className='align-middle'>原價</th>
                    <th scope="col" className='align-middle'>售價</th>
                    <th scope="col" className='align-middlealign-middle'>是否啟用</th>
                    <th scope="col" className=''>查看細節</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className='table-text'>
                      <td className='align-middle fw-bold'>{product.title}</td>
                      <td className='align-middle' fs-sm-6>{product.category}</td>
                      <td className='align-middle' fs-sm-6>{product.origin_price} 元</td>
                      <td className='align-middle'>{product.price} 元 / {product.unit}</td>
                      <td className='align-middle'>{product.is_enabled ? "已啟用" : "未啟用"}</td>
                      <td  className='align-middle'>
                      {/* 查看詳細資訊按鈕 */}
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            setTempProduct(product)
                          } /** 在這個產品點擊按鈕後會選擇此產品*/
                        >
                          <span className='mobile-disable'>查看細節</span>
                          <span >🔍</span>
                          
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* =================================
          /* 彈跳視窗區塊 (利用條件渲染) */
          /* 只有當 tempProduct 有值的時候，才顯示這個區塊 */
          /* ================================= */}

          {tempProduct && (
            // 灰色遮罩區，點擊等同於關閉彈跳視窗
            <div 
              className="modal-backdrop"
              onClick = {closeModal}
            >
              {/* 彈跳視窗區塊 */}
              <div 
                className="modal-content p-3 p-lg-5 "
                onClick = {(e) => e.stopPropagation()} 
              >
                {/* 建立停止傳播，阻止事件向富元素傳遞(冒泡) */}
                <h2 className='fw-bold text-dark double-text mb-3 title-text'>商品詳細資訊</h2>
                {tempProduct ? (
                  /** 有選到有 key id 的產品*/
                  <div className="card mb-3 ">
                    {/* 上半部區塊 */}
                    <div className="d-flex justify-content-start align-itmes-top  p-2 p-md-4 gap-3">
                      {/* 商品主圖 */}
                      <div className="half-item ">
                        <img
                          src={tempProduct.imageUrl}
                          className="card-img-top " 
                          alt={`${tempProduct.title}的主圖`}
                        />
                      </div>
                      {/* 商品名稱、類別 */}
                      <div className="d-flex  flex-column justify-content-start half-item">
                        <h5 className="card-title  fw-bold sub-title-text  ">
                          {tempProduct.title}
                          <span className="badge bg-primary ms-3  content-text">
                            {tempProduct.category}
                          </span>
                        </h5>
                        {/* 售價 */}
                        <div className="d-flex">
                          <p className="card-text  content-text">
                            <span className="content-text">售價：</span>
                            <del className='text-secondary content-text'>{tempProduct.origin_price} 元 </del>
                            <span className="content-text"> ↘️ 現在只要</span>
                            <span className=" text-primary fw-bold content-text">
                              {"  "}
                              {tempProduct.price} 元 / {tempProduct.unit}{" "}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-body " >
                      {/* 中間-商品細節區塊 */}
                      <p className="card-text  content-text">📌 商品描述</p>
                      <p  className="card-text  card-describe content-text">{tempProduct.description}</p>
                      <p className="card-text  content-text">🍳 商品內容</p>
                      <p  className="card-text   card-describe content-text">{tempProduct.content}</p>
                      
                      { /** 更多圖片區域 */}
                      <h5 className="mt-4 mb-4 fw-bold sub-title-text">更多圖片➕</h5>
                      <div className="d-flex flex-wrap gap-3 gap-md-4 justify-content-center">
                        {tempProduct.imagesUrl
                        // 當 url 不為空字串的時候才可以進到下一關
                        .filter((url) => url)
                        // 只將圖片 URL 不為空的陣列拿去跑 MAP
                        .map((url, index) => (
                          <img
                            key={index}
                            className='images'
                            src={url}
                          />
                        ))}
                      </div> 

                      <button 
                        type='button'
                        className="btn btn-secondary mt-5  py-2 px-5 align-self-center "
                        onClick={closeModal}
                      >
                        關閉
                      </button>
                    </div>
                  </div>
                  
              ) : (
              /** 沒選到任何產品*/
              <p className="text-secondary">請選擇一個商品查看</p>
              )}   {/* 有沒有選到產品的右括號 */}
              </div>  {/** modal-content 的閉合 */}
            </div>  /** modal-backdrop 的閉合 */
          )}
        </div>  /* 已登入 container 的閉合 */
        )  /* 已登入的右括號 */
        
      } {/* 已登入的右花括號 */}
    </>
  ); //return 的右括號
}

export default App
