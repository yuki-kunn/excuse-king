<script lang="ts">
  // SvelteKitの機能を使って、現在のページのURL情報を取得します
  import { page } from '$app/stores';
</script>

<nav class="bottom-nav">
  <a href="/themes" class:active={$page.url.pathname.includes('/themes')}>お題</a>
  <a href="/ranking" class:active={$page.url.pathname === '/ranking'}>ランキング</a>
  <a href="/mypage" class:active={$page.url.pathname.includes('/mypage')}>マイページ</a>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    /* 画面中央に配置し、最大幅をアプリ本体に合わせる */
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px; 
    
    display: flex;
    justify-content: space-around;
    background-color: #ffffff;
    padding: 12px 0;
    /* 上部に太い線を引く */
    border-top: 4px solid #222;
    z-index: 100;
  }
  
  a {
    text-decoration: none;
    color: #222;
    font-weight: 900; /* 文字を太く */
    font-size: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 16px;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  /* 選択中のタブ（B級ゲームっぽいビビッドな黄色） */
  .active {
    background-color: #ffcc00;
    border: 3px solid #222;
    /* 少し上に浮いているような影 */
    box-shadow: 3px 3px 0px #222; 
    transform: translateY(-4px);
  }
</style>