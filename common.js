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
      <a href="https://jiwusales.github.io/jiwu_menu/CHWBM.html" class="menu-item">
        <img src="https://i.postimg.cc/MHGy2vVz/12-2025xia-ri-1.png"> 吉伊卡哇
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/CParkBM.html" class="menu-item">
        <img src="https://i.postimg.cc/50PqVSdK/ckwp-icon.png"> 吉伊卡哇樂園
      </a>
      <a href="https://jiwusales.github.io/jiwu_menu/NGNBM.html" class="menu-item">
        <img src="https://i.postimg.cc/hP8v81NH/icon019.png"> Nagano白熊
      </a>
    </div>
  `;
  // 插入到頁面中
  document.body.insertAdjacentHTML('afterbegin', menuHtml);
}

// 頁面載入完成後執行
document.addEventListener('DOMContentLoaded', initCommonMenu);
