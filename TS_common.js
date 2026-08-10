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
        <img src="https://i.postimg.cc/TPBCSXmJ/she-jiaoicon-W.png" class="header-icon"> JIWU．吉物販售
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_CKWBM.html" class="menu-item">
        <img src="https://i.postimg.cc/MHGy2vVz/12-2025xia-ri-1.png"> 吉伊卡哇
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_CKWLD.html" class="menu-item">
        <img src="https://i.postimg.cc/50PqVSdK/ckwp-icon.png"> 吉伊卡哇樂園
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_CKWLD.html" class="menu-item">
        <img src="https://i.postimg.cc/Pr60BNgV/image.png"> 劇場版人魚島
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_NGN.html" class="menu-item">
        <img src="https://i.postimg.cc/hP8v81NH/icon019.png"> Nagano白熊
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/TS_NG.html" class="menu-item">
        <img src="https://i.postimg.cc/VN7WjCdL/icon026.png"> 最新開團
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
