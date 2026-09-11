// 控制選單開關
function toggleMenu(isOpen) {
  const menu = document.getElementById('side-menu');
  const overlay = document.getElementById('menu-overlay');
  if (!menu || !overlay) return;

  if (isOpen) {
    menu.classList.add('open');
    overlay.style.display = 'block'; // 修正：這裡要用 block 而不是 black
  } else {
    menu.classList.remove('open');
    overlay.style.display = 'none';
  }
}

// 產生共用選單
function initCommonMenu() {
  const menuHtml = `
    <div id="menu-overlay" onclick="toggleMenu(false)"></div>
    <div id="side-menu">
      <a href="https://jiwusales.github.io/jiwu_menu/index.html" class="menu-header">
        <img src="https://raw.githubusercontent.com/jiwusales/imgh/main/images_1350/she-jiaoicon-W_3aa0fd03.png" class="header-icon"> JIWU．吉物販售
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_CKWBM.html" class="menu-item">
        <img src="https://raw.githubusercontent.com/jiwusales/imgh/main/images_1350/12-2025xia-ri-1_9ee5e5c6.png"> 吉伊卡哇
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_CKWLD.html" class="menu-item">
        <img src="https://raw.githubusercontent.com/jiwusales/imgh/main/images_1350/ckwp-icon_3c0d01bb.png"> 吉伊卡哇樂園
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_CKWLD.html" class="menu-item">
        <img src="https://raw.githubusercontent.com/jiwusales/imgh/main/images_1350/image_5ac485f6.png"> 劇場版人魚島
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_NGN.html" class="menu-item">
        <img src="https://raw.githubusercontent.com/jiwusales/imgh/main/images_1350/icon019_c9abf023.png"> Nagano白熊
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_NG.html" class="menu-item">
        <img src="https://raw.githubusercontent.com/jiwusales/imgh/main/images_1350/icon026_d47caf43.png"> 最新開團
      </a>
    </div>
  `;
  // 插入到頁面中
  document.body.insertAdjacentHTML('afterbegin', menuHtml);
}

// 處理官網下單傳送給 GAS
async function handleFinalCheckout() {
  const lineName = document.getElementById('user-line').value.trim();
  const igAcc = document.getElementById('user-ig').value.trim();
  
  if (!lineName) {
    alert("請輸入LINE名稱方便核對 ( )");
    return;
  }

  const btn = document.getElementById('send-btn');
  btn.disabled = true; 
  btn.textContent = "傳送中 ᓫ(๑º꒳º๑)ꜝꜝ";

  try {
    const cartData = cart.map(item => ({
      kind: item.kind,      
      role: item.kind,           // 補上：供 GAS 寫入「團名」
      type: item.type,      
      style: item.style,    
      name: item.name,      
      price: item.price,    
      sn: item.sn,          
      stock: item.currentStatus, // 補上：供 GAS 寫入「貨況」
      status: item.currentStatus,
      note: item.groupName
    }));

    const postData = { 
      source: "電腦版下單",      // 與 GAS doGet/doPost 判斷相符
      lineName: lineName,   
      igAccount: igAcc,     
      cartItems: cartData 
    };

    await fetch(CONFIG.DEPLOY_URL, { 
      method: 'POST', 
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(postData) 
    });
  } catch (e) {
    console.error("GAS 傳送失敗", e);
  }

  const msg = generateLineMessage(lineName, igAcc);
  window.location.href = CONFIG.LINE_MSG_URL + msg;

  cart = []; 
  saveCart(); 
  updateCartUI();
  
  document.getElementById('step-1').style.display = "none";
  document.getElementById('step-2').style.display = "block";
}

// 頁面載入完成後執行
document.addEventListener('DOMContentLoaded', initCommonMenu);
